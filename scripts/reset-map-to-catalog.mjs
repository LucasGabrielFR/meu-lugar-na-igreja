import pg from 'pg';
import {mkdirSync,writeFileSync} from 'node:fs';
if(!process.argv.includes('--confirm-remove-all-houses'))throw Error('This one-off operation requires explicit authorization to remove every house.');
const client=new pg.Client();await client.connect();
try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(78123002)');
  await client.query('SELECT pg_advisory_xact_lock(78123003)');
  const backup={created_at:new Date().toISOString(),reason:'User authorized removal of all houses and test-only map records; reset to institutional sources.'};
  for(const table of ['cities','parishes','houses','participation_requests'])backup[table]=(await client.query(`SELECT * FROM ${table}`)).rows;
  mkdirSync('backups',{recursive:true});
  const path=`backups/map-before-cleanup-${Date.now()}.json`;
  writeFileSync(path,JSON.stringify(backup,null,2)+'\n',{flag:'wx',mode:0o600});
  await client.query(`UPDATE participation_requests SET house_id=NULL,status='rejected',reviewed_at=now() WHERE house_id IS NOT NULL`);
  const houses=await client.query('DELETE FROM houses WHERE id>0');
  await client.query(`UPDATE participation_requests SET parish_id=NULL WHERE parish_id IN(SELECT id FROM parishes WHERE catalog_id IS NULL)`);
  const parishes=await client.query(`DELETE FROM parishes WHERE catalog_id IS NULL`);
  // Eliminate empty duplicate map aliases created during the canonical-name reconciliation.
  await client.query(`UPDATE participation_requests SET parish_id=NULL WHERE parish_id IN(SELECT id FROM parishes p WHERE p.catalog_id IS NOT NULL AND EXISTS(SELECT 1 FROM parishes other WHERE other.catalog_id=p.catalog_id AND other.id<p.id))`);
  const duplicates=await client.query(`DELETE FROM parishes p WHERE p.catalog_id IS NOT NULL AND EXISTS(SELECT 1 FROM parishes other WHERE other.catalog_id=p.catalog_id AND other.id<p.id)`);
  const cities=await client.query(`DELETE FROM cities c WHERE NOT EXISTS(SELECT 1 FROM parishes p JOIN parish_catalog pc ON pc.id=p.catalog_id WHERE p.city_code=c.code)`);
  await client.query(`UPDATE parishes p SET description='',active=pc.active FROM parish_catalog pc WHERE pc.id=p.catalog_id`);
  await client.query(`UPDATE cities c SET description='',active=true WHERE EXISTS(SELECT 1 FROM parishes p WHERE p.city_code=c.code AND p.catalog_id IS NOT NULL)`);
  await client.query('COMMIT');
  console.log(JSON.stringify({backup:path,removedHouses:houses.rowCount,removedUnsourcedParishes:parishes.rowCount,removedDuplicateParishes:duplicates.rowCount,removedTestOnlyCities:cities.rowCount}));
}catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
