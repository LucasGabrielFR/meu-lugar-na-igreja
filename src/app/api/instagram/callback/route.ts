import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {getAdmin} from '@/lib/auth';
import {db} from '@/lib/db';
import {sameSecret} from '../../../../../scripts/instagram-webhook.mjs';
import {instagramConfig,oauthHash,consumeInstagramState,exchangeInstagramCode,saveInstagramConnection} from '../../../../../scripts/instagram-oauth.mjs';
export const runtime='nodejs';
export async function GET(request:Request){
  const jar=await cookies(),admin=await getAdmin(),params=new URL(request.url).searchParams;
  const state=params.get('state'),cookieState=jar.get('instagram_oauth_state')?.value,session=jar.get('paroquia_session')?.value;
  let config;try{config=instagramConfig();}catch{return new Response('Integração Instagram não configurada.',{status:503,headers:{'Cache-Control':'no-store'}});}
  const finish=(result:string)=>{
    const response=NextResponse.redirect(new URL('/admin?view=instagram&result='+result,config.origin),303);
    response.cookies.set('instagram_oauth_state','',{httpOnly:true,sameSite:'lax',secure:config.origin.startsWith('https:'),path:'/api/instagram/callback',maxAge:0});
    response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
  };
  if(!admin||!session)return finish('session');
  if(!state||state.length!==64||!sameSecret(state,cookieState))return finish('state');
  try{
    if(!await consumeInstagramState(db,oauthHash(state),admin.id,oauthHash(session)))return finish('state');
    if(params.has('error'))return finish('denied');
    const code=params.get('code');if(!code||code.length>4096)return finish('denied');
    const result=await exchangeInstagramCode(config,code);
    const client=await db.connect();try{await saveInstagramConnection(client,oauthHash(state),admin.id,result,config.key);}finally{client.release();}
    return finish('connected');
  }catch{return finish('provider');}
}
