import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync} from 'node:fs';
import {buildCnbbSnapshot} from './fetch-cnbb-catalog.mjs';
const api='https://cdic-api.cnbb.org.br/api/v1/portal/';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(path){for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(api+path,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json();}catch(error){if(attempt===2)throw error;await pause(1500*(attempt+1));}}}
mkdirSync('.cache',{recursive:true});
const checkpoint='.cache/cnbb-inventory.json';
const options=(await request('circumscriptions/options')).circumscriptions;
if(!Array.isArray(options)||options.length<250)throw Error('Diretório de circunscrições inválido');
const saved=existsSync(checkpoint)?JSON.parse(readFileSync(checkpoint,'utf8')):{};
let completed=0;
for(const option of options){
  if(saved[option.id]&&(process.argv.includes('--refresh')||Date.parse(saved[option.id].retrieved_at)<Date.now()-86400000))delete saved[option.id];
  if(!saved[option.id]){
    const j=await request('diocese/'+option.id);
    if(!Array.isArray(j.churches)||j.circumscription?.id!==option.id)throw Error(`Ficha inválida: ${option.name}`);
    // Discard personal information, images and biographies from the public response.
    saved[option.id]={id:option.id,name:option.name,retrieved_at:new Date().toISOString(),reported_parishes:j.demographics?.parishesCount??null,churches:j.churches.map(c=>({id:c.id,name:c.name,types:c.types,city:c.city,uf:c.uf}))};
    writeFileSync(checkpoint+'.tmp',JSON.stringify(saved));renameSync(checkpoint+'.tmp',checkpoint);
    await pause(350);
  }
  completed++;
  if(completed%10===0||completed===options.length)console.log(`CNBB inventário ${completed}/${options.length}`);
}
const rows=options.flatMap(option=>saved[option.id].churches.map(c=>({...c,location:c.city&&c.uf?`${c.city}-${c.uf}`:null,details:[{icon:'diocese',value:option.name}]})));
if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Igrejas repetidas entre circunscrições; revisar antes de importar');
const snapshot=buildCnbbSnapshot(rows,options,JSON.parse(readFileSync('public/data/municipios.json','utf8')));
snapshot.coverage='Inventário parcial nacional: todas as circunscrições públicas CNBB consultadas. Apenas entidades classificadas como Paróquia pela fonte e município inequívoco. Diretórios vazios e fichas incompletas não significam ausência real de paróquias.';
snapshot.query='diocese/:id — classificação institucional';
snapshot.inventory=options.map(option=>{const row=saved[option.id];return {key:`cnbb:${row.id}`,name:row.name,retrieved_at:row.retrieved_at,churches:row.churches.length,reported_parishes:row.reported_parishes};});
if(snapshot.parishes.length<1800)throw Error('Cobertura inferior ao snapshot anterior; revisar');
writeFileSync('db/catalog/cnbb-national.json.tmp',JSON.stringify(snapshot,null,2)+'\n');renameSync('db/catalog/cnbb-national.json.tmp','db/catalog/cnbb-national.json');
console.log(JSON.stringify({parishes:snapshot.parishes.length,circumscriptions:options.length,withChurches:snapshot.inventory.filter(j=>j.churches>0).length,skipped:snapshot.skipped.length}));
