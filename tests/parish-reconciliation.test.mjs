import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {validateMerge,applyParishResolutions,loadParishResolutions} from '../scripts/parish-reconciliation.mjs';
import {planReferenceCatalog} from '../scripts/reference-catalog.mjs';

test('reconciliation decisions have unique targets, provenance and a disposition for every audited pair',()=>{
  const plan=loadParishResolutions(),removed=new Set(plan.merges.map(m=>m.duplicate_key));
  assert.equal(plan.reviews.length,378);assert.equal(removed.size,plan.merges.length);
  for(const m of plan.merges){assert.ok(!removed.has(m.canonical_key));assert.ok(m.evidence.records.length>=2);assert.ok(m.name.startsWith('Paróquia'));assert.doesNotMatch(m.name,/nova paróquia|\bFco\b|\bS Goncalo\b/);}
  assert.throws(()=>validateMerge({id:1,municipality_code:1},{id:1,municipality_code:1}));
  assert.throws(()=>validateMerge({id:1,municipality_code:1},{id:2,municipality_code:2}));
  assert.throws(()=>validateMerge({id:1,municipality_code:1,jurisdiction_id:1},{id:2,municipality_code:1,jurisdiction_id:2}));
});

test('new abbreviations enter review while reviewed source aliases reuse the canonical record',()=>{
  const municipalities=[{code:4211900,name:'Palhoça',uf:'SC'}],catalog=[{id:1,name:'Paróquia São Francisco de Assis (Aririú)',source_key:'official:1',municipality_code:4211900,active:true}];
  const row={key:'acervo:999999',name:'Paróquia S Fco de Assis',municipality_code:4211900,source_url:'https://acervocatolico.com/igreja/example-999999',kind:'parish'};
  const pending=planReferenceCatalog({records:[row]},catalog,municipalities,new Set(),{merges:[]});
  assert.equal(pending.records.length,0);assert.deepEqual(pending.skipped[0].candidates,[1]);
  const preserved=planReferenceCatalog({records:[row]},catalog,municipalities,new Set([row.key]),{merges:[]});
  assert.equal(preserved.records.length,1);assert.equal(preserved.records[0].catalog_id,null);
  const reviewed=planReferenceCatalog({records:[row]},catalog,municipalities,new Set(),{merges:[{municipality_code:4211900,duplicate_key:row.key,canonical_key:'official:1'}]});
  assert.equal(reviewed.records[0].catalog_id,1);
  const different=planReferenceCatalog({records:[{...row,name:'Paróquia São João Evangelista'}]},catalog,municipalities,new Set(),{merges:[]});
  assert.equal(different.records.length,1);assert.equal(different.records[0].catalog_id,null);
});

test('database reconciliation preserves houses, source aliases and archived records across repeated application',async()=>{
  const client=new pg.Client();await client.connect();await client.query('BEGIN');
  try{
    const code=4211900,suffix=Date.now().toString(),name='Paróquia Teste Conciliação '+suffix;
    const create=async key=>(await client.query(`INSERT INTO parish_catalog(source_key,municipality_code,name,source_url,retrieved_at,source_kind) VALUES($1,$2,$3,'https://example.org',now(),'reference') RETURNING *`,[key,code,name])).rows[0];
    const target=await create('test:target'+suffix),duplicate=await create('test:duplicate'+suffix);
    const parish=async(id,label)=>(await client.query(`INSERT INTO parishes(city_code,name,catalog_id,slot) SELECT $1,$2,$3,coalesce(max(slot)+1,0) FROM parishes WHERE city_code=$1 RETURNING id`,[code,label,id])).rows[0].id;
    const kept=await parish(target.id,name),old=await parish(duplicate.id,name+' abreviado');
    await client.query(`INSERT INTO houses(city_code,parish_id,username,display_name,slot,color) VALUES($1,$2,$3,'Teste',0,'#cc7850'),($1,$4,$5,'Teste',0,'#cc7850')`,[code,kept,'dedup_a_'+suffix,old,'dedup_b_'+suffix]);
    await client.query(`INSERT INTO parish_catalog_sources(source_key,catalog_id,source_url,retrieved_at,source_kind) VALUES($1,$2,'https://example.org',now(),'reference')`,[duplicate.source_key,duplicate.id]);
    const plan={corrections:[],merges:[{canonical_key:target.source_key,duplicate_key:duplicate.source_key,name,reason:'fixture',evidence:{records:[]}}]};
    await applyParishResolutions(client,plan);await applyParishResolutions(client,plan);
    const houses=(await client.query('SELECT parish_id,slot FROM houses WHERE parish_id=ANY($1::int[]) ORDER BY slot',[[kept,old]])).rows;
    assert.deepEqual(houses,[{parish_id:kept,slot:0},{parish_id:kept,slot:1}]);
    assert.equal((await client.query('SELECT active FROM parishes WHERE id=$1',[old])).rows[0].active,false);
    assert.equal((await client.query('SELECT catalog_id FROM parish_catalog_sources WHERE source_key=$1',[duplicate.source_key])).rows[0].catalog_id,target.id);
    assert.equal((await client.query('SELECT count(*)::int n FROM parish_catalog_redirects WHERE duplicate_id=$1',[duplicate.id])).rows[0].n,1);
    const fresh=await create('test:fresh'+suffix);
    await applyParishResolutions(client,{corrections:[],merges:[{canonical_key:fresh.source_key,duplicate_key:'test:absent'+suffix,name:name+' completo'}]});
    assert.equal((await client.query('SELECT name FROM parish_catalog WHERE id=$1',[fresh.id])).rows[0].name,name+' completo');
  }finally{await client.query('ROLLBACK');await client.end();}
});
