import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseInstagram} from '../scripts/diagnose-instagram.mjs';
import {encryptInstagramToken} from '../scripts/instagram-oauth.mjs';

test('read-only diagnosis discovers account, actual subscriptions and comment access without publishing credentials',async()=>{
  const calls=[];const fetcher=async(url,options)=>{
    calls.push({url:String(url),options});
    const path=new URL(url).pathname;
    return Response.json(path.endsWith('/me')?{user_id:'123',username:'fixture'}:path.endsWith('/subscribed_apps')?{data:[{id:'456',name:'Fixture App',subscribed_fields:['comments']}]}:path.endsWith('/permissions')?{data:[{permission:'instagram_business_manage_comments',status:'granted'}]}:path.endsWith('/media')?{data:[{id:'789',permalink:'https://www.instagram.com/p/fixture/'}]}:{data:[{id:'comment1'}],paging:{next:'https://example.invalid/?access_token=fixture-token'}});
  };
  const report=await diagnoseInstagram({query:async()=>({rows:[]})},{INSTAGRAM_ACCESS_TOKEN:'fixture-token'},fetcher);
  assert.equal(report.account.id,'123');assert.deepEqual(report.subscriptions.apps[0].fields,['comments']);assert.equal(report.latest_comments.sample_count,1);assert.equal(report.latest_comments.has_more,true);
  assert.ok(calls.every(c=>!c.options.method||c.options.method==='GET'));assert.ok(calls.every(c=>c.options.headers.Authorization==='Bearer fixture-token'&&!c.url.includes('fixture-token')));
  assert.ok(!JSON.stringify(report).includes('fixture-token'));
});
test('diagnosis reports provider and configuration failures without guessing app mode or exposing secrets',async()=>{
  const client={query:async()=>({rows:[]})};
  assert.equal((await diagnoseInstagram(client,{})).error,'no_access_token');
  const report=await diagnoseInstagram(client,{INSTAGRAM_ACCESS_TOKEN:'fixture-token'},async()=>Response.json({error:{code:190,error_subcode:463,message:'fixture-token must not leak'}},{status:400}));
  assert.equal(report.account.code,190);assert.equal(report.account.subcode,463);assert.ok(!JSON.stringify(report).includes('fixture-token'));
  const key='ab'.repeat(32),row={token_ciphertext:encryptInstagramToken('fixture-token',key),expires_at:new Date(Date.now()+10000)};
  assert.equal((await diagnoseInstagram({query:async()=>({rows:[row]})},{})).error,'missing_encryption_key');
  assert.equal((await diagnoseInstagram({query:async()=>({rows:[row]})},{INSTAGRAM_TOKEN_ENCRYPTION_KEY:'cd'.repeat(32)})).error,'cannot_decrypt_token');
});
