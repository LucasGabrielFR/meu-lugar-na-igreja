import { readFileSync, existsSync } from 'node:fs';

export async function importParishCatalog(client) {
  const path = 'db/catalog/parishes.json';
  if (!existsSync(path)) return;
  const snapshot = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(snapshot.parishes) || !snapshot.parishes.length) throw new Error('Invalid parish snapshot');
  await client.query('BEGIN');
  try {
    for (const jurisdiction of snapshot.jurisdictions) {
      await client.query(`INSERT INTO ecclesiastical_jurisdictions(source_key,name,type,website) VALUES($1,$2,$3,$4)
        ON CONFLICT(source_key) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,website=EXCLUDED.website`,
      [jurisdiction.key,jurisdiction.name,jurisdiction.type,jurisdiction.website]);
    }
    await client.query(`INSERT INTO parish_catalog(source_key,jurisdiction_id,municipality_code,name,source_url,source_updated_at,retrieved_at)
      SELECT p.key,j.id,p.municipality_code,p.name,p.source_url,p.source_updated_at,$2::timestamptz
      FROM jsonb_to_recordset($1::jsonb) AS p(key text,jurisdiction text,municipality_code integer,name text,source_url text,source_updated_at timestamptz)
      JOIN ecclesiastical_jurisdictions j ON j.source_key=p.jurisdiction
      ON CONFLICT(source_key) DO UPDATE SET municipality_code=EXCLUDED.municipality_code,name=EXCLUDED.name,
        source_url=EXCLUDED.source_url,source_updated_at=EXCLUDED.source_updated_at,retrieved_at=EXCLUDED.retrieved_at`,
    [JSON.stringify(snapshot.parishes),snapshot.fetched_at]);
    // Only attach an unambiguous exact match; existing names, slots and visibility are preserved.
    await client.query(`UPDATE parishes p SET catalog_id=matches.id FROM (
      SELECT municipality_code,lower(name) name,min(id) id FROM parish_catalog WHERE active GROUP BY municipality_code,lower(name) HAVING count(*)=1
    ) matches WHERE p.catalog_id IS NULL AND p.city_code=matches.municipality_code AND lower(p.name)=matches.name`);
    await client.query('COMMIT');
    console.log(`Official parish catalog imported: ${snapshot.parishes.length} records (${snapshot.jurisdictions.length} jurisdictions).`);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
