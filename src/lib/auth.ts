import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { tokenHash } from '../../scripts/security.mjs';
export async function getAdmin() {
  const token = (await cookies()).get('paroquia_session')?.value;
  if (!token || token.length > 128) return null;
  const result = await db.query<{id: number; email: string}>(`SELECT a.id,a.email FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now()`, [tokenHash(token)]);
  return result.rows[0] ?? null;
}
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect('/entrar');
  return admin;
}
