import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectHighways,nearestHighway,buildRoadConnections,townExit,townGateways} from '../src/lib/map-roads.mjs';
import {estimateTownRadius,buildTownLayout} from '../src/lib/town-layout.mjs';
test('empty towns and highway entrances use exactly the same perimeter',()=>{
  for(const count of [1,2,3,10,100]){
    const layout=buildTownLayout(Array.from({length:count},(_,i)=>({id:i,slot:i})),[]);
    assert.equal(estimateTownRadius(0,count),layout.radius);
  }
});
test('real roads project in the same coordinates as cities and nearest access snaps to the segment',()=>{
  const roads=projectHighways([{id:'BR',br:'153',uf:'GO',points:[[-49,0],[-48,0]]}]);
  const nearest=nearestHighway({x:-48.5,y:.1},roads,.2);
  assert.equal(nearest.x,-48.5);assert.ok(Math.abs(nearest.y)<1e-8);
  assert.equal(nearestHighway({x:-48.5,y:1},roads,.2),null);
});
test('illustrative links use nearby municipalities only, never a complete graph, and start at city edges',()=>{
  const cities=Array.from({length:7},(_,i)=>({code:i,name:String(i),active:true,parishes:2,houses:0,uf:'GO',description:''}));
  const seats=new Map(cities.map((c,i)=>[c.code,{lon:-49+i*.1,lat:-14}]));
  const result=buildRoadConnections(cities,seats,[]);
  assert.ok(result.connections.length>0&&result.connections.length<cities.length*2);
  for(const angles of Object.values(result.exits))assert.ok(angles.length<=3);
  const far=buildRoadConnections([cities[0],cities[1]],new Map([[0,{lon:-49,lat:-14}],[1,{lon:-40,lat:-14}]]),[]);
  assert.equal(far.connections.length,0);
  const exit=townExit({x:0,y:0,parishes:2,radius:100,scale:.001},{x:1,y:0});
  assert.ok(Math.hypot(exit.x,exit.y)>.05);
});
test('bundled IBGE snapshot has a complete regional manifest and excludes planned roads',()=>{
  const {metadata,lines,tiles}=JSON.parse(readFileSync('public/data/highways.json','utf8'));
  assert.ok(metadata.features>100000);assert.equal(lines.length,metadata.overview_features);
  assert.match(metadata.filter,/Construída/);assert.match(metadata.source,/ibge.gov.br/);
  assert.ok(tiles.length>100);
  for(const tile of tiles){assert.ok(tile.url.startsWith(`/data/roads-ibge/${metadata.revision}/`));assert.ok(readFileSync('public'+tile.url).length>10);}
  for(const line of lines)for(const point of line.points){assert.ok(point[0]>=-75&&point[0]<=-30);assert.ok(point[1]>=-35&&point[1]<=7);}
});
test('a highway through the town creates entrances instead of being mistaken for an existing connection',()=>{
  const roads=projectHighways([{id:'through',br:'BR',uf:'GO',points:[[0,-.02],[0,.02]]}]);
  const city={code:1,active:true,houses:0,parishes:1};
  const network=buildRoadConnections([city],new Map([[1,{lon:0,lat:0}]]),roads);
  assert.equal(network.connections.length,2);assert.equal(network.exits[1].length,2);assert.deepEqual(network.unconnected,[]);
  for(const connection of network.connections){assert.equal(connection.kind,'access');assert.equal(connection.end.x,0);assert.ok(Math.hypot(connection.end.x,connection.end.y)>.002);}
});
test('entrances follow the actual road direction rather than snapping every one-parish town to the south',()=>{
  const exit=townExit({x:0,y:0,parishes:1,radius:115,scale:.001},{x:1,y:0});
  assert.ok(exit.x>0);assert.ok(Math.abs(exit.y)<1e-10);assert.equal(exit.angle,0);
  const gateways=townGateways({x:0,y:0,radius:115,scale:.00003},projectHighways([{id:'east',br:'',uf:'GO',points:[[.002,-.02],[.002,.02]]}]));
  assert.equal(gateways.length,2);assert.ok(gateways.every(g=>Math.abs(g.x-.002)<1e-10));
});
test('all distinct roads cut by a town footprint get a matching entrance',()=>{
  const roads=projectHighways([{id:'north-south',rank:0,br:'BR',uf:'GO',points:[[.002,-.02],[.002,.02]]},{id:'west',rank:1,br:'GO',uf:'GO',points:[[-.02,.01],[0,0]]}]);
  const network=buildRoadConnections([{code:1,active:true,houses:0,parishes:1}],new Map([[1,{lon:0,lat:0}]]),roads);
  assert.equal(network.connections.length,3);
  assert.ok(network.connections.some(connection=>connection.end.road==='west'));
});
test('all four reported municipalities reach real IBGE roads without fictitious intercity fallback',()=>{
  const manifest=JSON.parse(readFileSync('public/data/highways.json','utf8'));
  const tiles=manifest.tiles.filter(tile=>tile.bounds[0]<-48&&tile.bounds[2]>-50&&tile.bounds[1]<-13&&tile.bounds[3]>-15);
  const lines=new Map(manifest.lines.map(line=>[line.id,line]));
  for(const tile of tiles)for(const line of JSON.parse(readFileSync('public'+tile.url,'utf8')).lines)lines.set(line.id,line);
  const seats=new Map(JSON.parse(readFileSync('public/data/municipio-sedes.json','utf8')).map(([code,lon,lat])=>[code,{lon,lat}]));
  const codes=[5204706,5214606,5213087,5205521];
  const network=buildRoadConnections(codes.map(code=>({code,active:true,houses:0,parishes:code===5214606?3:1})),seats,projectHighways([...lines.values()]));
  assert.deepEqual(network.unconnected,[]);
  for(const code of codes){const entrances=network.connections.filter(connection=>connection.cityCode===code);assert.ok(entrances.length>0);assert.ok(entrances.every(connection=>connection.kind==='access'&&connection.end.road.startsWith('ibge:')));}
});
