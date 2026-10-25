import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseFlorianopolis,parseAracaju,resolveDirectoryAddress} from '../scripts/diocesan-expansion-parser.mjs';
import {parseReferencePage} from '../scripts/reference-directory-parser.mjs';
const municipalities=JSON.parse(readFileSync('public/data/municipios.json','utf8'));

test('official municipal groups exclude conflicting reitoria classification and do not leak the last city',()=>{
  const html=`<p><strong style="color:#800000">Florianópolis</strong></p>
    <p><a href="https://arquifln.org.br/igrejas/one/">Paróquia São José</a>
    <a title="Reitoria da Igreja" href="https://arquifln.org.br/igrejas/two/">Paróquia Santa Catarina</a></p>
    <p><strong style="color:#800000">Município não reconhecido</strong></p>
    <p><a href="https://arquifln.org.br/igrejas/three/">Paróquia Santo Antônio</a></p>`;
  const result=parseFlorianopolis(html,municipalities);
  assert.equal(result.parishes.length,1);assert.equal(result.parishes[0].municipality_code,4205407);assert.equal(result.skipped.length,2);
});

test('Aracaju directory uses terminal city instead of a municipality appearing in the patron name',()=>{
  const result=parseAracaju(`<a href="https://arquidiocesedearacaju.org/paroquias/one">PARÓQUIA SÃO CRISTÓVÃO – NOSSA SENHORA DAS DORES-SE</a>
    <a href="https://arquidiocesedearacaju.org/paroquias/two">PARÓQUIA TESTEMUNHO – BAIRRO, ARACAJU/SE</a>
    <a href="https://arquidiocesedearacaju.org/paroquias/three">SANTUÁRIO SÃO JOSÉ – ARACAJU-SE</a>`,municipalities);
  assert.equal(result.parishes.length,2);assert.equal(result.parishes[0].municipality_code,2804607);assert.equal(result.parishes[1].municipality_code,2800308);
  assert.equal(resolveDirectoryAddress('São José, Nobres 78470000',municipalities,['MT'])[0].code,5105903);
  assert.equal(resolveDirectoryAddress('Nova Califórnia, Rondônia',municipalities,['AC','RO','AM']).length,0);
});

test('independent directory preserves provenance, separates chapels and stores no contacts',()=>{
  const card=(id,name,city)=>`<div class='posts mb'><a href="https://acervocatolico.com/igreja/example-${id}"><h2><strong>${name}</strong></h2></a><p>(11) 1234-5678</p><p>Rua Particular, 123</p><p>${city}</p></div>`;
  const parsed=parseReferencePage(card(1,'Paróquia São José','São Paulo - SP')+card(2,'Capela Santa Maria','São Paulo - SP')+card(3,'Paróquia São João','Cidade indefinida - SP')+`<a href="/igrejas/pagina/1031">1031</a>`,municipalities);
  assert.equal(parsed.pages,1031);assert.equal(parsed.records[0].municipality_code,3550308);assert.equal(parsed.records[0].kind,'parish');
  assert.equal(parsed.records[1].kind,'other');assert.equal(parsed.records[2].municipality_code,null);
  assert.doesNotMatch(JSON.stringify(parsed),/1234-5678|Rua Particular/);assert.equal(parsed.records[0].key,'acervo:1');
});

test('official expansion contains only resolved municipalities, known jurisdictions and unique sources',()=>{
  const snapshot=JSON.parse(readFileSync('db/catalog/diocesan-expansion.json','utf8'));
  const codes=new Set(municipalities.map(m=>m.code)),jurisdictions=new Set(snapshot.jurisdictions.map(j=>j.key));
  assert.ok(snapshot.parishes.length>=200);assert.equal(new Set(snapshot.parishes.map(p=>p.key)).size,snapshot.parishes.length);
  for(const row of snapshot.parishes){assert.ok(codes.has(row.municipality_code));assert.ok(jurisdictions.has(row.jurisdiction));assert.match(row.source_url,/^https:\/\//);}
  const importer=readFileSync('scripts/import-parish-catalog.mjs','utf8');
  assert.match(importer,/diocesan-expansion\.json/);assert.match(importer,/importReferenceCatalog\(client\)/);
});
