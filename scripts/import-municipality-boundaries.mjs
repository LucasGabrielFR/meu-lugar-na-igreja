import {existsSync,readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {geographicPath} from '../src/lib/map-territories.mjs';
export async function importMunicipalityBoundaries(client){
  const path='db/geography/municipality-boundaries.geojson.gz';if(!existsSync(path))return;
  const file=readFileSync(path),checksum=createHash('sha256').update(file).digest('hex');
  const current=(await client.query("SELECT checksum FROM geography_imports WHERE source_key='ibge-municipality-boundaries'")).rows[0];
  if(current?.checksum===checksum)return;
  const metadata=JSON.parse(readFileSync('db/geography/municipality-boundaries.source.json','utf8')),collection=JSON.parse(gunzipSync(file));
  const known=new Set((await client.query('SELECT code FROM municipalities')).rows.map(m=>m.code)),codes=new Set();
  await client.query('BEGIN');
  try{
    let batch=[];
    const flush=async()=>{if(!batch.length)return;await client.query(`INSERT INTO municipality_boundaries(code,geometry,path,bounds,source_url,retrieved_at)
      SELECT code,geometry,path,bounds,$2,$3 FROM jsonb_to_recordset($1::jsonb) AS r(code integer,geometry jsonb,path text,bounds double precision[])
      ON CONFLICT(code) DO UPDATE SET geometry=EXCLUDED.geometry,path=EXCLUDED.path,bounds=EXCLUDED.bounds,source_url=EXCLUDED.source_url,retrieved_at=EXCLUDED.retrieved_at`,[JSON.stringify(batch),metadata.source_url,metadata.retrieved_at]);batch=[];};
    for(const feature of collection.features){const code=Number(feature.properties?.codarea);if(!known.has(code))throw Error('Malha sem município conhecido: '+code);if(codes.has(code))throw Error('Malha municipal repetida: '+code);codes.add(code);batch.push({code,geometry:feature.geometry,...geographicPath({features:[feature]})});if(batch.length===100)await flush();}
    await flush();
    if(codes.size!==metadata.features)throw Error('Quantidade de malhas incompatível com o manifesto');
    await client.query(`INSERT INTO geography_imports(source_key,checksum,source_url,retrieved_at,imported) VALUES('ibge-municipality-boundaries',$1,$2,$3,$4)
      ON CONFLICT(source_key) DO UPDATE SET checksum=EXCLUDED.checksum,source_url=EXCLUDED.source_url,retrieved_at=EXCLUDED.retrieved_at,imported=EXCLUDED.imported`,[checksum,metadata.source_url,metadata.retrieved_at,codes.size]);
    await client.query('COMMIT');console.log(`Limites municipais salvos no PostgreSQL: ${codes.size}.`);
  }catch(error){await client.query('ROLLBACK');throw error;}
}
