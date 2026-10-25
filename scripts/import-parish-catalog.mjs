import { readFileSync, existsSync } from 'node:fs';
import { normalizeCatalogName, parishIdentity } from './catalog-normalization.mjs';
import {importReferenceCatalog,referenceIdentity} from './reference-catalog.mjs';
import {applyParishResolutions,loadParishResolutions} from './parish-reconciliation.mjs';

export async function importParishCatalog(client) {
  const snapshots=['parishes.json','cnbb-national.json','diocesan-directories.json','diocesan-expansion.json'].filter(name=>existsSync(`db/catalog/${name}`)).map(name=>({name,...JSON.parse(readFileSync(`db/catalog/${name}`,'utf8'))}));
  if(!snapshots.length)return;
  for(const snapshot of snapshots)if(!Array.isArray(snapshot.parishes)||!snapshot.parishes.length)throw new Error(`Invalid parish snapshot: ${snapshot.name}`);
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(78123002)');
    const resolutions=loadParishResolutions();
    await applyParishResolutions(client,resolutions);
    const reviewedKeys=new Set(resolutions.merges.map(m=>m.duplicate_key));
    const jurisdictionByName=new Map((await client.query('SELECT * FROM ecclesiastical_jurisdictions ORDER BY id')).rows.map(j=>[normalizeCatalogName(j.name),j]));
    const existing=(await client.query('SELECT * FROM parish_catalog ORDER BY id')).rows;
    const identity=p=>`${p.municipality_code}:${p.jurisdiction_id}:${parishIdentity(p.name)}`;
    const byIdentity=new Map();
    for(const parish of existing)byIdentity.set(identity(parish),[...(byIdentity.get(identity(parish))??[]),parish]);
    const bySource=new Map(existing.map(p=>[p.source_key,p]));
    const byId=new Map(existing.map(p=>[p.id,p]));
    const municipalities=new Map((await client.query('SELECT code,name FROM municipalities')).rows.map(m=>[m.code,m]));
    const references=new Map();
    for(const row of existing.filter(p=>p.source_kind==='reference')){
      const key=referenceIdentity(row.name,municipalities.get(row.municipality_code));
      references.set(key,[...(references.get(key)??[]),row]);
    }
    for(const source of (await client.query('SELECT source_key,catalog_id FROM parish_catalog_sources')).rows)bySource.set(source.source_key,byId.get(source.catalog_id));
    for(const snapshot of snapshots) {
      const jurisdictionIds=new Map();
      for(const jurisdiction of snapshot.jurisdictions) {
        let stored=jurisdictionByName.get(normalizeCatalogName(jurisdiction.name));
        if(!stored) {
          stored=(await client.query(`INSERT INTO ecclesiastical_jurisdictions(source_key,name,type,website) VALUES($1,$2,$3,$4) RETURNING *`,[jurisdiction.key,jurisdiction.name,jurisdiction.type,jurisdiction.website])).rows[0];
          jurisdictionByName.set(normalizeCatalogName(stored.name),stored);
        }
        jurisdictionIds.set(jurisdiction.key,stored.id);
      }
      for(const check of snapshot.inventory??[])await client.query('UPDATE ecclesiastical_jurisdictions SET catalog_checked_at=$2,source_churches_count=$3 WHERE id=$1',[jurisdictionIds.get(check.key),check.retrieved_at,check.churches]);
      if(snapshot.withdrawn_keys?.length){
        await client.query(`UPDATE parish_catalog pc SET active=false WHERE pc.source_key=ANY($1::text[]) AND NOT EXISTS(SELECT 1 FROM parishes p JOIN houses h ON h.parish_id=p.id WHERE p.catalog_id=pc.id)`,[snapshot.withdrawn_keys]);
        await client.query(`UPDATE parishes p SET active=false FROM parish_catalog pc WHERE pc.id=p.catalog_id AND pc.source_key=ANY($1::text[]) AND NOT pc.active`,[snapshot.withdrawn_keys]);
      }
      for(const parish of snapshot.parishes) {
        const jurisdictionId=jurisdictionIds.get(parish.jurisdiction);
        if(!jurisdictionId)throw new Error(`Unknown jurisdiction: ${parish.key}`);
        const naturalKey=identity({...parish,jurisdiction_id:jurisdictionId});
        const provider=parish.key.split(':')[0];
        let stored=bySource.get(parish.key);
        if(stored&&stored.source_key!==parish.key&&stored.source_key.split(':')[0]===provider&&!reviewedKeys.has(parish.key))stored=null;
        const crossSource=(byIdentity.get(naturalKey)??[]).filter(p=>p.source_key.split(':')[0]!==provider);
        if(!stored&&crossSource.length===1)stored=crossSource[0];
        if(!stored){
          const candidateKey=referenceIdentity(parish.name,municipalities.get(parish.municipality_code));
          const referenceMatches=(references.get(candidateKey)??[]).filter(p=>p.source_kind==='reference');
          if(referenceMatches.length===1){
            stored=referenceMatches[0];
            await client.query(`UPDATE parish_catalog SET jurisdiction_id=$2,name=$3,source_url=$4,retrieved_at=$5,source_kind='institutional' WHERE id=$1`,[stored.id,jurisdictionId,parish.name,parish.source_url,snapshot.fetched_at]);
            Object.assign(stored,{jurisdiction_id:jurisdictionId,name:parish.name,source_url:parish.source_url,source_kind:'institutional'});
            byIdentity.set(naturalKey,[...(byIdentity.get(naturalKey)??[]),stored]);
          }
        }
        if(!stored) {
          stored=(await client.query(`INSERT INTO parish_catalog(source_key,jurisdiction_id,municipality_code,name,source_url,source_updated_at,retrieved_at)
            VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[parish.key,jurisdictionId,parish.municipality_code,parish.name,parish.source_url,parish.source_updated_at,snapshot.fetched_at])).rows[0];
          byIdentity.set(naturalKey,[...(byIdentity.get(naturalKey)??[]),stored]);
        } else if(stored.source_key===parish.key) {
          await client.query(`UPDATE parish_catalog SET name=$2,source_url=$3,source_updated_at=$4,retrieved_at=$5 WHERE id=$1`,[stored.id,parish.name,parish.source_url,parish.source_updated_at,snapshot.fetched_at]);
        }
        bySource.set(parish.key,stored);
        await client.query(`INSERT INTO parish_catalog_sources(source_key,catalog_id,source_url,retrieved_at) VALUES($1,$2,$3,$4)
          ON CONFLICT(source_key) DO UPDATE SET catalog_id=EXCLUDED.catalog_id,source_url=EXCLUDED.source_url,retrieved_at=EXCLUDED.retrieved_at`,[parish.key,stored.id,parish.source_url,snapshot.fetched_at]);
      }
      await client.query(`INSERT INTO catalog_imports(source_key,retrieved_at,description,imported,skipped) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(source_key) DO UPDATE SET retrieved_at=EXCLUDED.retrieved_at,description=EXCLUDED.description,imported=EXCLUDED.imported,skipped=EXCLUDED.skipped`,[snapshot.name,snapshot.fetched_at,snapshot.coverage,snapshot.parishes.length,snapshot.skipped?.length??0]);
    }
    await importReferenceCatalog(client);
    await applyParishResolutions(client,resolutions);
    // Import creates empty neighborhoods but respects administrator archives and existing houses.
    await client.query(`INSERT INTO cities(code) SELECT DISTINCT municipality_code FROM parish_catalog WHERE active ON CONFLICT DO NOTHING`);
    const virtual=(await client.query(`SELECT p.id,p.city_code,p.name,p.catalog_id,p.active,
      (SELECT count(*)::int FROM houses h WHERE h.parish_id=p.id) houses FROM parishes p ORDER BY p.id`)).rows;
    const catalog=(await client.query('SELECT * FROM parish_catalog WHERE active ORDER BY municipality_code,id')).rows;
    const linked=new Set(virtual.map(p=>p.catalog_id).filter(Boolean));
    const virtualByName=new Map();
    for(const parish of virtual) {
      const key=`${parish.city_code}:${parishIdentity(parish.name)}`;
      virtualByName.set(key,[...(virtualByName.get(key)??[]),parish]);
    }
    // A newly imported empty duplicate may have used a canonical spelling of an existing community.
    // Keep the old community and all its houses; archive only the empty catalog-linked duplicate.
    for(const matches of virtualByName.values()) {
      if(matches.length!==2)continue;
      const old=matches.find(p=>!p.catalog_id),imported=matches.find(p=>p.catalog_id);
      if(!old||!imported||imported.houses||old.id>imported.id)continue;
      await client.query('UPDATE parishes SET catalog_id=$2 WHERE id=$1',[old.id,imported.catalog_id]);
      await client.query('UPDATE parishes SET active=false WHERE id=$1',[imported.id]);
      old.catalog_id=imported.catalog_id;
    }
    for(const parish of catalog) {
      if(linked.has(parish.id))continue;
      const key=`${parish.municipality_code}:${parishIdentity(parish.name)}`,matches=virtualByName.get(key)??[];
      if(matches.length===1&&!matches[0].catalog_id) {
        await client.query('UPDATE parishes SET catalog_id=$2 WHERE id=$1',[matches[0].id,parish.id]);matches[0].catalog_id=parish.id;
      } else if(!matches.length||matches.every(p=>p.catalog_id&&p.catalog_id!==parish.id)) {
        // Names can repeat within a municipality (e.g. São Judas Tadeu in two São Paulo regions).
        // Preserve the canonical catalog name; distinguish only its virtual neighborhood label.
        const region=new URL(parish.source_url).pathname.split('/').find(segment=>segment.startsWith('regiao-'));
        const suffix=region?'Região '+region.slice(7).split('-').map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' '):`referência ${parish.id}`;
        const name=matches.length?`${parish.name} · ${suffix}`:parish.name;
        const created=(await client.query(`INSERT INTO parishes(city_code,name,slot,catalog_id)
          SELECT $1,$2,COALESCE(max(slot)+1,0),$3 FROM parishes WHERE city_code=$1 RETURNING id,city_code,name,catalog_id`,[parish.municipality_code,name,parish.id])).rows[0];
        virtualByName.set(key,[...matches,created]);
      }
    }
    await client.query('COMMIT');
    console.log(`Parish catalog: ${catalog.length} parishes, ${jurisdictionByName.size} jurisdictions. Map neighborhoods synchronized; houses and archived visibility preserved.`);
  } catch(error) {await client.query('ROLLBACK');throw error;}
}
