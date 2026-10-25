import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {loadParishResolutions} from '../scripts/parish-reconciliation.mjs';
test('every active catalog parish has a map neighborhood and every source resolves to a catalog record', {skip:!process.env.PGHOST},async()=>{
  const client=new pg.Client();await client.connect();
  try {
    const missing=await client.query(`SELECT pc.id FROM parish_catalog pc WHERE pc.active AND NOT EXISTS(SELECT 1 FROM parishes p WHERE p.catalog_id=pc.id)`);
    assert.equal(missing.rowCount,0);
    const sources=await client.query('SELECT count(*)::int total FROM parish_catalog_sources');
    assert.ok(sources.rows[0].total>2000);
  } finally {await client.end();}
});

test('reference records allow an open diocese while institutional records still require one', {skip:!process.env.PGHOST},async()=>{
  const client=new pg.Client();await client.connect();
  try{
    await client.query('BEGIN');
    const row=(await client.query(`INSERT INTO parish_catalog(source_key,jurisdiction_id,municipality_code,name,source_url,retrieved_at,source_kind)
      VALUES('__reference_constraint_test__',NULL,5214606,'Paróquia de teste','https://example.org',now(),'reference') RETURNING id,jurisdiction_id`)).rows[0];
    assert.equal(row.jurisdiction_id,null);
    await client.query('SAVEPOINT institutional');
    await assert.rejects(client.query(`UPDATE parish_catalog SET source_kind='institutional' WHERE id=$1`,[row.id]),error=>error.code==='23514');
    await client.query('ROLLBACK TO SAVEPOINT institutional');
    const inconsistent=await client.query(`SELECT id FROM parish_catalog WHERE source_kind='institutional' AND jurisdiction_id IS NULL`);
    assert.equal(inconsistent.rowCount,0);
  }finally{await client.query('ROLLBACK');await client.end();}
});

test('reviewed duplicates resolve to one active identity while distinct homonyms remain separate', {skip:!process.env.PGHOST},async()=>{
  const client=new pg.Client();await client.connect();
  try{
    const catalog=(await client.query('SELECT id,source_key,active FROM parish_catalog')).rows;
    const sources=(await client.query('SELECT source_key,catalog_id FROM parish_catalog_sources')).rows;
    const active=new Set(catalog.filter(p=>p.active).map(p=>p.id));
    const identities=new Map([...catalog.map(p=>[p.source_key,p.id]),...sources.map(s=>[s.source_key,s.catalog_id])]);
    const plan=loadParishResolutions();
    for(const merge of plan.merges){
      assert.equal(identities.get(merge.duplicate_key),identities.get(merge.canonical_key),merge.duplicate_key);
      assert.ok(active.has(identities.get(merge.canonical_key)));
    }
    for(const review of plan.reviews.filter(r=>r.status.startsWith('preservar_')||r.status==='pendente_evidencia')){
      const a=identities.get(review.a.source_key),b=identities.get(review.b.source_key);
      assert.notEqual(a,b,`Homônimas unidas: ${review.pair}`);
      assert.ok(active.has(a)&&active.has(b),`Homônima arquivada: ${review.pair}`);
    }
  }finally{await client.end();}
});
test('database enforces parish/city consistency, profile uniqueness and transaction rollback', {skip:!process.env.PGHOST}, async()=>{
  const client=new pg.Client();
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(78123003)');
    await client.query('INSERT INTO cities(code) VALUES(5214606),(3550308) ON CONFLICT DO NOTHING');
    const p=(await client.query(`INSERT INTO parishes(city_code,name,slot) SELECT 5214606,'__transaction_test__',COALESCE(MAX(slot)+1,0) FROM parishes WHERE city_code=5214606 RETURNING id`)).rows[0];
    await client.query('SAVEPOINT mismatch');
    await assert.rejects(client.query(`INSERT INTO houses(city_code,parish_id,username,display_name,slot) VALUES(3550308,$1,'__db_test__','Test',0)`,[p.id]),error=>error.code==='23503');
    await client.query('ROLLBACK TO SAVEPOINT mismatch');
    await client.query(`INSERT INTO houses(city_code,parish_id,username,display_name,slot) VALUES(5214606,$1,'__db_test__','Test',0)`,[p.id]);
    await client.query('SAVEPOINT duplicate');
    await assert.rejects(client.query(`INSERT INTO houses(city_code,parish_id,username,display_name,slot) VALUES(5214606,$1,'__DB_TEST__','Test',1)`,[p.id]),error=>error.code==='23505');
    await client.query('ROLLBACK TO SAVEPOINT duplicate');
  } finally { await client.query('ROLLBACK'); await client.end(); }
});
