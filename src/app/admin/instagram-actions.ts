'use server';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/lib/auth';
import {db} from '@/lib/db';
import {instagramConfig,instagramAuthorizationUrl,newOAuthState,oauthHash,decryptInstagramToken,readInstagramProfile} from '../../../scripts/instagram-oauth.mjs';
import {processPendingInstagramReceipts} from '../../../scripts/instagram-comment-processor.mjs';

export async function connectInstagram(){
  const admin=await requireAdmin();let config;
  try{config=instagramConfig();}catch{redirect('/admin?view=instagram&result=configuration');}
  const jar=await cookies(),session=jar.get('paroquia_session')?.value;
  if(!session)redirect('/entrar');
  const state=newOAuthState();
  await db.query("INSERT INTO instagram_oauth_states(state_hash,admin_id,session_hash,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')",[oauthHash(state),admin.id,oauthHash(session)]);
  jar.set('instagram_oauth_state',state,{httpOnly:true,sameSite:'lax',secure:config.origin.startsWith('https:'),path:'/api/instagram/callback',maxAge:600});
  redirect(instagramAuthorizationUrl(config,state));
}
export async function checkInstagram(){
  await requireAdmin();let result='checked';
  try{
    const config=instagramConfig();
    const row=(await db.query<{account_id:string;token_ciphertext:string;expires_at:Date}>('SELECT account_id,token_ciphertext,expires_at FROM instagram_connections')).rows[0];
    if(!row||new Date(row.expires_at)<=new Date())throw Error('expired');
    const profile=await readInstagramProfile(config,decryptInstagramToken(row.token_ciphertext,config.key));
    if(profile.accountId!==row.account_id)throw Error('profile');
    const updated=await db.query('UPDATE instagram_connections SET username=$1,display_name=$2,account_type=$3,checked_at=now() WHERE account_id=$4 AND token_ciphertext=$5',[profile.username,profile.displayName,profile.accountType,row.account_id,row.token_ciphertext]);
    if(!updated.rowCount)throw Error('provider');
  }catch(error){result=error instanceof Error&&['configuration','expired'].includes(error.message)?error.message:'provider';}
  redirect('/admin?view=instagram&result='+result);
}
export async function disconnectInstagram(){
  const admin=await requireAdmin(),client=await db.connect();
  try{
    await client.query('BEGIN');
    await client.query('UPDATE instagram_oauth_states SET expires_at=now() WHERE expires_at>now()');
    // Local disconnect erases the encrypted credential; it does not revoke Meta permissions or change the webhook.
    const rows=await client.query<{account_id:string}>('DELETE FROM instagram_connections WHERE slot=true RETURNING account_id');
    if(rows.rowCount)await client.query("INSERT INTO audit_log(admin_id,action,entity,entity_id) VALUES($1,'disconnect_local','instagram',$2)",[admin.id,rows.rows[0].account_id]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  redirect('/admin?view=instagram&result=disconnected');
}
export async function processInstagramComments(){
  await requireAdmin();
  let result='processed';
  try{
    await processPendingInstagramReceipts(db,process.env);
    revalidatePath('/','layout');
    revalidatePath('/admin');
  }catch{
    result='process_failed';
  }
  redirect('/admin?view=instagram&result='+result);
}
