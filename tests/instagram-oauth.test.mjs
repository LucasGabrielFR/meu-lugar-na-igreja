import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
import {instagramConfig,instagramAuthorizationUrl,encryptInstagramToken,decryptInstagramToken,exchangeInstagramCode,readInstagramProfile,consumeInstagramState,saveInstagramConnection,newOAuthState,oauthHash} from '../scripts/instagram-oauth.mjs';
const key='ab'.repeat(32);
const env={APP_URL:'https://example.com',INSTAGRAM_APP_ID:'12345',INSTAGRAM_APP_SECRET:'fixture-secret',INSTAGRAM_TOKEN_ENCRYPTION_KEY:key};

test('OAuth uses a fixed configured callback, minimal scopes and state without exposing secrets',()=>{
  const config=instagramConfig(env),state=newOAuthState(),url=new URL(instagramAuthorizationUrl(config,state));
  assert.equal(state.length,64);assert.equal(url.origin,'https://www.instagram.com');assert.equal(url.searchParams.get('state'),state);
  assert.equal(url.searchParams.get('redirect_uri'),'https://example.com/api/instagram/callback');
  assert.equal(url.searchParams.get('scope'),'instagram_business_basic,instagram_business_manage_comments');
  assert.ok(!url.toString().includes(env.INSTAGRAM_APP_SECRET));
  for(const APP_URL of ['http://example.com','https://user:password@example.com','https://example.com/path','https://example.com/?redirect=other'])assert.throws(()=>instagramConfig({...env,APP_URL}));
  assert.throws(()=>instagramConfig({...env,INSTAGRAM_TOKEN_ENCRYPTION_KEY:'short'}));
  assert.equal(instagramConfig({...env,APP_URL:'http://localhost:3100'}).origin,'http://localhost:3100');
});
test('stored Instagram credentials use authenticated encryption and reject tampering or another key',()=>{
  const encrypted=encryptInstagramToken('fixture-access-token',key);
  assert.ok(!encrypted.includes('fixture-access-token'));assert.notEqual(encryptInstagramToken('fixture-access-token',key),encrypted);
  assert.equal(decryptInstagramToken(encrypted,key),'fixture-access-token');
  assert.throws(()=>decryptInstagramToken(encrypted,'cd'.repeat(32)));
  const parts=encrypted.split('.');const bytes=Buffer.from(parts[2],'base64url');bytes[0]^=1;parts[2]=bytes.toString('base64url');
  assert.throws(()=>decryptInstagramToken(parts.join('.'),key));
});
test('OAuth exchanges codes only server-side, upgrades token and loads actual profile with bearer auth',async()=>{
  const calls=[];const fetcher=async(url,options)=>{
    calls.push({url:String(url),options});
    const data=calls.length===1?{data:[{access_token:'short',user_id:'123'}]}:calls.length===2?{access_token:'long',expires_in:3600}:{user_id:'123',username:'official',name:'Conta de teste',account_type:'BUSINESS'};
    return Response.json(data);
  };
  const result=await exchangeInstagramCode(instagramConfig(env),'one-use-code',fetcher);
  assert.equal(result.token,'long');assert.equal(result.profile.accountId,'123');assert.equal(result.profile.username,'official');
  assert.equal(calls[0].url,'https://api.instagram.com/oauth/access_token');assert.equal(calls[0].options.method,'POST');
  assert.equal(calls[0].options.body.get('redirect_uri'),'https://example.com/api/instagram/callback');
  assert.equal(new URL(calls[1].url).searchParams.get('grant_type'),'ig_exchange_token');
  assert.equal(calls[2].options.headers.Authorization,'Bearer long');
  assert.ok(!calls[2].url.includes('long'));assert.ok(calls.every(c=>c.options.cache==='no-store'&&c.options.redirect==='error'));
});
test('provider errors never include token, code, secret or remote response text',async()=>{
  await assert.rejects(exchangeInstagramCode(instagramConfig(env),'sensitive-code',async()=>Response.json({error:{message:'sensitive-token',code:190}},{status:400})),error=>error.message==='expired');
  await assert.rejects(readInstagramProfile(instagramConfig(env),'token',async()=>Response.json({user_id:'123',username:'x',account_type:'PERSONAL'})),error=>error.message==='profile');
});
test('OAuth state is session/admin bound and single use; encrypted single-account save is rollback-safe',{skip:!process.env.PGHOST},async()=>{
  const client=new pg.Client();await client.connect();
  try{
    await client.query('BEGIN');const adminId=(await client.query('SELECT id FROM admins ORDER BY id LIMIT 1')).rows[0].id;
    const stateHash=oauthHash(randomBytes(32)),sessionHash=oauthHash('fixture-session');
    await client.query("INSERT INTO instagram_oauth_states(state_hash,admin_id,session_hash,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')",[stateHash,adminId,sessionHash]);
    assert.equal(await consumeInstagramState(client,stateHash,adminId+99999,sessionHash),false);
    assert.equal(await consumeInstagramState(client,stateHash,adminId,oauthHash('other-session')),false);
    assert.equal(await consumeInstagramState(client,stateHash,adminId,sessionHash),true);
    assert.equal(await consumeInstagramState(client,stateHash,adminId,sessionHash),false);
    // Preserve the caller transaction while exercising the helper's transaction boundaries.
    const transactional={query:(sql,values)=>client.query(sql==='BEGIN'?'SAVEPOINT oauth_save':sql==='COMMIT'?'RELEASE SAVEPOINT oauth_save':sql==='ROLLBACK'?'ROLLBACK TO SAVEPOINT oauth_save':sql,values)};
    const result={token:'fixture-token',expiresIn:3600,profile:{accountId:'123',username:'fixture_account',displayName:'Fixture',accountType:'BUSINESS'}};
    await saveInstagramConnection(transactional,stateHash,adminId,result,key);
    const row=(await client.query('SELECT * FROM instagram_connections')).rows[0];assert.equal(row.account_id,'123');assert.equal(decryptInstagramToken(row.token_ciphertext,key),'fixture-token');
    assert.equal((await client.query('SELECT count(*)::int n FROM instagram_connections')).rows[0].n,1);
    await assert.rejects(saveInstagramConnection(transactional,stateHash,adminId,result,key),error=>error.message==='state');
    const expired=oauthHash('expired-'+stateHash);
    await client.query("INSERT INTO instagram_oauth_states(state_hash,admin_id,session_hash,expires_at) VALUES($1,$2,$3,now()-interval '1 minute')",[expired,adminId,sessionHash]);
    assert.equal(await consumeInstagramState(client,expired,adminId,sessionHash),false);
  }finally{await client.query('ROLLBACK');await client.end();}
});
