import {randomBytes,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
export const INSTAGRAM_SCOPES=['instagram_business_basic','instagram_business_manage_comments','instagram_business_manage_messages'];
export const oauthHash=value=>createHash('sha256').update(value).digest('hex');
export const newOAuthState=()=>randomBytes(32).toString('hex');

export function instagramConfig(env=process.env){
  if(!env.APP_URL||!/^\d+$/.test(env.INSTAGRAM_APP_ID??'')||!env.INSTAGRAM_APP_SECRET||!/^[a-f0-9]{64}$/i.test(env.INSTAGRAM_TOKEN_ENCRYPTION_KEY??''))throw Error('configuration');
  const origin=new URL(env.APP_URL);
  if(origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/'||!(origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname))))throw Error('configuration');
  const version=env.INSTAGRAM_API_VERSION||'v26.0';if(!/^v\d+\.0$/.test(version))throw Error('configuration');
  return {origin:origin.origin,redirectUri:origin.origin+'/api/instagram/callback',clientId:env.INSTAGRAM_APP_ID,secret:env.INSTAGRAM_APP_SECRET,key:env.INSTAGRAM_TOKEN_ENCRYPTION_KEY,version};
}
export function instagramAuthorizationUrl(config,state){
  const url=new URL('https://www.instagram.com/oauth/authorize');
  url.search=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:INSTAGRAM_SCOPES.join(','),state,enable_fb_login:'0',force_authentication:'1'}).toString();return url.toString();
}
export function encryptInstagramToken(token,key){
  if(!/^[a-f0-9]{64}$/i.test(key))throw Error('configuration');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);
  cipher.setAAD(Buffer.from('instagram-connection-v1'));
  const data=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),data].map(part=>part.toString('base64url')).join('.');
}
export function decryptInstagramToken(value,key){
  const [iv,tag,data]=value.split('.').map(part=>Buffer.from(part,'base64url'));
  const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);decipher.setAAD(Buffer.from('instagram-connection-v1'));decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8');
}
async function instagramJson(url,options,fetcher){
  const response=await fetcher(url,{...options,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  let data;try{data=await response.json();}catch{throw Error('provider');}
  if(!response.ok||data?.error)throw Error(data?.error?.code===190?'expired':'provider');return data;
}
export async function readInstagramProfile(config,token,fetcher=fetch){
  const url=new URL(`https://graph.instagram.com/${config.version}/me`);url.searchParams.set('fields','user_id,username,name,account_type');
  const profile=await instagramJson(url,{headers:{Authorization:'Bearer '+token}},fetcher);
  const id=String(profile.user_id??profile.id??'');
  if(!/^\d+$/.test(id)||typeof profile.username!=='string'||!profile.username||profile.account_type==='PERSONAL')throw Error('profile');
  return {accountId:id,username:profile.username,displayName:typeof profile.name==='string'?profile.name:null,accountType:typeof profile.account_type==='string'?profile.account_type:null};
}
export async function exchangeInstagramCode(config,code,fetcher=fetch){
  const form=new URLSearchParams({client_id:config.clientId,client_secret:config.secret,grant_type:'authorization_code',redirect_uri:config.redirectUri,code});
  const raw=await instagramJson('https://api.instagram.com/oauth/access_token',{method:'POST',body:form},fetcher);
  const short=raw.data?.[0]??raw;if(!short.access_token)throw Error('provider');
  const url=new URL('https://graph.instagram.com/access_token');url.search=new URLSearchParams({grant_type:'ig_exchange_token',client_secret:config.secret,access_token:short.access_token}).toString();
  const long=await instagramJson(url,{},fetcher);
  if(typeof long.access_token!=='string'||!Number.isFinite(long.expires_in)||long.expires_in<=0)throw Error('provider');
  return {token:long.access_token,expiresIn:long.expires_in,profile:await readInstagramProfile(config,long.access_token,fetcher)};
}
export async function consumeInstagramState(client,stateHash,adminId,sessionHash){
  return (await client.query(`UPDATE instagram_oauth_states SET used_at=now() WHERE state_hash=$1 AND admin_id=$2 AND session_hash=$3 AND used_at IS NULL AND expires_at>now() RETURNING state_hash`,[stateHash,adminId,sessionHash])).rowCount===1;
}
export async function saveInstagramConnection(client,stateHash,adminId,result,key){
  await client.query('BEGIN');
  try{
    const state=await client.query('SELECT state_hash FROM instagram_oauth_states WHERE state_hash=$1 AND admin_id=$2 AND used_at IS NOT NULL AND expires_at>now() FOR UPDATE',[stateHash,adminId]);
    if(!state.rowCount)throw Error('state');
    await client.query(`INSERT INTO instagram_connections(account_id,username,display_name,account_type,token_ciphertext,expires_at,connected_by)
      VALUES($1,$2,$3,$4,$5,now()+$6*interval '1 second',$7) ON CONFLICT(slot) DO UPDATE SET account_id=EXCLUDED.account_id,username=EXCLUDED.username,display_name=EXCLUDED.display_name,account_type=EXCLUDED.account_type,token_ciphertext=EXCLUDED.token_ciphertext,expires_at=EXCLUDED.expires_at,connected_by=EXCLUDED.connected_by,connected_at=now(),checked_at=now()`,[result.profile.accountId,result.profile.username,result.profile.displayName,result.profile.accountType,encryptInstagramToken(result.token,key),result.expiresIn,adminId]);
    await client.query('UPDATE instagram_oauth_states SET expires_at=now() WHERE state_hash=$1',[stateHash]);
    await client.query("INSERT INTO audit_log(admin_id,action,entity,entity_id) VALUES($1,'connect','instagram',$2)",[adminId,result.profile.accountId]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}
}
export async function getActiveInstagramToken(client,key,env=process.env){
  try{
    if(client&&key){
      const res=await client.query('SELECT token_ciphertext,expires_at FROM instagram_connections WHERE slot=true');
      if(res.rows.length>0&&new Date(res.rows[0].expires_at)>new Date()){
        return decryptInstagramToken(res.rows[0].token_ciphertext,key);
      }
    }
  }catch{}
  return env.INSTAGRAM_ACCESS_TOKEN||null;
}
