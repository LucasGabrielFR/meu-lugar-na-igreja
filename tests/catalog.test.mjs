import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveCatalogMunicipality,parishIdentity} from '../scripts/catalog-normalization.mjs';
import {buildCnbbSnapshot} from '../scripts/fetch-cnbb-catalog.mjs';
const municipalities=JSON.parse(readFileSync('public/data/municipios.json','utf8'));
test('catalog resolves city and state together and rejects ambiguous or incomplete geography',()=>{
  assert.equal(resolveCatalogMunicipality('Niquelandia-Goiás',municipalities)?.code,5214606);
  assert.equal(resolveCatalogMunicipality('São Paulo - SP',municipalities)?.code,3550308);
  assert.equal(resolveCatalogMunicipality('São Paulo-Paraná',municipalities),null);
  assert.equal(resolveCatalogMunicipality('Catalão / Davinópolis-GO',municipalities),null);
  assert.equal(resolveCatalogMunicipality('São Paulo',municipalities),null);
  assert.equal(parishIdentity('Paróquia de Nossa Senhora da Abadia'),parishIdentity('Nossa Senhora da Abadia'));
  assert.equal(parishIdentity('Paróquia Nossa Senhora d’Abadia'),parishIdentity('Nossa Senhora da Abadia'));
});
test('CNBB importer excludes quasi-parishes, missing municipalities and unknown jurisdictions',()=>{
  const row={id:'one',name:'Paróquia São José',location:'Niquelândia-GO',details:[{icon:'diocese',value:'Diocese de Uruaçu'}]};
  const snapshot=buildCnbbSnapshot([row,{...row,id:'two',name:'Quase Paróquia São José'},{...row,id:'three',location:null},{...row,id:'four',details:[]}],[{id:'uruacu',name:'Diocese de Uruaçu'}],municipalities,'2026-10-24T12:00:00Z');
  assert.equal(snapshot.parishes.length,1);
  assert.equal(snapshot.parishes[0].municipality_code,5214606);
  assert.equal(snapshot.skipped.length,3);
});
test('canonical classification includes a parish without prefix and rejects a chapel despite its name',()=>{
  const base={id:'typed',name:'São José',location:'Niquelândia-GO',types:['Paróquia'],details:[{icon:'diocese',value:'Diocese de Uruaçu'}]};
  const snapshot=buildCnbbSnapshot([base,{...base,id:'chapel',name:'Paróquia Antiga',types:['Capela']}],[{id:'uruacu',name:'Diocese de Uruaçu'}],municipalities);
  assert.equal(snapshot.parishes.length,1);assert.equal(snapshot.parishes[0].name,'São José');assert.equal(snapshot.skipped.length,1);
});
test('national snapshot retains provenance and valid IBGE references without claiming complete coverage',()=>{
  const snapshot=JSON.parse(readFileSync('db/catalog/cnbb-national.json','utf8'));
  const codes=new Set(municipalities.map(m=>m.code)),jurisdictions=new Set(snapshot.jurisdictions.map(j=>j.key));
  assert.ok(snapshot.parishes.length>1000);
  assert.equal(new Set(snapshot.parishes.map(p=>p.key)).size,snapshot.parishes.length);
  assert.equal(snapshot.source_total,snapshot.parishes.length+snapshot.skipped.length);
  assert.match(snapshot.coverage.toLowerCase(),/parcial/);
  for(const parish of snapshot.parishes){assert.ok(codes.has(parish.municipality_code));assert.ok(jurisdictions.has(parish.jurisdiction));assert.match(parish.source_url,/^https:\/\/portalcdicbr\.cnbb\.org\.br\/igreja\//);}
});
