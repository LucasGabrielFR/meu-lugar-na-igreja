import test from 'node:test';
import assert from 'node:assert/strict';
import {planReferenceCatalog,referenceIdentity} from '../scripts/reference-catalog.mjs';
const municipalities=[{code:5214606,name:'Niquelândia',uf:'GO'},{code:3550308,name:'São Paulo',uf:'SP'}];
const ref=(id,name,code=5214606)=>({key:`acervo:${id}`,name,municipality_code:code,source_url:`https://acervocatolico.com/igreja/example-${id}`,kind:'parish'});

test('reference import links only unique patron/city matches and does not invent a diocese',()=>{
  const official={id:8,name:'PARÓQUIA SÃO JOSÉ - NIQUELÂNDIA - 2001',municipality_code:5214606,jurisdiction_id:12,source_kind:'institutional'};
  const plan=planReferenceCatalog({records:[ref(1,'Paróquia de São José'),ref(2,'Paróquia Santa Rita'),ref(3,'Paróquia São José',3550308),{...ref(4,'Capela Santa Maria'),kind:'other'},ref(5,'Paróquia São João',9999999)]},[official],municipalities);
  assert.equal(plan.records.length,3);assert.equal(plan.records[0].catalog_id,8);assert.equal(plan.records[1].catalog_id,null);assert.equal(plan.records[2].catalog_id,null);
  assert.equal(plan.skipped.length,2);assert.equal(plan.records[1].jurisdiction_id,undefined);assert.equal(official.jurisdiction_id,12);
});

test('homonymous source entries and multiple institutional matches stay in review',()=>{
  const snapshot={records:[ref(1,'Paróquia São José'),ref(2,'Paróquia São José (Centro)'),ref(3,'Paróquia Santa Rita')]};
  const catalog=[{id:1,name:'Santa Rita',municipality_code:5214606},{id:2,name:'Santa Rita (Centro)',municipality_code:5214606}];
  const plan=planReferenceCatalog(snapshot,catalog,municipalities);
  assert.equal(plan.records.length,0);assert.equal(plan.skipped.length,3);
  const linked=planReferenceCatalog({records:[ref(10,'Paróquia Nossa Senhora Aparecida')]},[{id:20,name:'Paróquia Nossa Senhora Aparecida',municipality_code:5214606,source_kind:'reference'}],municipalities);
  assert.equal(linked.records[0].catalog_id,20);
  assert.notEqual(referenceIdentity('São João Batista',municipalities[0]),referenceIdentity('São João Evangelista',municipalities[0]));
  assert.equal(referenceIdentity('Paróquia Santuário São José',municipalities[0]),referenceIdentity('Paróquia São José',municipalities[0]));
});
