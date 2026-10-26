import pg from 'pg';
import {pathToFileURL} from 'node:url';
import {decryptInstagramToken} from './instagram-oauth.mjs';

export async function diagnoseInstagram(client,env=process.env,fetcher=fetch){
  const report={token_source:'none',account:null,subscriptions:null,permissions:null,latest_post:null,latest_comments:null};
  const row=(await client.query('SELECT token_ciphertext,expires_at FROM instagram_connections WHERE slot=true')).rows[0];
  let token;
  if(row){
    report.token_source='oauth_database';
    if(!env.INSTAGRAM_TOKEN_ENCRYPTION_KEY)return {...report,error:'missing_encryption_key'};
    try{token=decryptInstagramToken(row.token_ciphertext,env.INSTAGRAM_TOKEN_ENCRYPTION_KEY);}catch{return {...report,error:'cannot_decrypt_token'};}
    if(new Date(row.expires_at)<=new Date())return {...report,error:'stored_token_expired'};
  }else if(env.INSTAGRAM_ACCESS_TOKEN){token=env.INSTAGRAM_ACCESS_TOKEN;report.token_source='manual_environment';}
  if(!token)return {...report,error:'no_access_token'};
  const version=env.INSTAGRAM_API_VERSION||'v26.0';if(!/^v\d+\.0$/.test(version))return {...report,error:'invalid_api_version'};
  const get=async(path,fields)=>{
    const url=new URL(`https://graph.instagram.com/${version}/${path}`);if(fields)url.searchParams.set('fields',fields);url.searchParams.set('limit','5');
    try{
      const response=await fetcher(url,{headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
      const data=await response.json();
      if(!response.ok||data.error)return {ok:false,http:response.status,code:data.error?.code??null,subcode:data.error?.error_subcode??null};
      return {ok:true,data};
    }catch{return {ok:false,error:'network_or_invalid_response'};}
  };
  const profile=await get('me','user_id,username');
  if(!profile.ok)return {...report,account:profile};
  const accountId=String(profile.data.user_id??profile.data.id??'');
  if(!/^\d+$/.test(accountId))return {...report,error:'missing_account_id'};
  report.account={ok:true,id:accountId,username:profile.data.username};
  const subscriptions=await get(accountId+'/subscribed_apps');
  report.subscriptions=subscriptions.ok?{ok:true,apps:(subscriptions.data.data??[]).map(app=>({id:app.id,name:app.name,fields:app.subscribed_fields??[]}))}:subscriptions;
  const permissions=await get(accountId+'/permissions');
  report.permissions=permissions.ok?{ok:true,permissions:(permissions.data.data??[]).map(p=>({permission:p.permission,status:p.status}))}:permissions;
  const media=await get(accountId+'/media','id,permalink');
  if(!media.ok)return {...report,latest_post:media};
  const post=media.data.data?.[0];
  if(!post||!/^\d+$/.test(String(post.id)))return {...report,latest_post:{ok:true,found:false}};
  report.latest_post={ok:true,id:String(post.id),permalink:post.permalink};
  const comments=await get(String(post.id)+'/comments','id,timestamp');
  report.latest_comments=comments.ok?{ok:true,sample_count:(comments.data.data??[]).length,has_more:!!comments.data.paging?.next}:comments;
  return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const client=new pg.Client();
  try{await client.connect();await client.query('SET default_transaction_read_only=on');console.log(JSON.stringify(await diagnoseInstagram(client),null,2));}
  catch{console.error('instagram_diagnostic_failed: verifique a conexão PostgreSQL e a migration012.');process.exitCode=1;}
  finally{await client.end();}
}
