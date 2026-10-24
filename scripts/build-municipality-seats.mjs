import { DatabaseSync } from 'node:sqlite';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const source='https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/Localidades_do_Brasil/2022/Localidades_Brasil_gpkg.zip';
function extractGeoPackage(archive) {
  let end=archive.length-22;
  while(end>=Math.max(0,archive.length-65557)&&archive.readUInt32LE(end)!==0x06054b50)end--;
  if(end<0||archive.readUInt32LE(end)!==0x06054b50)throw new Error('Invalid IBGE ZIP');
  let cursor=archive.readUInt32LE(end+16);
  const entries=archive.readUInt16LE(end+10);
  for(let i=0;i<entries;i++) {
    if(archive.readUInt32LE(cursor)!==0x02014b50)throw new Error('Invalid ZIP directory');
    const length=archive.readUInt16LE(cursor+28),extra=archive.readUInt16LE(cursor+30),comment=archive.readUInt16LE(cursor+32);
    const name=archive.subarray(cursor+46,cursor+46+length).toString('utf8');
    if(name.endsWith('.gpkg')) {
      const compressedSize=archive.readUInt32LE(cursor+20),size=archive.readUInt32LE(cursor+24),offset=archive.readUInt32LE(cursor+42),method=archive.readUInt16LE(cursor+10);
      if(size>128*1024*1024||archive.readUInt32LE(offset)!==0x04034b50)throw new Error('Unexpected GeoPackage');
      const start=offset+30+archive.readUInt16LE(offset+26)+archive.readUInt16LE(offset+28);
      if(start+compressedSize>archive.length)throw new Error('Truncated ZIP');
      const bytes=archive.subarray(start,start+compressedSize);
      const result=method===0?bytes:method===8?inflateRawSync(bytes,{maxOutputLength:128*1024*1024}):null;
      if(!result||result.length!==size)throw new Error('Unsupported ZIP member');
      return result;
    }
    cursor+=46+length+extra+comment;
  }
  throw new Error('GeoPackage not found');
}
const local=process.argv[2];
let bytes;
if(local)bytes=await readFile(local);
else {const response=await fetch(source,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw new Error(`IBGE HTTP ${response.status}`);bytes=extractGeoPackage(Buffer.from(await response.arrayBuffer()));}
const temp=await mkdtemp(join(tmpdir(),'meu-lugar-seats-')),path=join(temp,'localidades.gpkg');
await writeFile(path,bytes);
let db;
try {
  db=new DatabaseSync(path,{readOnly:true});
  if(db.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw new Error('Invalid SQLite database');
  const rows=db.prepare(`SELECT CD_MUN,LONG_LOCALIDADE,LAT_LOCALIDADE FROM BR_localidades_2022
    WHERE CT_LOCALIDADE='Cidade' OR CT_LOCALIDADE='Distrito Estadual de Fernando de Noronha'
    ORDER BY CASE SCT_LOCALIDADE WHEN 'Capital Federal' THEN 0 WHEN 'Capital Estadual' THEN 1 ELSE 2 END,id`).all();
  const byCode=new Map();
  for(const row of rows)if(!byCode.has(Number(row.CD_MUN)))byCode.set(Number(row.CD_MUN),[Number(row.CD_MUN),Number(row.LONG_LOCALIDADE.toFixed(6)),Number(row.LAT_LOCALIDADE.toFixed(6))]);
  const catalog=JSON.parse(await readFile('public/data/municipios.json','utf8'));
  const missing=catalog.filter(m=>!byCode.has(m.code));
  if(missing.length||catalog.length<5500)throw new Error(`Missing municipal seats: ${missing.map(m=>m.code).join(',')}`);
  const seats=catalog.map(m=>byCode.get(m.code)).sort((a,b)=>a[0]-b[0]);
  if(seats.some(([,lon,lat])=>!Number.isFinite(lon)||!Number.isFinite(lat)||lon< -75||lon> -28||lat< -35||lat>6))throw new Error('Invalid seat coordinates');
  await writeFile('public/data/municipio-sedes.json',JSON.stringify(seats)+'\n');
  await writeFile('public/data/municipio-sedes.meta.json',JSON.stringify({source,dataset:'IBGE · Localidades do Brasil 2022 · arquivo publicado em novembro de 2025',crs:'SIRGAS 2000 (EPSG:4674)',kind:'sede municipal; capital estadual/federal priorizada; Distrito Estadual de Fernando de Noronha incluído',sha256_gpkg:createHash('sha256').update(bytes).digest('hex'),retrieved_at:new Date().toISOString(),count:seats.length},null,2)+'\n');
  console.log(`Official municipal seats generated: ${seats.length}. Niquelândia: ${JSON.stringify(byCode.get(5214606))}`);
}finally{db?.close();await unlink(path);await rmdir(temp);}
