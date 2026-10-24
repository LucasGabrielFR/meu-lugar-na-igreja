'use server';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import type { FormState } from '@/lib/types';
import { hashPassword, verifyPassword, tokenHash } from '../../scripts/security.mjs';
const dummyPasswordHash = hashPassword('unavailable-account');

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({email: z.string().email().max(200), password: z.string().min(1).max(256)}).safeParse(Object.fromEntries(form));
  if (!parsed.success) return {error: 'Informe e-mail e senha válidos.'};
  const email = parsed.data.email.trim().toLowerCase();
  // A global bucket also bounds attempts made with many different email addresses.
  const client = await db.connect();
  let limited = false;
  try {
    await client.query('BEGIN');
    for (const key of ['__global__', email]) {
      const result = await client.query(`INSERT INTO login_limits(email,attempts) VALUES($1,1)
        ON CONFLICT(email) DO UPDATE SET
        attempts=CASE WHEN login_limits.window_start<now()-interval '15 minutes' THEN 1 ELSE login_limits.attempts+1 END,
        window_start=CASE WHEN login_limits.window_start<now()-interval '15 minutes' THEN now() ELSE login_limits.window_start END
        RETURNING attempts`, [key]);
      if (result.rows[0].attempts > (key === '__global__' ? 100 : 10)) limited = true;
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  if (limited) return {error: 'Muitas tentativas. Aguarde 15 minutos.'};
  const admin = (await db.query('SELECT * FROM admins WHERE email=$1', [email])).rows[0];
  const valid = verifyPassword(parsed.data.password, admin?.password_hash ?? dummyPasswordHash);
  if (!admin || !valid) return {error: 'E-mail ou senha incorretos.'};
  const token = randomBytes(32).toString('base64url');
  await db.query('INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES($1,$2,now()+interval \'8 hours\')', [tokenHash(token), admin.id]);
  (await cookies()).set('paroquia_session', token, {httpOnly: true, secure: process.env.COOKIE_SECURE !== 'false', sameSite: 'lax', path: '/', maxAge: 8 * 3600});
  redirect('/admin');
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get('paroquia_session')?.value;
  if (token) await db.query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash(token)]);
  jar.delete('paroquia_session');
  redirect('/entrar');
}

export async function submitParticipation(_: FormState, form: FormData): Promise<FormState> {
  // Honeypot is invisible to normal users and silently drops basic automated spam.
  if (String(form.get('website') ?? '').trim()) return {success:'Solicitação recebida. Ela ficará em análise antes de aparecer no mapa.'};
  const parsed = z.object({
    city_code: z.coerce.number().int().positive(),
    parish_name: z.string().trim().min(2).max(140),
    display_name: z.string().trim().min(2).max(140),
    username: z.string().trim().transform(x=>x.replace(/^@/,'').toLowerCase()).pipe(z.string().regex(/^[a-z0-9._]{1,30}$/)),
    consent: z.literal('on'),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return {error:'Confira cidade, paróquia, nome público, perfil do Instagram e autorização de publicação.'};
  const {city_code, parish_name, display_name, username} = parsed.data;
  try {
    const result=await db.query(`INSERT INTO participation_requests(city_code,parish_id,parish_name,display_name,username)
      SELECT $1,p.id,$2,$3,$4 FROM municipalities m
      LEFT JOIN cities c ON c.code=m.code AND c.active
      LEFT JOIN parishes p ON p.city_code=m.code AND lower(p.name)=lower($2) AND p.active
      WHERE m.code=$1 AND (p.id IS NOT NULL OR c.code IS NULL OR c.active)
      RETURNING id`,[city_code,parish_name,display_name,username]);
    if (!result.rowCount) return {error:'Não encontramos esse município. Selecione uma opção da lista.'};
  } catch (error) {
    const code=(error as {code?:string}).code;
    if (code==='23505') return {error:'Já existe uma solicitação pendente para esse perfil. Aguarde a revisão.'};
    console.error('Participation request failed',code??'unknown');
    return {error:'Não foi possível enviar agora. Tente novamente em alguns instantes.'};
  }
  revalidatePath('/admin');
  return {success:'Solicitação recebida. Ela ficará em análise antes de aparecer no mapa.'};
}

export async function approveParticipation(_:FormState,form: FormData):Promise<FormState> {
  const admin=await requireAdmin();
  const parsed=idSchema.safeParse(form.get('id'));
  if(!parsed.success)return {error:'Solicitação inválida.'};
  const requestId=parsed.data;
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(78123003)');
    const request=(await client.query(`SELECT r.*,m.name,m.uf FROM participation_requests r
      JOIN municipalities m ON m.code=r.city_code WHERE r.id=$1 AND r.status='pending' FOR UPDATE`,[requestId])).rows[0];
    if (!request) throw new Error('Solicitação não encontrada ou já revisada.');
    const cityCode:number=request.city_code;
    await client.query('INSERT INTO cities(code) VALUES($1) ON CONFLICT(code) DO UPDATE SET active=true',[cityCode]);
    let parishId=request.parish_id;
    if (!parishId) {
      const existing=(await client.query('SELECT id FROM parishes WHERE city_code=$1 AND lower(name)=lower($2)',[cityCode,request.parish_name])).rows[0];
      if (existing) {parishId=existing.id;await client.query('UPDATE parishes SET active=true WHERE id=$1',[parishId]);}
      else parishId=(await client.query(`INSERT INTO parishes(city_code,name,slot)
        SELECT $1,$2,COALESCE(MAX(slot)+1,0) FROM parishes WHERE city_code=$1 RETURNING id`,[cityCode,request.parish_name])).rows[0].id;
    }
    await client.query('UPDATE parishes SET active=true WHERE id=$1',[parishId]);
    await client.query(`UPDATE parishes SET catalog_id=(SELECT min(id) FROM parish_catalog WHERE active AND municipality_code=$1 AND lower(name)=lower($2) HAVING count(*)=1)
      WHERE id=$3 AND catalog_id IS NULL`,[cityCode,request.parish_name,parishId]);
    const house=(await client.query(`INSERT INTO houses(city_code,parish_id,username,display_name,slot)
      SELECT $1,$2,$3,$4,COALESCE(MAX(slot)+1,0) FROM houses WHERE parish_id=$2 RETURNING id`,[cityCode,parishId,request.username,request.display_name])).rows[0];
    await client.query(`UPDATE participation_requests SET status='approved',admin_id=$1,reviewed_at=now(),house_id=$2 WHERE id=$3`,[admin.id,house.id,requestId]);
    await client.query('INSERT INTO audit_log(admin_id,action,entity,entity_id) VALUES($1,$2,$3,$4)',[admin.id,'approve','participation_request',String(requestId)]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    const code=(error as {code?:string}).code;
    if (code==='23505') return {error:'Esse perfil já possui uma casa no mapa. Revise a casa existente antes de aprovar.'};
    if (error instanceof Error && error.message.includes('não encontrada')) return {error:error.message};
    console.error('Participation approval failed',code??'unknown');
    return {error:'Não foi possível aprovar. Atualize e tente novamente.'};
  } finally { client.release(); }
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  return {success:'Solicitação aprovada e casa publicada no mapa.'};
}

export async function rejectParticipation(_:FormState,form: FormData):Promise<FormState> {
  const admin=await requireAdmin();
  const parsed=idSchema.safeParse(form.get('id'));
  if(!parsed.success)return {error:'Solicitação inválida.'};
  const requestId=parsed.data;
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    const result=await client.query(`UPDATE participation_requests SET status='rejected',admin_id=$1,reviewed_at=now()
      WHERE id=$2 AND status='pending' RETURNING id`,[admin.id,requestId]);
    if(result.rowCount)await client.query('INSERT INTO audit_log(admin_id,action,entity,entity_id) VALUES($1,$2,$3,$4)',[admin.id,'reject','participation_request',String(requestId)]);
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK');
    console.error('Participation rejection failed',(error as {code?:string}).code??'unknown');
    return {error:'Não foi possível arquivar a solicitação. Tente novamente.'};
  } finally { client.release(); }
  revalidatePath('/admin');
  return {success:'Solicitação arquivada.'};
}

const idSchema = z.coerce.number().int().positive();
const textSchema = z.string().trim().min(2).max(140);
export async function saveMap(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const type = z.enum(['city','parish','house']).safeParse(form.get('type'));
  if (!type.success) return {error:'Operação inválida.'};
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // ponytail: serialize low-volume administrative writes; use per-city locks if write throughput grows.
    await client.query('SELECT pg_advisory_xact_lock(78123003)');
    const id = form.get('id') ? idSchema.parse(form.get('id')) : null;
    const active = form.get('active') === 'on';
    let entityId: number;
    if (type.data === 'city') {
      const code = idSchema.parse(form.get('code'));
      const description = z.string().trim().max(600).parse(form.get('description') ?? '');
      const result = await client.query(`INSERT INTO cities(code,description,active) VALUES($1,$2,$3)
        ON CONFLICT(code) DO UPDATE SET description=EXCLUDED.description,active=EXCLUDED.active RETURNING code`, [code,description,active]);
      entityId = result.rows[0].code;
    } else if (type.data === 'parish') {
      const code = idSchema.parse(form.get('city_code'));
      const name = textSchema.parse(form.get('name'));
      const description = z.string().trim().max(600).parse(form.get('description') ?? '');
      if (id) {
        const result = await client.query('UPDATE parishes SET name=$1,description=$2,active=$3 WHERE id=$4 AND city_code=$5 RETURNING id', [name,description,active,id,code]);
        if (!result.rowCount) throw new Error('Paróquia não encontrada.');
        entityId = id;
      } else {
        const result = await client.query(`INSERT INTO parishes(city_code,name,description,active,slot)
          SELECT $1,$2,$3,$4,COALESCE(MAX(slot)+1,0) FROM parishes WHERE city_code=$1 RETURNING id`, [code,name,description,active]);
        entityId = result.rows[0].id;
      }
    } else {
      const parishId = idSchema.parse(form.get('parish_id'));
      const parish = (await client.query('SELECT city_code FROM parishes WHERE id=$1', [parishId])).rows[0];
      if (!parish) throw new Error('Paróquia não encontrada.');
      const username = z.string().trim().transform(x=>x.replace(/^@/,'').toLowerCase()).pipe(z.string().regex(/^[a-z0-9._]{1,30}$/)).parse(form.get('username'));
      const displayName = textSchema.parse(form.get('display_name'));
      const color = z.string().regex(/^#[0-9a-fA-F]{6}$/).parse(form.get('color'));
      if (id) {
        const result = await client.query(`UPDATE houses SET city_code=$1,parish_id=$2,username=$3,display_name=$4,color=$5,active=$6,
          slot=CASE WHEN parish_id=$2 THEN slot ELSE (SELECT COALESCE(MAX(slot)+1,0) FROM houses WHERE parish_id=$2) END
          WHERE id=$7 RETURNING id`, [parish.city_code,parishId,username,displayName,color,active,id]);
        if (!result.rowCount) throw new Error('Casa não encontrada.');
        entityId = id;
      } else {
        const result = await client.query(`INSERT INTO houses(city_code,parish_id,username,display_name,color,active,slot)
          SELECT $1,$2,$3,$4,$5,$6,COALESCE(MAX(slot)+1,0) FROM houses WHERE parish_id=$2 RETURNING id`, [parish.city_code,parishId,username,displayName,color,active]);
        entityId = result.rows[0].id;
      }
    }
    await client.query('INSERT INTO audit_log(admin_id,action,entity,entity_id) VALUES($1,$2,$3,$4)', [admin.id,'save',type.data,String(entityId)]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof z.ZodError) return {error:'Confira os campos: nomes até 140 caracteres, descrição até 600, perfil válido e cor hexadecimal.'};
    const code = (error as {code?: string}).code;
    if (code === '23505') return {error:'Já existe um cadastro com esse nome ou perfil. Edite o registro existente.'};
    if (code === '23503') return {error:'Escolha um município ou uma paróquia cadastrados.'};
    console.error('Map save failed', code ?? 'unknown');
    return {error:'Não foi possível salvar. Atualize a página e confira o cadastro.'};
  } finally { client.release(); }
  revalidatePath('/', 'layout');
  return {success:'Cadastro salvo. O mapa já foi atualizado.'};
}
