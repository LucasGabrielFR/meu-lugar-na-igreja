import {normalizeCatalogName,parishIdentity} from './catalog-normalization.mjs';

// Only presentation suffixes and explicit abbreviations are normalized; no fuzzy patron matching.
export function referenceIdentity(name,municipality){
  let value=parishIdentity(String(name).replace(/\([^)]*\)/g,'')).replace(/\bn sra\b|\bnossa sra\b/g,'nossa senhora');
  value=value.replace(/^(?:(?:santuario|basilica|catedral)(?: de)? )+/,'');
  value=value.replace(/\s+\d{4}$/,'');
  const city=normalizeCatalogName(municipality.name);
  if(value.endsWith(' '+city))value=value.slice(0,-city.length).trim();
  return `${municipality.code}:${value}`;
}

export function planReferenceCatalog(snapshot,catalog,municipalities){
  const byCode=new Map(municipalities.map(m=>[m.code,m])),existing=new Map(),groups=new Map(),skipped=[],records=[];
  for(const parish of catalog){const city=byCode.get(parish.municipality_code);if(!city)continue;const key=referenceIdentity(parish.name,city);existing.set(key,[...(existing.get(key)??[]),parish]);}
  for(const row of snapshot.records){
    const city=byCode.get(row.municipality_code);
    if(row.kind!=='parish'||!city){skipped.push({...row,reason:row.kind!=='parish'?'Ficha sem nomenclatura paroquial':'Município não resolvido'});continue;}
    if(!/^acervo:\d+$/.test(row.key)||!/^https:\/\/acervocatolico\.com\/igreja\/[^?#]+-\d+$/.test(row.source_url))throw Error('Referência com identificador ou URL inválidos');
    const key=referenceIdentity(row.name,city);groups.set(key,[...(groups.get(key)??[]),row]);
  }
  for(const [key,rows] of groups){
    const matches=existing.get(key)??[];
    if(rows.length>1||matches.length>1){skipped.push(...rows.map(row=>({...row,reason:'Homônimas ou correspondências múltiplas no mesmo município; revisar antes de vincular'})));continue;}
    records.push({...rows[0],catalog_id:matches[0]?.id??null});
  }
  return {records,skipped};
}

async function reconcileReferenceDuplicates(client,catalog,municipalities){
  const byCode=new Map(municipalities.map(m=>[m.code,m])),groups=new Map();
  for(const row of catalog){const key=referenceIdentity(row.name,byCode.get(row.municipality_code));groups.set(key,[...(groups.get(key)??[]),row]);}
  for(const group of groups.values()){
    const official=group.filter(p=>p.source_kind==='institutional'),references=group.filter(p=>p.source_kind==='reference');
    if(official.length!==1||references.length!==1)continue;
    const duplicate=references[0],target=official[0];
    // Archive only an empty imported duplicate; occupied neighborhoods always need human review.
    const occupied=await client.query('SELECT 1 FROM houses h JOIN parishes p ON p.id=h.parish_id WHERE p.catalog_id=$1 LIMIT 1',[duplicate.id]);
    if(occupied.rowCount)continue;
    await client.query(`UPDATE parish_catalog_sources SET catalog_id=$2 WHERE catalog_id=$1 AND source_kind='reference'`,[duplicate.id,target.id]);
    await client.query('UPDATE parish_catalog SET active=false WHERE id=$1',[duplicate.id]);
    await client.query('UPDATE parishes SET active=false WHERE catalog_id=$1',[duplicate.id]);
  }
}

export async function importReferenceCatalog(client){
  const {readFileSync,existsSync}=await import('node:fs');
  const file='db/reference/national-directory.json';if(!existsSync(file))return;
  const snapshot=JSON.parse(readFileSync(file,'utf8'));
  if(snapshot.source_kind!=='reference'||!Array.isArray(snapshot.records)||!snapshot.records.length)throw Error('Snapshot de referência inválido');
  const municipalities=(await client.query('SELECT code,name,uf FROM municipalities')).rows;
  await reconcileReferenceDuplicates(client,(await client.query('SELECT * FROM parish_catalog')).rows,municipalities);
  const sourceIds=new Map((await client.query('SELECT source_key,catalog_id FROM parish_catalog_sources')).rows.map(r=>[r.source_key,r.catalog_id]));
  const linkedIds=new Set(sourceIds.values());
  const catalog=(await client.query('SELECT * FROM parish_catalog')).rows.filter(p=>p.source_kind==='institutional'||p.active||linkedIds.has(p.id));
  const plan=planReferenceCatalog(snapshot,catalog,municipalities);
  for(const row of plan.records){
    let id=sourceIds.get(row.key)??row.catalog_id;
    if(!id)id=(await client.query(`INSERT INTO parish_catalog(source_key,jurisdiction_id,municipality_code,name,source_url,retrieved_at,source_kind)
      VALUES($1,NULL,$2,$3,$4,$5,'reference') RETURNING id`,[row.key,row.municipality_code,row.name,row.source_url,snapshot.fetched_at])).rows[0].id;
    else await client.query(`UPDATE parish_catalog SET source_url=$2,retrieved_at=$3 WHERE id=$1 AND source_kind='reference'`,[id,row.source_url,snapshot.fetched_at]);
    await client.query(`INSERT INTO parish_catalog_sources(source_key,catalog_id,source_url,retrieved_at,source_kind) VALUES($1,$2,$3,$4,'reference')
      ON CONFLICT(source_key) DO UPDATE SET source_url=EXCLUDED.source_url,retrieved_at=EXCLUDED.retrieved_at`,[row.key,id,row.source_url,snapshot.fetched_at]);
  }
  await client.query(`INSERT INTO catalog_imports(source_key,retrieved_at,description,imported,skipped) VALUES('acervo-reference',$1,$2,$3,$4)
    ON CONFLICT(source_key) DO UPDATE SET retrieved_at=EXCLUDED.retrieved_at,description=EXCLUDED.description,imported=EXCLUDED.imported,skipped=EXCLUDED.skipped`,[snapshot.fetched_at,'Acervo Católico: fonte independente de referência, com diocese em aberto nos novos registros. Correspondências únicas preservam a fonte institucional; homônimas ficam para revisão.',plan.records.length,plan.skipped.length]);
  console.log(`Reference catalog: ${plan.records.length} source records linked/published; ${plan.skipped.length} skipped for classification, geography or ambiguity.`);
}
