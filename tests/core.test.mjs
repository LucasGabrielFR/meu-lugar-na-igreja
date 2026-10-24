import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { churchConstructionLevel } from '../src/lib/layout.mjs';
import { hashPassword, verifyPassword, tokenHash } from '../scripts/security.mjs';
test('church construction stages preserve the agreed population boundaries',()=>{
  assert.deepEqual([0,7,8,23,24,47,48,500].map(churchConstructionLevel),[1,1,2,2,3,3,4,4]);
});
test('password hashing and session digest do not store plaintext',()=>{
  const hash=hashPassword('a-long-test-password');
  assert.equal(verifyPassword('a-long-test-password',hash),true);
  assert.equal(verifyPassword('wrong-password',hash),false);
  assert.notEqual(hash,hashPassword('a-long-test-password'));
  assert.equal(tokenHash('session-token').length,64);
});
test('bundled official municipality catalog has unique identifiers and all states',()=>{
  const catalog=JSON.parse(readFileSync('public/data/municipios.json','utf8'));
  assert.ok(catalog.length>5500);
  assert.equal(new Set(catalog.map(m=>m.code)).size,catalog.length);
  assert.equal(new Set(catalog.map(m=>m.uf)).size,27);
  assert.equal(catalog.find(m=>m.code===5214606)?.name,'Niquelândia');
});
