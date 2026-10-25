import {normalizeCatalogName,parishIdentity} from './catalog-normalization.mjs';
import {loadParishResolutions} from './parish-reconciliation.mjs';

// Only presentation suffixes and explicit abbreviations are normalized; no fuzzy patron matching.
export function referenceIdentity(name,municipality){
  let value=parishIdentity(String(name).replace(/\([^)]*\)/g,'')).replace(/\bn sra\b|\bnossa sra\b/g,'nossa senhora');
  value=value.replace(/^(?:(?:santuario|basilica|catedral)(?: de)? )+/,'');
  value=value.replace(/\s+\d{4}$/,'');
  const city=normalizeCatalogName(municipality.name);
  if(value.endsWith(' '+city))value=value.slice(0,-city.length).trim();
  return `${municipality.code}:${value}`;
}

export function reviewName(name){return normalizeCatalogName(name.replace(/\([^)]*\)/g,'')).replace(/^paroquia\s*/,'').replace(/\bn sra\b|\bn s\b|\bns\b|\bnossa sra\b/g,'nossa senhora').replace(/\bsta\b/g,'santa').replace(/\bsto\b/g,'santo').replace(/\bs\b/g,'sao').replace(/\bfco\b/g,'francisco').replace(/\b(?:de|do|da|das|dos)\b/g,'').replace(/\s+/g,' ').trim();}
function nearName(a,b){
  if(a===b)return true;
  if(Math.min(a.length,b.length)<12||Math.abs(a.length-b.length)>2)return false;
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));previous=next;}
  return previous[b.length]<=2&&previous[b.length]/Math.max(a.length,b.length)<=.1;
}
export function planReferenceCatalog(snapshot,catalog,municipalities,knownSourceKeys=new Set(),resolutions=loadParishResolutions()){
  const byCode=new Map(municipalities.map(m=>[m.code,m])),existing=new Map(),groups=new Map(),skipped=[],records=[];
  for(const parish of catalog){const city=byCode.get(parish.municipality_code);if(!city||parish.active===false)continue;const key=referenceIdentity(parish.name,city);existing.set(key,[...(existing.get(key)??[]),parish]);}
  for(const row of snapshot.records){
    const city=byCode.get(row.municipality_code);
    if(row.kind!=='parish'||!city){skipped.push({...row,reason:row.kind!=='parish'?'Ficha sem nomenclatura paroquial':'Município não resolvido'});continue;}
    if(!/^acervo:\d+$/.test(row.key)||!/^https:\/\/acervocatolico\.com\/igreja\/[^?#]+-\d+$/.test(row.source_url))throw Error('Referência com identificador ou URL inválidos');
    const key=referenceIdentity(row.name,city);groups.set(key,[...(groups.get(key)??[]),row]);
  }
  for(const [key,rows] of groups){
    const matches=existing.get(key)??[];
    const reviewed=rows.length===1?resolutions.merges.find(m=>m.municipality_code===rows[0].municipality_code&&m.duplicate_key===rows[0].key):null;
    const canonical=reviewed?catalog.find(p=>p.source_key===reviewed.canonical_key):null;
    if(canonical){records.push({...rows[0],catalog_id:canonical.id});continue;}
    if(rows.length>1||matches.length>1){skipped.push(...rows.map(row=>({...row,reason:'Homônimas ou correspondências múltiplas no mesmo município; revisar antes de vincular'})));continue;}
    if(!matches.length&&!knownSourceKeys.has(rows[0].key)){
      const normalized=reviewName(rows[0].name),candidates=catalog.filter(p=>p.active!==false&&p.municipality_code===rows[0].municipality_code&&nearName(normalized,reviewName(p.name)));
      if(candidates.length){skipped.push({...rows[0],reason:'Possível variação de nome; revisar as fontes antes de publicar outro bairro.',candidates:candidates.map(p=>p.id)});continue;}
    }
    records.push({...rows[0],catalog_id:matches[0]?.id??null});
  }
  return {records,skipped};
}

export async function importReferenceCatalog(client){
  const {readFileSync,existsSync}=await import('node:fs');
  const file='db/reference/national-directory.json';if(!existsSync(file))return;
  const snapshot=JSON.parse(readFileSync(file,'utf8'));
  if(snapshot.source_kind!=='reference'||!Array.isArray(snapshot.records)||!snapshot.records.length)throw Error('Snapshot de referência inválido');
  const municipalities=(await client.query('SELECT code,name,uf FROM municipalities')).rows;
  const sourceIds=new Map((await client.query('SELECT source_key,catalog_id FROM parish_catalog_sources')).rows.map(r=>[r.source_key,r.catalog_id]));
  const linkedIds=new Set(sourceIds.values());
  const catalog=(await client.query('SELECT * FROM parish_catalog')).rows.filter(p=>p.source_kind==='institutional'||p.active||linkedIds.has(p.id));
  const plan=planReferenceCatalog(snapshot,catalog,municipalities,new Set([...sourceIds.keys(),...(loadParishResolutions().retained_source_keys??[])]));
  for(const row of plan.skipped.filter(r=>r.candidates?.length))await client.query(`INSERT INTO parish_catalog_review_queue(source_key,municipality_code,name,source_url,candidates,reason) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(source_key) DO UPDATE SET candidates=EXCLUDED.candidates,reason=EXCLUDED.reason,updated_at=now(),resolved_at=NULL`,[row.key,row.municipality_code,row.name,row.source_url,JSON.stringify(row.candidates),row.reason]);
  for(const row of plan.records){
    let id=sourceIds.get(row.key)??row.catalog_id;
    if(!id)id=(await client.query(`INSERT INTO parish_catalog(source_key,jurisdiction_id,municipality_code,name,source_url,retrieved_at,source_kind)
      VALUES($1,NULL,$2,$3,$4,$5,'reference') RETURNING id`,[row.key,row.municipality_code,row.name,row.source_url,snapshot.fetched_at])).rows[0].id;
    else await client.query(`UPDATE parish_catalog SET source_url=$2,retrieved_at=$3 WHERE id=$1 AND source_kind='reference'`,[id,row.source_url,snapshot.fetched_at]);
    await client.query(`INSERT INTO parish_catalog_sources(source_key,catalog_id,source_url,retrieved_at,source_kind) VALUES($1,$2,$3,$4,'reference')
      ON CONFLICT(source_key) DO UPDATE SET source_url=EXCLUDED.source_url,retrieved_at=EXCLUDED.retrieved_at`,[row.key,id,row.source_url,snapshot.fetched_at]);
  }
  await client.query('UPDATE parish_catalog_review_queue q SET resolved_at=now() FROM parish_catalog_sources s WHERE q.source_key=s.source_key AND q.resolved_at IS NULL');
  await client.query(`INSERT INTO catalog_imports(source_key,retrieved_at,description,imported,skipped) VALUES('acervo-reference',$1,$2,$3,$4)
    ON CONFLICT(source_key) DO UPDATE SET retrieved_at=EXCLUDED.retrieved_at,description=EXCLUDED.description,imported=EXCLUDED.imported,skipped=EXCLUDED.skipped`,[snapshot.fetched_at,'Acervo Católico: fonte independente de referência, com diocese em aberto nos novos registros. Correspondências únicas preservam a fonte institucional; homônimas ficam para revisão.',plan.records.length,plan.skipped.length]);
  console.log(`Reference catalog: ${plan.records.length} source records linked/published; ${plan.skipped.length} skipped for classification, geography or ambiguity.`);
}
