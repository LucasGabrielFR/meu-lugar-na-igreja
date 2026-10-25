import pg from 'pg';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {projectHighways,buildRoadConnections,roadMercatorY} from '../src/lib/map-roads.mjs';
import {buildTownScales} from '../src/lib/map-territories.mjs';
import {estimateTownRadius} from '../src/lib/town-layout.mjs';
import {roadsForView,scopedCityCodes} from '../src/lib/map-rendering.mjs';
const client=new pg.Client();await client.connect();
try{
  const cities=(await client.query(`SELECT c.code,c.active,m.name,m.uf,count(p.id)::int parishes,(SELECT count(*)::int FROM houses h WHERE h.city_code=c.code AND h.active) houses FROM cities c JOIN municipalities m ON m.code=c.code JOIN parishes p ON p.city_code=c.code AND p.active WHERE c.active GROUP BY c.code,m.name,m.uf`)).rows;
  const seats=new Map(JSON.parse(readFileSync('public/data/municipio-sedes.json','utf8')).map(([code,lon,lat])=>[code,{lon,lat}]));
  const snapshot=JSON.parse(readFileSync('public/data/highways.json','utf8')),lines=new Map(snapshot.lines.map(line=>[line.id,line]));
  for(const tile of snapshot.tiles.filter(t=>t.bounds[0]<-45&&t.bounds[2]>-49&&t.bounds[1]<-22&&t.bounds[3]>-26))for(const line of JSON.parse(readFileSync('public'+tile.url,'utf8')).lines)lines.set(line.id,line);
  const source=[...lines.values()],seat=seats.get(3525003),view={center:[seat.lon,roadMercatorY(seat.lat)],zoom:128,width:1280,height:720};
  const measure=fn=>{const start=performance.now(),result=fn();return {ms:Number((performance.now()-start).toFixed(2)),result};};
  const radii=Object.fromEntries(cities.map(c=>[c.code,estimateTownRadius(c.houses,c.parishes)]));
  const scales=measure(()=>buildTownScales(cities,seats,radii));
  const baselineProjection=measure(()=>projectHighways(source));
  const baselineConnections=measure(()=>buildRoadConnections(cities,seats,baselineProjection.result,radii,scales.result));
  const cold=measure(()=>roadsForView(source,view));
  const warm=measure(()=>roadsForView(source,{...view,center:[view.center[0]+.005,view.center[1]]}));
  const scope=scopedCityCodes(cities,seats,view,radii,scales.result);
  const regional=measure(()=>buildRoadConnections(cities,seats,warm.result,radii,scales.result,scope));
  const report={date:new Date().toISOString(),environment:'Node em Docker local; uma amostra, não mede FPS/INP nem dispositivos móveis',scenario:{city:3525003,zoom:view.zoom,viewport:[view.width,view.height],cities:cities.length,sourceRoads:source.length,selectedRoads:warm.result.length,scopedCities:scope.size},ms:{scales:scales.ms,baselineAllRoadProjection:baselineProjection.ms,baselineGlobalConnections:baselineConnections.ms,firstVisibleRoadProjection:cold.ms,cachedVisibleRoadProjection:warm.ms,regionalConnections:regional.ms}};
  writeFileSync('docs/map-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await client.end();}
