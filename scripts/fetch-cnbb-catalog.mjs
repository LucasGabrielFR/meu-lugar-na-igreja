import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { normalizeCatalogName, resolveCatalogMunicipality } from './catalog-normalization.mjs';

const api='https://cdic-api.cnbb.org.br/api/v1/portal/';
async function request(path) {
  const response=await fetch(api+path,{signal:AbortSignal.timeout(30000),headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`CNBB ${path}: HTTP ${response.status}; snapshot preservado`);
  return response.json();
}
export function buildCnbbSnapshot(rows, options, municipalities, fetchedAt=new Date().toISOString()) {
  const jurisdictions=options.map(row=>({key:`cnbb:${row.id}`,name:row.name,type:row.name.startsWith('Arquidiocese')?'archdiocese':row.name.startsWith('Diocese')?'diocese':row.name.startsWith('Prelazia')?'prelature':'other',website:`https://portalcdicbr.cnbb.org.br/diocese/${row.id}`}));
  const byName=new Map(jurisdictions.map(j=>[normalizeCatalogName(j.name),j]));
  const parishes=[],skipped=[];
  for(const row of rows) {
    const municipality=resolveCatalogMunicipality(row.location,municipalities);
    const jurisdiction=byName.get(normalizeCatalogName(row.details?.find(d=>d.icon==='diocese')?.value));
    const isParish=Array.isArray(row.types)?row.types.some(type=>normalizeCatalogName(type)==='paroquia'):/^par[oó]quia\b/i.test(row.name);
    const reason=/\bteste\b|demonstracao/.test(normalizeCatalogName(row.name))?'Ficha de teste na fonte institucional':!isParish?'Ficha não classificada explicitamente como paróquia':!municipality?'Município/UF ausente ou sem correspondência inequívoca no IBGE':!jurisdiction?'Circunscrição sem correspondência no diretório CNBB':null;
    if(reason){skipped.push({key:`cnbb:${row.id}`,name:row.name,location:row.location??null,reason});continue;}
    parishes.push({key:`cnbb:${row.id}`,jurisdiction:jurisdiction.key,name:row.name.trim(),municipality_code:municipality.code,source_url:`https://portalcdicbr.cnbb.org.br/igreja/${row.id}`,source_updated_at:null});
  }
  return {fetched_at:fetchedAt,coverage:'Parcial nacional. Todos os resultados da busca pública CNBB por “paroquia”; a busca não comprova que todas as paróquias do Brasil estão cadastradas. Só entram paróquias explícitas com município e circunscrição inequívocos.',source:'https://portalcdicbr.cnbb.org.br/',query:'paroquia',source_total:rows.length,jurisdictions,parishes,skipped};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  let rows=[],options;
  // A saved public response is useful for a reproducible offline rebuild.
  if(process.argv[2]) {
    rows=JSON.parse(readFileSync(process.argv[2],'utf8'));
    options=JSON.parse(readFileSync(process.argv[3],'utf8')).circumscriptions;
  } else {
    options=(await request('circumscriptions/options')).circumscriptions;
    let expected;
    for(let page=1;page<=200;page++) {
      const result=await request('search?'+new URLSearchParams({q:'paroquia',category:'igreja',page:String(page),pageSize:'100'}));
      if(!Array.isArray(result.results)||!Number.isInteger(result.total))throw new Error('Resposta CNBB inválida');
      if(expected!==undefined&&result.total!==expected)throw new Error('Total alterado durante a coleta; execute novamente');
      expected=result.total;rows.push(...result.results);
      console.log(`CNBB ${rows.length}/${expected}`);
      if(!result.hasMore)break;
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    if(rows.length!==expected)throw new Error('Paginação incompleta; snapshot preservado');
  }
  if(!Array.isArray(options)||options.length<250||rows.length<1000||new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('Validação de cobertura CNBB falhou');
  const snapshot=buildCnbbSnapshot(rows,options,JSON.parse(readFileSync('public/data/municipios.json','utf8')));
  if(snapshot.parishes.length<1000)throw new Error('Poucos municípios resolvidos; snapshot preservado');
  mkdirSync('db/catalog',{recursive:true});
  writeFileSync('db/catalog/cnbb-national.json.tmp',JSON.stringify(snapshot,null,2)+'\n');
  renameSync('db/catalog/cnbb-national.json.tmp','db/catalog/cnbb-national.json');
  console.log(JSON.stringify({parishes:snapshot.parishes.length,jurisdictions:options.length,municipalities:new Set(snapshot.parishes.map(p=>p.municipality_code)).size,skipped:snapshot.skipped.length}));
}
