import test from 'node:test';
import assert from 'node:assert/strict';
import {roadsForView,cachedTownLayout,cachedTownOutline,streetPath,scopedCityCodes} from '../src/lib/map-rendering.mjs';
import {projectHighways,buildRoadConnections} from '../src/lib/map-roads.mjs';
const view={center:[0,0],zoom:128,width:1000,height:700};
test('visible road projection is reused without changing its geometry, including crossing segments',()=>{
  const crossing={id:'cross',points:[[-2,0],[2,0]]},far={id:'far',points:[[20,20],[21,21]]};
  const first=roadsForView([crossing,far],view),second=roadsForView([crossing,far],{...view,center:[.01,0]});
  assert.equal(first.length,1);assert.equal(first[0],second[0]);assert.deepEqual(first[0],projectHighways([crossing])[0]);
  assert.deepEqual(roadsForView([crossing],{...view,zoom:1}),[]);
  const changed={...crossing,points:[[-2,0],[2,.01]]};
  assert.notEqual(roadsForView([changed],view)[0],first[0]);
});
test('loading another city does not rebuild existing town geometry or outlines',()=>{
  const world={parishes:[{id:1,slot:0,name:'A'}],houses:[]};
  const first=cachedTownLayout(world),outline=cachedTownOutline(first);
  cachedTownLayout({parishes:[{id:2,slot:0,name:'B'}],houses:[]});
  assert.equal(cachedTownLayout(world),first);assert.equal(cachedTownOutline(first),outline);
  const extended=cachedTownLayout({...world,parishes:[...world.parishes,{id:3,slot:1,name:'C'}]});
  assert.notEqual(extended,first);assert.match(streetPath(first.streets),/^M/);assert.equal((streetPath(first.streets).match(/M/g)??[]).length,first.streets.length);
});
test('regional city scope retains overlapping territories and fallback neighbors outside the view',()=>{
  const cities=[{code:1,active:true,parishes:1,houses:0},{code:2,active:true,parishes:1,houses:0},{code:3,active:true,parishes:1,houses:0}];
  const seats=new Map([[1,{lon:0,lat:0}],[2,{lon:.5,lat:0}],[3,{lon:20,lat:0}]]);
  const scoped=scopedCityCodes(cities,seats,view,{1:100,2:100,3:100},{1:.001,2:.001,3:.001});
  assert.ok(scoped.has(1));assert.ok(!scoped.has(3));
  const result=buildRoadConnections(cities,seats,[],{},{},new Set([1]));
  assert.equal(result.connections.length,1);assert.equal(result.connections[0].targetCityCode,2);
  assert.ok(result.towns.every(t=>t.code!==3));
});
