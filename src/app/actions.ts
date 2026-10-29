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
import { upsertHouseFromInstagramComment } from '../../scripts/instagram-comment-processor.mjs';
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
    if (type.data === 'parish') {
      try {
        const { invalidateDuplicateCache } = await import('@/lib/admin-curation');
        invalidateDuplicateCache();
      } catch {}
    }
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

export async function saveAppConfig(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z.object({
    key: z.enum(['privacy_policy', 'terms_of_service']),
    title: z.string().trim().min(2).max(150),
    value: z.string().trim().min(10).max(50000),
  }).safeParse(Object.fromEntries(form));

  if (!parsed.success) {
    return { error: 'Preencha o título e o conteúdo do documento.' };
  }

  const { key, title, value } = parsed.data;

  try {
    await db.query(
      `INSERT INTO app_configs(key, title, value, updated_at)
       VALUES($1, $2, $3, now())
       ON CONFLICT(key) DO UPDATE SET title = EXCLUDED.title, value = EXCLUDED.value, updated_at = now()`,
      [key, title, value]
    );
    await db.query(
      'INSERT INTO audit_log(admin_id, action, entity, entity_id) VALUES($1, $2, $3, $4)',
      [admin.id, 'save', 'app_config', key]
    );
  } catch (error) {
    console.error('App config save failed', error);
    return { error: 'Não foi possível salvar o documento.' };
  }

  revalidatePath('/admin');
  revalidatePath('/privacidade');
  revalidatePath('/termos');
  revalidatePath('/');
  return { success: 'Documento salvo com sucesso. As páginas públicas já foram atualizadas.' };
}

export async function createHouseOnMap(input: {
  username: string;
  display_name?: string;
  city_code: number;
  parish_id: number;
  website?: string;
}): Promise<{
  error?: string;
  success?: string;
  houseId?: number;
  cityCode?: number;
  parishId?: number;
  username?: string;
}> {
  if (String(input?.website ?? '').trim()) {
    return { error: 'Não foi possível criar a casa agora.' };
  }
  const parsed = z.object({
    username: z.string().trim().transform(x => x.replace(/^@/, '').toLowerCase()).pipe(z.string().regex(/^[a-z0-9._]{1,30}$/)),
    display_name: z.string().trim().max(140).optional(),
    city_code: z.coerce.number().int().positive(),
    parish_id: z.coerce.number().int().positive(),
  }).safeParse(input);

  if (!parsed.success) {
    return { error: 'Informe um @ do Instagram válido (sem espaços), uma cidade e uma paróquia válida da lista.' };
  }

  const { username, display_name, city_code, parish_id } = parsed.data;
  const client = await db.connect();
  try {
    const parishCheck = (await client.query<{ id: number; name: string; city_code: number; city_name: string; uf: string }>(
      `SELECT p.id, p.name, p.city_code, m.name AS city_name, m.uf
       FROM parishes p
       JOIN municipalities m ON m.code = p.city_code
       WHERE p.id = $1 AND p.city_code = $2 AND p.active`,
      [parish_id, city_code]
    )).rows[0];

    if (!parishCheck) {
      return { error: 'Escolha uma paróquia ativa válida pertencente ao município selecionado.' };
    }

    const cleanDisplayName = display_name && display_name.length >= 2 ? display_name : `@${username}`;
    const res = await upsertHouseFromInstagramComment(client, {
      cityCode: city_code,
      parishId: parish_id,
      authorId: null,
      username,
      displayName: cleanDisplayName,
      commentId: null,
      mediaId: null,
    });

    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    return {
      success: res.outcome === 'house_updated'
        ? `Sua casa (@${username}) foi atualizada para a ${parishCheck.name} (${parishCheck.city_name}/${parishCheck.uf})!`
        : `Sua casa (@${username}) foi construída na ${parishCheck.name} (${parishCheck.city_name}/${parishCheck.uf})!`,
      houseId: res.houseId,
      cityCode: city_code,
      parishId: parish_id,
      username,
    };
  } catch (error) {
    console.error('Create house on map failed', error instanceof Error ? error.message : 'unknown');
    return { error: 'Não foi possível construir a casa agora. Tente novamente em instantes.' };
  } finally {
    client.release();
  }
}



export async function deleteParish(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.parse(form.get('id'));
  const migrateToId = form.get('migrate_to_id') ? idSchema.parse(form.get('migrate_to_id')) : null;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(78123003)');

    const parishRes = await client.query('SELECT id, city_code, name FROM parishes WHERE id=$1', [id]);
    if (!parishRes.rowCount) throw new Error('Paróquia não encontrada.');
    const parish = parishRes.rows[0];

    const houseCountRes = await client.query('SELECT count(*)::int AS count FROM houses WHERE parish_id=$1', [id]);
    const houseCount = houseCountRes.rows[0]?.count ?? 0;

    if (houseCount > 0) {
      if (!migrateToId) {
        throw new Error(`Esta paróquia possui ${houseCount} morador(es). Selecione uma paróquia de destino para transferi-los.`);
      }
      if (migrateToId === id) {
        throw new Error('A paróquia de destino não pode ser a mesma que será excluída.');
      }
      const targetRes = await client.query('SELECT id FROM parishes WHERE id=$1 AND city_code=$2 AND active', [migrateToId, parish.city_code]);
      if (!targetRes.rowCount) {
        throw new Error('A paróquia de destino selecionada não pertence ao mesmo município ou está arquivada.');
      }

      // Reassign houses
      await client.query(`
        UPDATE houses
        SET parish_id = $1,
            slot = (SELECT COALESCE(MAX(slot)+1, 0) FROM houses WHERE parish_id = $1)
        WHERE parish_id = $2
      `, [migrateToId, id]);
    }

    // Reassign participation requests and comment events if any
    if (migrateToId) {
      await client.query('UPDATE participation_requests SET parish_id=$1 WHERE parish_id=$2', [migrateToId, id]);
      await client.query('UPDATE instagram_comment_events SET parish_id=$1 WHERE parish_id=$2', [migrateToId, id]);
    } else {
      await client.query('UPDATE participation_requests SET parish_id=NULL WHERE parish_id=$1', [id]);
      await client.query('UPDATE instagram_comment_events SET parish_id=NULL WHERE parish_id=$1', [id]);
    }

    // Delete ignores if any
    await client.query('DELETE FROM parish_duplicate_ignores WHERE parish_id_1=$1 OR parish_id_2=$1', [id]);

    // Delete parish
    await client.query('DELETE FROM parishes WHERE id=$1', [id]);

    await client.query('INSERT INTO audit_log(admin_id, action, entity, entity_id) VALUES($1, $2, $3, $4)', [
      admin.id,
      houseCount > 0 ? `delete_and_migrate_to_${migrateToId}` : 'delete',
      'parish',
      String(id),
    ]);

    await client.query('COMMIT');
    const { invalidateDuplicateCache } = await import('@/lib/admin-curation');
    invalidateDuplicateCache();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('deleteParish error', error);
    return { error: error instanceof Error ? error.message : 'Falha ao excluir a paróquia.' };
  } finally {
    client.release();
  }

  revalidatePath('/admin');
  revalidatePath('/', 'layout');
  return { success: 'Paróquia excluída com sucesso.' };
}

async function executeMergeDuplicate(keepId: number, removeId: number, adminId: string | number): Promise<void> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(78123003)');

    const p1 = (await client.query('SELECT id, city_code, name FROM parishes WHERE id=$1', [keepId])).rows[0];
    const p2 = (await client.query('SELECT id, city_code, name FROM parishes WHERE id=$1', [removeId])).rows[0];

    if (!p1 || !p2) throw new Error('Uma das paróquias selecionadas não foi encontrada.');
    if (p1.city_code !== p2.city_code) throw new Error('As paróquias devem pertencer ao mesmo município.');

    // Migrate houses from p2 to p1 with unique slots
    await client.query(`
      WITH next_slots AS (
        SELECT id,
               (SELECT COALESCE(MAX(slot), -1) FROM houses WHERE parish_id = $1) + ROW_NUMBER() OVER (ORDER BY id) AS new_slot
        FROM houses
        WHERE parish_id = $2
      )
      UPDATE houses h
      SET parish_id = $1,
          slot = ns.new_slot
      FROM next_slots ns
      WHERE h.id = ns.id
    `, [keepId, removeId]);

    // Migrate requests and comment events
    await client.query('UPDATE participation_requests SET parish_id=$1 WHERE parish_id=$2', [keepId, removeId]);
    await client.query('UPDATE instagram_comment_events SET parish_id=$1 WHERE parish_id=$2', [keepId, removeId]);

    // Clean ignores
    await client.query('DELETE FROM parish_duplicate_ignores WHERE parish_id_1=$1 OR parish_id_2=$1', [removeId]);

    // Delete merged parish
    await client.query('DELETE FROM parishes WHERE id=$1', [removeId]);

    await client.query('INSERT INTO audit_log(admin_id, action, entity, entity_id) VALUES($1, $2, $3, $4)', [
      adminId,
      `merge_into_${keepId}`,
      'parish',
      String(removeId),
    ]);

    await client.query('COMMIT');
    const { invalidateDuplicateCache } = await import('@/lib/admin-curation');
    invalidateDuplicateCache();
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function resolveDuplicatePair(keepId: number, removeId: number): Promise<{ success?: string; error?: string }> {
  try {
    const admin = await requireAdmin();
    if (keepId === removeId) {
      return { error: 'A paróquia a ser mantida e a ser removida não podem ser a mesma.' };
    }
    await executeMergeDuplicate(keepId, removeId, admin.id);
    revalidatePath('/admin');
    revalidatePath('/', 'layout');
    return { success: 'Paróquia mantida e duplicata apagada com sucesso!' };
  } catch (error) {
    console.error('resolveDuplicatePair error', error);
    return { error: error instanceof Error ? error.message : 'Falha ao unificar paróquias.' };
  }
}

export async function ignoreDuplicatePairDirect(id1: number, id2: number): Promise<{ success?: string; error?: string }> {
  try {
    await requireAdmin();
    const p1 = Math.min(id1, id2);
    const p2 = Math.max(id1, id2);

    await db.query(`
      INSERT INTO parish_duplicate_ignores(parish_id_1, parish_id_2)
      VALUES($1, $2)
      ON CONFLICT (parish_id_1, parish_id_2) DO NOTHING
    `, [p1, p2]);

    const { invalidateDuplicateCache } = await import('@/lib/admin-curation');
    invalidateDuplicateCache();

    revalidatePath('/admin');
    return { success: 'Par marcado como distinto.' };
  } catch (error) {
    console.error('ignoreDuplicatePairDirect error', error);
    return { error: error instanceof Error ? error.message : 'Falha ao ignorar par.' };
  }
}

export async function mergeDuplicateParishes(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const keepId = idSchema.parse(form.get('keep_id'));
  const removeId = idSchema.parse(form.get('remove_id'));

  if (keepId === removeId) {
    return { error: 'A paróquia a ser mantida e a ser removida não podem ser a mesma.' };
  }

  try {
    await executeMergeDuplicate(keepId, removeId, admin.id);
  } catch (error) {
    console.error('mergeDuplicateParishes error', error);
    return { error: error instanceof Error ? error.message : 'Falha ao mesclar as paróquias.' };
  }

  revalidatePath('/admin');
  revalidatePath('/', 'layout');
  return { success: 'Paróquias unificadas com sucesso! As casas foram transferidas e o registro duplicado foi removido.' };
}

export async function ignoreDuplicateParishPair(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id1 = idSchema.parse(form.get('id1'));
  const id2 = idSchema.parse(form.get('id2'));
  const p1 = Math.min(id1, id2);
  const p2 = Math.max(id1, id2);

  await db.query(`
    INSERT INTO parish_duplicate_ignores(parish_id_1, parish_id_2)
    VALUES($1, $2)
    ON CONFLICT (parish_id_1, parish_id_2) DO NOTHING
  `, [p1, p2]);

  const { invalidateDuplicateCache } = await import('@/lib/admin-curation');
  invalidateDuplicateCache();

  revalidatePath('/admin');
  return { success: 'Par marcado como distinto. O alerta para este par não será mais exibido.' };
}

// ==========================================
// AÇÕES DE GAMIFICAÇÃO E GOVERNANÇA
// ==========================================

export async function performCheckinAction(username: string): Promise<{ success: boolean; message: string; xpGained: number; streak: number }> {
  const { processDailyCheckin } = await import('@/lib/gamification');
  const res = await processDailyCheckin(username);
  if (res.success) {
    revalidatePath('/', 'layout');
  }
  return res;
}

export async function submitPrayerAction(_: FormState, form: FormData): Promise<FormState> {
  const { submitPrayer } = await import('@/lib/gamification');
  const cityCode = Number(form.get('city_code'));
  const parishId = Number(form.get('parish_id'));
  const username = String(form.get('username') ?? '').trim();
  const displayName = String(form.get('display_name') ?? '').trim() || username;
  const intention = String(form.get('intention') ?? '').trim();

  if (!username) return { error: 'Identifique seu @ do Instagram antes de acender uma vela.' };
  if (!intention) return { error: 'Escreva sua intenção de oração para a paróquia.' };

  const res = await submitPrayer(cityCode, parishId, username, displayName, intention);
  if (!res.success) return { error: res.message };

  revalidatePath('/', 'layout');
  return { success: res.message };
}

export async function votePresidentialAction(_: FormState, form: FormData): Promise<FormState> {
  const { voteForPresident } = await import('@/lib/gamification');
  const voterUsername = String(form.get('voter_username') ?? '').trim();
  const candidateUsername = String(form.get('candidate_username') ?? '').trim();

  if (!voterUsername) return { error: 'Informe seu @ de morador para votar.' };
  if (!candidateUsername) return { error: 'Escolha um candidato a Presidente.' };

  const res = await voteForPresident(voterUsername, candidateUsername);
  if (!res.success) return { error: res.message };

  revalidatePath('/', 'layout');
  return { success: res.message };
}

export async function submitPresidentialProposalAction(_: FormState, form: FormData): Promise<FormState> {
  const { getCurrentCycleWeek } = await import('@/lib/gamification');
  const username = String(form.get('president_username') ?? '').trim().toLowerCase().replace(/^@/, '');
  const title = String(form.get('title') ?? '').trim().slice(0, 150);
  const description = String(form.get('description') ?? '').trim().slice(0, 1500);
  const category = String(form.get('category') ?? 'gameplay').trim();

  if (!title || !description) {
    return { error: 'Título e descrição da proposta são obrigatórios.' };
  }

  // Validar se o usuário é realmente o Presidente ativo
  const presRes = await db.query<{ id: number }>(`
    SELECT id FROM houses
    WHERE lower(username) = $1 AND civil_role = 'presidente' AND active
  `, [username]);

  if (!presRes.rows.length) {
    return { error: 'Apenas o Presidente da República em mandato pode submeter propostas para a AcutisTech.' };
  }

  const cycleWeek = getCurrentCycleWeek();
  await db.query(`
    INSERT INTO feature_proposals (cycle_week, president_username, title, description, category, status)
    VALUES ($1, $2, $3, $4, $5, 'pending')
  `, [cycleWeek, username, title, description, category]);

  revalidatePath('/admin');
  revalidatePath('/', 'layout');
  return { success: 'Proposta presidencial encaminhada com sucesso para o Gabinete de Inovação da AcutisTech!' };
}

export async function updateMayorSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get('username') ?? '').trim().toLowerCase().replace(/^@/, '');
  const cityCode = Number(form.get('city_code'));
  const mayorMessage = String(form.get('mayor_message') ?? '').trim().slice(0, 100);
  const patronFestival = form.get('patron_festival') === 'true' || form.get('patron_festival') === 'on';

  // Validar autoridade de Prefeito
  const mayorRes = await db.query<{ id: number }>(`
    SELECT id FROM houses
    WHERE lower(username) = $1 AND civil_role = 'prefeito' AND city_code = $2 AND active
  `, [username, cityCode]);

  if (!mayorRes.rows.length) {
    return { error: 'Apenas o Prefeito em mandato deste município pode atualizar estes decretos.' };
  }

  await db.query(`
    UPDATE cities
    SET mayor_message = $1, patron_festival_active = $2
    WHERE code = $3
  `, [mayorMessage || null, patronFestival, cityCode]);

  revalidatePath('/', 'layout');
  return { success: 'Decreto municipal atualizado com sucesso!' };
}

export async function updateGovernorSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  const { getCurrentCycleWeek } = await import('@/lib/gamification');
  const username = String(form.get('username') ?? '').trim().toLowerCase().replace(/^@/, '');
  const uf = String(form.get('uf') ?? '').trim().toUpperCase().slice(0, 2);
  const featuredCityCode = Number(form.get('featured_city_code'));
  const decreeContent = String(form.get('decree_content') ?? '').trim().slice(0, 200);

  // Validar autoridade de Governador
  const govRes = await db.query<{ id: number }>(`
    SELECT h.id FROM houses h
    JOIN municipalities m ON m.code = h.city_code
    WHERE lower(h.username) = $1 AND h.civil_role = 'governador' AND m.uf = $2 AND h.active
  `, [username, uf]);

  if (!govRes.rows.length) {
    return { error: 'Apenas o Governador em mandato deste Estado pode publicar estes decretos.' };
  }

  if (featuredCityCode) {
    await db.query(`UPDATE cities SET governor_featured = false WHERE code IN (SELECT code FROM municipalities WHERE uf = $1)`, [uf]);
    await db.query(`UPDATE cities SET governor_featured = true WHERE code = $1`, [featuredCityCode]);
  }

  if (decreeContent) {
    const cycleWeek = getCurrentCycleWeek();
    await db.query(`
      INSERT INTO governance_decrees (cycle_week, role_type, author_username, scope_uf, title, content)
      VALUES ($1, 'governador', $2, $3, 'Decreto Estadual da Fé', $4)
    `, [cycleWeek, username, uf, decreeContent]);
  }

  revalidatePath('/', 'layout');
  return { success: 'Decreto do Governador publicado com sucesso para todo o Estado!' };
}

export async function referPriestAction(_: FormState, form: FormData): Promise<FormState> {
  const referrer = String(form.get('referrer_username') ?? '').trim().toLowerCase().replace(/^@/, '');
  const priest = String(form.get('priest_username') ?? '').trim().toLowerCase().replace(/^@/, '');
  const priestTitle = String(form.get('priest_title') ?? 'Pároco').trim();
  const cityCode = Number(form.get('city_code'));
  const parishId = Number(form.get('parish_id'));

  if (!referrer) return { error: 'Identifique seu @ do Instagram.' };
  if (!priest) return { error: 'Informe o @ do sacerdote no Instagram.' };
  if (!parishId) return { error: 'Selecione a paróquia do sacerdote.' };

  try {
    await db.query(`
      INSERT INTO gamification_referrals (referrer_username, referred_username, is_priest, priest_title, city_code, parish_id)
      VALUES ($1, $2, true, $3, $4, $5)
      ON CONFLICT (referrer_username, referred_username) DO NOTHING
    `, [referrer, priest, priestTitle, cityCode, parishId]);

    // +15 XP imediato pela indicação
    const { awardXpToUser } = await import('@/lib/gamification');
    await awardXpToUser(referrer, 15, 'priest_referral');

    revalidatePath('/admin');
    revalidatePath('/', 'layout');
    return { success: `Indicação enviada! Você ganhou +15 XP. Quando o Padre @${priest} for validado pela equipe, você receberá +500 XP bônus!` };
  } catch (error: any) {
    return { error: 'Não foi possível registrar a indicação sacerdotal no momento.' };
  }
}

export async function approvePriestReferralAction(referralId: number): Promise<{ success?: string; error?: string }> {
  try {
    const admin = await requireAdmin();
    const { awardXpToUser } = await import('@/lib/gamification');

    const referralRes = await db.query<{
      id: number;
      referrer_username: string;
      referred_username: string;
      priest_title: string;
      parish_id: number;
      city_code: number;
    }>(`
      SELECT id, referrer_username, referred_username, priest_title, parish_id, city_code
      FROM gamification_referrals
      WHERE id = $1 AND is_priest AND NOT bonus_awarded
    `, [referralId]);

    if (!referralRes.rows.length) {
      return { error: 'Indicação não encontrada ou bônus já concedido.' };
    }

    const { referrer_username, referred_username, priest_title, parish_id, city_code } = referralRes.rows[0];

    // 1. Atualizar Paróquia para ter padre aprovado com upgrade sagrado
    await db.query(`
      UPDATE parishes
      SET has_approved_priest = true,
          priest_name = $1,
          priest_title = $2,
          holy_blessing_active = true,
          stained_glass_active = true,
          blessed_sacrament_chapel = true
      WHERE id = $3
    `, [`Pe. ${referred_username}`, priest_title || 'Pároco', parish_id]);

    // 2. Conceder o Bônus Sacerdotal Máximo (+500 XP) ao fiel indicador!
    await awardXpToUser(referrer_username, 500, 'priest_approved_bonus');

    // 3. Atualizar referral
    await db.query(`
      UPDATE gamification_referrals
      SET bonus_awarded = true,
          approved_at = now(),
          approved_by_admin_id = $2
      WHERE id = $1
    `, [referralId, admin.id]);

    revalidatePath('/admin');
    revalidatePath('/', 'layout');
    return { success: `Padre @${referred_username} aprovado com sucesso! A paróquia recebeu o Upgrade Sagrado e o fiel @${referrer_username} ganhou +500 XP!` };
  } catch (error) {
    console.error('approvePriestReferralAction error', error);
    return { error: error instanceof Error ? error.message : 'Falha ao aprovar sacerdote.' };
  }
}

export async function tallyGovernanceWeeklyAction(): Promise<{ success?: string; error?: string }> {
  try {
    await requireAdmin();
    const { tallyWeeklyGovernance } = await import('@/lib/gamification');
    const result = await tallyWeeklyGovernance();

    revalidatePath('/admin');
    revalidatePath('/', 'layout');
    return {
      success: `Apuração concluída para ${result.cycleWeek}! Presidente: @${result.president ?? 'nenhum'} · Governadores: ${result.governorsCount} · Prefeitos: ${result.mayorsCount} · Sacristãos: ${result.sacristansCount}`,
    };
  } catch (error) {
    console.error('tallyGovernanceWeeklyAction error', error);
    return { error: error instanceof Error ? error.message : 'Falha ao processar apuração semanal.' };
  }
}

export async function getUserMissionsStatusAction(username: string) {
  const { getUserMissionsStatus } = await import('@/lib/gamification');
  return getUserMissionsStatus(username);
}

export async function recordWalkAction(username: string): Promise<{ success: boolean; xpGained: number }> {
  try {
    const { awardXpToUser } = await import('@/lib/gamification');
    const res = await awardXpToUser(username, 15, 'Passeio 3D com o bonequinho no bairro');
    revalidatePath('/', 'layout');
    return { success: true, xpGained: 15 };
  } catch (error) {
    console.error('recordWalkAction error', error);
    return { success: false, xpGained: 0 };
  }
}
