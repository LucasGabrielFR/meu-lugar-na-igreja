import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync,renameSync} from 'node:fs';
import {parseReferencePage} from './reference-directory-parser.mjs';
const municipalities=JSON.parse(readFileSync('public/data/municipios.json','utf8'));
mkdirSync('.cache/reference-pages',{recursive:true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function getPage(page){
  const path=`.cache/reference-pages/${page}.json`;
  if(existsSync(path)&&Date.now()-statSync(path).mtimeMs<86400000&&!process.argv.includes('--refresh'))return JSON.parse(readFileSync(path,'utf8'));
  for(let attempt=0;attempt<3;attempt++){
    try{const url=page===1?'https://acervocatolico.com/igrejas/':`https://acervocatolico.com/igrejas/pagina/${page}`;
      const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(response.status===429){console.log('Fonte limitou a coleta; aguardando 30 segundos.');await pause(30000);throw Error('Limite da fonte');}
      if(!response.ok)throw Error(`Referência HTTP ${response.status}`);
      const result=parseReferencePage(await response.text(),municipalities);
      if(!result.records.length||result.pages>5000)throw Error('Página sem fichas reconhecidas; coleta interrompida');
      const snapshot={retrieved_at:new Date().toISOString(),...result};
      writeFileSync(path+'.tmp',JSON.stringify(snapshot));renameSync(path+'.tmp',path);
      await pause(400);return snapshot;
    }catch(error){if(attempt===2)throw error;await pause(2000*(attempt+1));}
  }
}
const first=await getPage(1),records=[],ids=new Set();let duplicates=0;
for(let page=1;page<=first.pages;page++){
  const result=page===1?first:await getPage(page);
  if(page!==first.pages&&result.records.length!==10)throw Error('Paginação alterada na fonte; revisar antes de publicar');
  for(const row of result.records){if(ids.has(row.key)){duplicates++;continue;}ids.add(row.key);records.push(row);}
  if(page%25===0||page===first.pages)console.log(`Referência ${page}/${first.pages}; ${records.length} fichas; ${records.filter(r=>r.kind==='parish').length} nomes paroquiais`);
}
const snapshot={fetched_at:new Date().toISOString(),source:'https://acervocatolico.com/igrejas/',source_kind:'reference',coverage:'Diretório independente de referência. A nomenclatura não comprova estatuto canônico nem vínculo diocesano; não se declara cobertura integral do Brasil.',pages:first.pages,duplicates,records};
if(records.length<8000)throw Error('Poucas fichas para a cobertura esperada; snapshot anterior preservado');
mkdirSync('db/reference',{recursive:true});writeFileSync('db/reference/national-directory.json.tmp',JSON.stringify(snapshot,null,2)+'\n');renameSync('db/reference/national-directory.json.tmp','db/reference/national-directory.json');
console.log(JSON.stringify({records:records.length,parishes:records.filter(r=>r.kind==='parish'&&r.municipality_code).length,unresolved:records.filter(r=>r.kind==='parish'&&!r.municipality_code).length,duplicates}));
