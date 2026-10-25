import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {importMunicipalityBoundaries} from '../scripts/import-municipality-boundaries.mjs';

test('local boundaries cover the source snapshot and repeated import leaves stored rows unchanged',{skip:!process.env.PGHOST},async()=>{
  const client=new pg.Client();await client.connect();
  try{
    const metadata=JSON.parse(readFileSync('db/geography/municipality-boundaries.source.json','utf8'));
    const before=(await client.query('SELECT code,xmin::text version FROM municipality_boundaries ORDER BY code')).rows;
    assert.equal(before.length,metadata.features);
    const missing=(await client.query('SELECT m.code FROM municipalities m LEFT JOIN municipality_boundaries b USING(code) WHERE b.code IS NULL ORDER BY m.code')).rows;
    assert.deepEqual(missing.map(m=>m.code),metadata.missing.map(m=>m.code).sort((a,b)=>a-b));
    const sample=(await client.query('SELECT code,path,bounds,geometry FROM municipality_boundaries WHERE code IN (3550308,4211900,5214606)')).rows;
    assert.equal(sample.length,3);
    for(const row of sample){assert.ok(row.path.startsWith('M'));assert.equal(row.bounds.length,4);assert.ok(row.bounds.every(Number.isFinite));assert.ok(['Polygon','MultiPolygon'].includes(row.geometry.type));}
    await importMunicipalityBoundaries(client);
    assert.deepEqual((await client.query('SELECT code,xmin::text version FROM municipality_boundaries ORDER BY code')).rows,before);
  }finally{await client.end();}
});

test('boundary endpoint serves persisted projection and validates unavailable municipalities',{skip:!process.env.PGHOST},async()=>{
  const client=new pg.Client();await client.connect();
  try{
    const response=await fetch('http://web:3000/api/cities/4211900/boundary');
    assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/max-age=86400/);
    const data=await response.json(),stored=(await client.query('SELECT path,bounds FROM municipality_boundaries WHERE code=4211900')).rows[0];
    assert.equal(data.path,stored.path);assert.deepEqual(data.bounds,stored.bounds);
    assert.equal((await fetch('http://web:3000/api/cities/invalid/boundary')).status,400);
    assert.equal((await fetch('http://web:3000/api/cities/9999999/boundary')).status,404);
    const metadata=JSON.parse(readFileSync('db/geography/municipality-boundaries.source.json','utf8'));
    for(const row of metadata.missing)assert.equal((await fetch(`http://web:3000/api/cities/${row.code}/boundary`)).status,503);
    for(const query of ['Palhoca','4211900']){
      const result=await fetch('http://web:3000/api/municipalities?q='+query).then(r=>r.json());
      assert.ok(result.municipalities.some(m=>m.code===4211900));assert.ok(result.municipalities.length<=15);
    }
  }finally{await client.end();}
});
