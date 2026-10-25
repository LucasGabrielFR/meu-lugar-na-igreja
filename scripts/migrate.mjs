import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { hashPassword } from './security.mjs';
import { importParishCatalog } from './import-parish-catalog.mjs';
import { importMunicipalityBoundaries } from './import-municipality-boundaries.mjs';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('SELECT pg_advisory_lock(78123001)');
  await client.query('CREATE TABLE IF NOT EXISTS migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of readdirSync('db/migrations').filter(x => x.endsWith('.sql')).sort()) {
    const sql = readFileSync(`db/migrations/${name}`, 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const applied = (await client.query('SELECT checksum FROM migrations WHERE name=$1', [name])).rows[0];
    if (applied) {
      if (applied.checksum !== checksum) throw new Error(`Migration already applied was modified: ${name}`);
      continue;
    }
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO migrations(name,checksum) VALUES($1,$2)', [name, checksum]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    console.log(`Applied ${name}`);
  }
  const catalog = JSON.parse(readFileSync('public/data/municipios.json', 'utf8'));
  await client.query(`INSERT INTO municipalities(code,name,uf)
    SELECT code,name,uf FROM jsonb_to_recordset($1::jsonb) AS m(code integer,name text,uf text)
    ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name, uf=EXCLUDED.uf`, [JSON.stringify(catalog)]);
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const seats=JSON.parse(readFileSync('public/data/municipio-sedes.json','utf8'));
  const seatSource=JSON.parse(readFileSync('public/data/municipio-sedes.meta.json','utf8')).source;
  await client.query(`UPDATE municipalities m SET seat_longitude=s.lon,seat_latitude=s.lat,seat_source=$2
    FROM jsonb_to_recordset($1::jsonb) AS s(code integer,lon double precision,lat double precision) WHERE m.code=s.code`,
    [JSON.stringify(seats.map(([code,lon,lat])=>({code,lon,lat}))),seatSource]);
  await importParishCatalog(client);
  await importMunicipalityBoundaries(client);
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 16 || password.includes('REPLACE_')) throw new Error('Configure ADMIN_EMAIL and a random ADMIN_PASSWORD with at least 16 characters.');
  await client.query('INSERT INTO admins(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING', [email, hashPassword(password)]);
  console.log(`Municipalities imported: ${catalog.length}. Administrator bootstrap complete (existing password preserved).`);
} finally { await client.end(); }
