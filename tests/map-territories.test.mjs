import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTownScales,convexOutline,regionFor,STATE_NAMES,REGIONS,mercatorLatitude,geographicPath} from '../src/lib/map-territories.mjs';
import {estimateTownRadius} from '../src/lib/town-layout.mjs';
import {buildRoadConnections} from '../src/lib/map-roads.mjs';
test('metropolitan virtual territories remain separate without moving municipal seats',()=>{
  const municipalities=JSON.parse(readFileSync('public/data/municipios.json','utf8'));
  const seats=new Map(JSON.parse(readFileSync('public/data/municipio-sedes.json','utf8')).map(([code,lon,lat])=>[code,{lon,lat}]));
  const cities=['São Paulo','Guarulhos','São Caetano do Sul','Santo André','Osasco'].map((name,i)=>({...municipalities.find(m=>m.uf==='SP'&&m.name===name),active:true,parishes:[472,30,11,29,15][i],houses:0}));
  const before=JSON.stringify([...seats]);
  const scales=buildTownScales(cities,seats);
  for(let i=0;i<cities.length;i++)for(let j=i+1;j<cities.length;j++){
    const a=cities[i],b=cities[j],sa=seats.get(a.code),sb=seats.get(b.code),distance=Math.hypot(sa.lon-sb.lon,mercatorLatitude(sa.lat)-mercatorLatitude(sb.lat));
    assert.ok(estimateTownRadius(0,a.parishes)*scales[a.code]+estimateTownRadius(0,b.parishes)*scales[b.code]<distance);
  }
  assert.equal(JSON.stringify([...seats]),before);
  const road=buildRoadConnections(cities,seats,[],{},scales);
  for(const town of road.towns)assert.equal(town.scale,scales[town.code]);
});
test('region context covers every UF exactly once, including the Northeast',()=>{
  assert.equal(Object.keys(REGIONS).length,5);assert.equal(Object.values(REGIONS).flat().length,27);
  for(const uf of Object.keys(STATE_NAMES))assert.ok(regionFor(uf));
  assert.equal(regionFor('SP'),'Sudeste');assert.equal(regionFor('GO'),'Centro-Oeste');assert.equal(regionFor('BA'),'Nordeste');
});
test('virtual outline removes interior points and administrative paths support multiple polygons and holes',()=>{
  const outline=convexOutline([[0,0],[1,0],[1,1],[0,1],[.5,.5],[0,0]]);
  assert.equal(outline.length,4);assert.ok(!outline.some(([x,y])=>x===.5&&y===.5));
  const result=geographicPath({features:[{geometry:{type:'MultiPolygon',coordinates:[[[[-47,-24],[-46,-24],[-46,-23],[-47,-24]]],[[[-48,-25],[-47,-25],[-48,-24],[-48,-25]]]]}}]});
  assert.equal((result.path.match(/M/g)??[]).length,2);assert.equal(result.bounds[0],-48);assert.equal(result.bounds[2],-46);assert.ok(result.bounds.every(Number.isFinite));
  assert.throws(()=>geographicPath({features:[]}),/sem geometria/);
});
