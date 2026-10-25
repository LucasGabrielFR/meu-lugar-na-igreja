import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTownLayout, neighborhoodGeometry, neighborhoodPlot } from '../src/lib/town-layout.mjs';

const parishes=[{id:1,slot:0,name:'Comunidade A'},{id:2,slot:1,name:'Comunidade B'}];
const homes=count=>parishes.flatMap(parish=>Array.from({length:count},(_,slot)=>({id:parish.id*10000+slot,parish_id:parish.id,slot})));
test('one town has a shared center and distinct parish neighborhoods without overlapping lots',()=>{
  const layout=buildTownLayout(parishes,homes(24));
  assert.equal(layout.plots.length,48);assert.equal(layout.districts.length,2);assert.ok(layout.streets.length>=8);
  assert.ok(layout.districts.every(d=>d.x===neighborhoodGeometry(d.index).x&&d.y===neighborhoodGeometry(d.index).y));
  for(let i=0;i<layout.plots.length;i++)for(let j=i+1;j<layout.plots.length;j++)assert.ok(Math.hypot(layout.plots[i].x-layout.plots[j].x,layout.plots[i].y-layout.plots[j].y)>20);
  assert.ok(layout.plots.every(plot=>layout.districts.every(d=>Math.hypot(plot.x-d.x,plot.y-d.y)>40)),'parish plazas remain clear');
});
test('new residents expand the town without moving existing lots in its neighborhoods',()=>{
  const before=buildTownLayout(parishes,homes(24)),after=buildTownLayout(parishes,homes(60));
  assert.ok(after.radius>=before.radius);assert.ok(after.cells.length>before.cells.length);
  for(const plot of before.plots){const current=after.plots.find(p=>p.house.id===plot.house.id);assert.equal(current.x,plot.x);assert.equal(current.y,plot.y);}
});
test('outer neighborhoods keep safe lot spacing as the town grows',()=>{
  for(const count of [1,2,5,8]) {
    const districts=Array.from({length:count},(_,slot)=>({id:slot+1,slot}));
    const houses=districts.flatMap(p=>Array.from({length:100},(_,slot)=>({id:p.id*10000+slot,parish_id:p.id,slot})));
    const plots=buildTownLayout(districts,houses).plots;
    for(let i=0;i<plots.length;i++)for(let j=i+1;j<plots.length;j++)assert.ok(Math.hypot(plots[i].x-plots[j].x,plots[i].y-plots[j].y)>20);
  }
});
test('municipality anchors come from official urban seats and include Niquelândia and Noronha',()=>{
  const seats=JSON.parse(readFileSync('public/data/municipio-sedes.json','utf8'));
  const catalog=JSON.parse(readFileSync('public/data/municipios.json','utf8'));
  assert.equal(seats.length,catalog.length);assert.equal(new Set(seats.map(p=>p[0])).size,catalog.length);
  const niquelandia=seats.find(p=>p[0]===5214606);assert.ok(Math.abs(niquelandia[1]+48.460201)<.00001);assert.ok(Math.abs(niquelandia[2]+14.4707)<.00001);
  assert.ok(seats.some(p=>p[0]===2605459));
});

test('hundreds of parishes occupy stable urban blocks instead of one circumference',()=>{
  const make=n=>Array.from({length:n},(_,slot)=>({id:slot+1,slot}));
  const before=buildTownLayout(make(74),[]),after=buildTownLayout(make(350),[]);
  assert.ok(after.sectors.length>20);assert.ok(new Set(after.districts.map(d=>d.x)).size>15);assert.ok(new Set(after.districts.map(d=>d.y)).size>15);
  assert.ok(new Set(after.districts.map(d=>Math.round(Math.hypot(d.x,d.y)))).size>20);
  for(const d of before.districts){const current=after.districts.find(p=>p.parish.id===d.parish.id);assert.equal(current.x,d.x);assert.equal(current.y,d.y);}
  const homesBefore=buildTownLayout(make(2),homes(100)),homesAfter=buildTownLayout(make(3),homes(100));
  assert.deepEqual(homesBefore.plots,homesAfter.plots);
  const positions=new Set();
  for(let parish=0;parish<350;parish++)for(let slot=0;slot<150;slot++){const p=neighborhoodPlot(slot,parish),key=`${p.x}:${p.y}`;assert.ok(!positions.has(key));positions.add(key);}
});

test('every parish street block connects to the common street graph',()=>{
  const layout=buildTownLayout(Array.from({length:350},(_,slot)=>({id:slot,slot})),[]),adjacency=new Map();
  for(const e of layout.streets){const a=`${e.ax}:${e.ay}`,b=`${e.bx}:${e.by}`;adjacency.set(a,[...(adjacency.get(a)??[]),b]);adjacency.set(b,[...(adjacency.get(b)??[]),a]);}
  const pending=[adjacency.keys().next().value],seen=new Set();
  while(pending.length){const next=pending.pop();if(seen.has(next))continue;seen.add(next);pending.push(...adjacency.get(next));}
  assert.equal(seen.size,adjacency.size);
});
