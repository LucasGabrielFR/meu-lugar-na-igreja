import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import pg from 'pg';
import {verifyInstagramWebhook,receiveInstagramWebhook,storeInstagramReceipt} from '../scripts/instagram-webhook.mjs';
const secret='test-app-secret-only';
const body=JSON.stringify({object:'instagram',entry:[{id:'test-account',changes:[{field:'comments',value:{id:'comment',text:'Niquelândia/GO — Abadia'}}]}]});
const signed=(text=body)=>new Request('http://localhost/api/webhooks/instagram',{method:'POST',body:text,headers:{'x-hub-signature-256':'sha256='+createHmac('sha256',secret).update(text).digest('hex')}});

test('Meta handshake requires configured matching token and returns exact plain challenge',async()=>{
  const request=new Request('http://localhost/?hub.mode=subscribe&hub.verify_token=test-token&hub.challenge=123456');
  assert.equal((await verifyInstagramWebhook(request,undefined)).status,503);
  assert.equal((await verifyInstagramWebhook(request,'wrong')).status,403);
  const response=await verifyInstagramWebhook(request,'test-token');
  assert.equal(response.status,200);assert.equal(await response.text(),'123456');assert.equal(response.headers.get('cache-control'),'no-store');
});
test('only signed bounded Instagram JSON is stored and persistence failure requests retry',async()=>{
  let stored=0;const client={query:async()=>{stored++;return {rows:[{id:'1',delivery_count:1}]};}};
  assert.equal((await receiveInstagramWebhook(signed(),client,undefined)).status,503);
  assert.equal((await receiveInstagramWebhook(new Request('http://localhost',{method:'POST',body}),client,secret)).status,403);
  const changed=signed();changed.headers.set('x-hub-signature-256','sha256='+'0'.repeat(64));
  assert.equal((await receiveInstagramWebhook(changed,client,secret)).status,403);
  assert.equal((await receiveInstagramWebhook(signed('{'),client,secret)).status,400);
  assert.equal((await receiveInstagramWebhook(signed('{"object":"page","entry":[]}'),client,secret)).status,400);
  assert.equal((await receiveInstagramWebhook(signed('x'.repeat(1024*1024+1)),client,secret)).status,413);
  assert.equal(stored,0);
  assert.equal((await receiveInstagramWebhook(signed(),client,secret)).status,200);assert.equal(stored,1);
  assert.equal((await receiveInstagramWebhook(signed(),{query:async()=>{throw Error('offline');}},secret)).status,503);
});
test('PostgreSQL preserves receipt payload and counts exact redeliveries without resetting status',{skip:!process.env.PGHOST},async()=>{
  const client=new pg.Client();await client.connect();
  try{
    await client.query('BEGIN');
    const first=await storeInstagramReceipt(client,Buffer.from(body),JSON.parse(body));
    await client.query("UPDATE instagram_webhook_receipts SET status='processed',processed_at=now() WHERE id=$1",[first.id]);
    const second=await storeInstagramReceipt(client,Buffer.from(body),JSON.parse(body));
    assert.equal(first.id,second.id);assert.equal(second.delivery_count,2);
    const stored=(await client.query('SELECT payload,status FROM instagram_webhook_receipts WHERE id=$1',[first.id])).rows[0];
    assert.deepEqual(stored.payload,JSON.parse(body));assert.equal(stored.status,'processed');
  }finally{await client.query('ROLLBACK');await client.end();}
});
