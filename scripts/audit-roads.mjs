import pg from 'pg';
import {readFileSync,writeFileSync} from 'node:fs';
import {projectHighways,buildRoadConnections} from '../src/lib/map-roads.mjs';
const client=new pg.Client();await client.connect();
try{
  const cities=(await client.query(`SELECT c.code,c.active,count(p.id)::int parishes,(SELECT count(*)::int FROM houses h WHERE h.city_code=c.code AND h.active) houses
    FROM cities c JOIN parishes p ON p.city_code=c.code AND p.active WHERE c.active GROUP BY c.code`)).rows;
  const snapshot=JSON.parse(readFileSync('public/data/highways.json','utf8')),lines=new Map();
  for(const tile of snapshot.tiles)for(const line of JSON.parse(readFileSync('public'+tile.url,'utf8')).lines)lines.set(line.id,line);
  const seats=new Map(JSON.parse(readFileSync('public/data/municipio-sedes.json','utf8')).map(([code,lon,lat])=>[code,{lon,lat}]));
  const network=buildRoadConnections(cities,seats,projectHighways([...lines.values()]));
  const summary={date:new Date().toISOString(),source:snapshot.metadata,municipalities:cities.length,realConnectedMunicipalities:new Set(network.connections.filter(road=>road.kind==='access').map(road=>road.cityCode)).size,realRoadEntrances:network.connections.filter(road=>road.kind==='access').length,illustrativeLocalLinks:network.connections.filter(road=>road.kind==='local').length,unconnected:network.unconnected};
  writeFileSync('docs/road-network-audit.json',JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify({...summary,source:summary.source.attribution}));
}finally{await client.end();}
