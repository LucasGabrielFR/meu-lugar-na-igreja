import {existsSync,readFileSync} from 'node:fs';
export function loadParishResolutions(){
  const path='db/catalog/parish-resolutions.json';
  return existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{merges:[],corrections:[],reviews:[]};
}
export function validateMerge(a,b){
  if(a.id===b.id)throw Error('Conciliação aponta para o próprio registro');
  if(a.municipality_code!==b.municipality_code)throw Error('Conciliação entre municípios diferentes');
  if(a.jurisdiction_id&&b.jurisdiction_id&&a.jurisdiction_id!==b.jurisdiction_id)throw Error('Dioceses diferentes exigem revisão');
}
export async function applyParishResolutions(client,resolutions=loadParishResolutions()){
  for(const correction of resolutions.corrections){
    const row=(await client.query('SELECT * FROM parish_catalog WHERE source_key=$1',[correction.source_key])).rows[0];if(!row)continue;
    if(correction.municipality_code&&row.municipality_code!==correction.municipality_code){
      const occupied=await client.query('SELECT 1 FROM houses h JOIN parishes p ON p.id=h.parish_id WHERE p.catalog_id=$1 LIMIT 1',[row.id]);
      if(occupied.rowCount)throw Error('Correção geográfica com moradores exige transferência específica');
      await client.query('INSERT INTO cities(code) VALUES($1) ON CONFLICT DO NOTHING',[correction.municipality_code]);
      const neighborhoods=(await client.query('SELECT id FROM parishes WHERE catalog_id=$1 ORDER BY id',[row.id])).rows;
      for(const p of neighborhoods)await client.query(`UPDATE parishes SET city_code=$2,slot=(SELECT coalesce(max(slot)+1,0) FROM parishes WHERE city_code=$2) WHERE id=$1`,[p.id,correction.municipality_code]);
    }
    await client.query('UPDATE parish_catalog SET name=coalesce($2,name),municipality_code=coalesce($3,municipality_code) WHERE id=$1',[row.id,correction.name??null,correction.municipality_code??null]);
    if(correction.name)await client.query('UPDATE parishes SET name=$2 WHERE catalog_id=$1',[row.id,correction.name]);
  }
  for(const merge of resolutions.merges){
    const target=(await client.query('SELECT * FROM parish_catalog WHERE source_key=$1',[merge.canonical_key])).rows[0];
    const duplicate=(await client.query('SELECT * FROM parish_catalog WHERE source_key=$1',[merge.duplicate_key])).rows[0];
    if(!target||!duplicate)continue;
    validateMerge(target,duplicate);
    const redirect=(await client.query('SELECT canonical_id FROM parish_catalog_redirects WHERE duplicate_id=$1',[duplicate.id])).rows[0];
    if(redirect&&redirect.canonical_id!==target.id)throw Error('Redirecionamento conflitante');
    const neighborhoods=(await client.query('SELECT * FROM parishes WHERE catalog_id=ANY($1::int[]) ORDER BY id',[[target.id,duplicate.id]])).rows;
    let kept=neighborhoods.find(p=>p.catalog_id===target.id&&p.active)??neighborhoods.find(p=>p.catalog_id===target.id);
    if(!kept){kept=neighborhoods.find(p=>p.catalog_id===duplicate.id);if(kept)await client.query('UPDATE parishes SET catalog_id=$2 WHERE id=$1',[kept.id,target.id]);}
    for(const p of neighborhoods.filter(p=>p.catalog_id===duplicate.id&&p.id!==kept?.id)){
      const houses=(await client.query('SELECT id FROM houses WHERE parish_id=$1 ORDER BY slot,id',[p.id])).rows;
      let slot=kept?(await client.query('SELECT coalesce(max(slot)+1,0)::int slot FROM houses WHERE parish_id=$1',[kept.id])).rows[0].slot:0;
      for(const house of houses)await client.query('UPDATE houses SET parish_id=$2,slot=$3 WHERE id=$1',[house.id,kept.id,slot++]);
      if(kept)await client.query('UPDATE participation_requests SET parish_id=$2 WHERE parish_id=$1',[p.id,kept.id]);
      // Preserve archived identities while allowing the canonical neighborhood to use the full name.
      await client.query('UPDATE parishes SET active=false,name=$2 WHERE id=$1',[p.id,`${p.name.replace(/ · duplicata arquivada #\d+$/,'')} · duplicata arquivada #${p.id}`]);
    }
    await client.query('UPDATE parish_catalog_sources SET catalog_id=$2 WHERE catalog_id=$1',[duplicate.id,target.id]);
    await client.query(`INSERT INTO parish_catalog_sources(source_key,catalog_id,source_url,retrieved_at,source_kind) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(source_key) DO UPDATE SET catalog_id=EXCLUDED.catalog_id`,[duplicate.source_key,target.id,duplicate.source_url,duplicate.retrieved_at,duplicate.source_kind]);
    await client.query('UPDATE parish_catalog SET active=false WHERE id=$1',[duplicate.id]);
    await client.query('UPDATE parish_catalog SET name=$2 WHERE id=$1',[target.id,merge.name]);
    if(kept)await client.query('UPDATE parishes SET name=$2 WHERE id=$1',[kept.id,merge.name]);
    await client.query(`INSERT INTO parish_catalog_redirects(duplicate_id,canonical_id,reason,evidence) VALUES($1,$2,$3,$4) ON CONFLICT(duplicate_id) DO NOTHING`,[duplicate.id,target.id,merge.reason,JSON.stringify(merge.evidence)]);
    if(!redirect)await client.query(`INSERT INTO audit_log(action,entity,entity_id) VALUES('reconcile','parish_catalog',$1)`,[`${duplicate.id}->${target.id}`]);
  }
}
