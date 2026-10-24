import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTownLayout, neighborhoodGeometry } from '../src/lib/town-layout.mjs';

const parishes=[{id:1,slot:0,name:'Comunidade A'},{id:2,slot:1,name:'Comunidade B'}];
const homes=count=>parishes.flatMap(parish=>Array.from({length:count},(_,slot)=>({id:parish.id*10000+slot,parish_id:parish.id,slot})));
test('one town has a shared center and distinct parish neighborhoods without overlapping lots',()=>{
  const layout=buildTownLayout(parishes,homes(24));
  assert.equal(layout.plots.length,48);assert.equal(layout.districts.length,2);assert.ok(layout.rings.length>=2);
  assert.ok(layout.districts.every(d=>Math.hypot(d.x,d.y)===neighborhoodGeometry(d.index,2).churchRadius));
  for(let i=0;i<layout.plots.length;i++)for(let j=i+1;j<layout.plots.length;j++)assert.ok(Math.hypot(layout.plots[i].x-layout.plots[j].x,layout.plots[i].y-layout.plots[j].y)>20);
  assert.ok(layout.plots.every(plot=>Math.hypot(plot.x,plot.y)>80),'public central plaza remains clear');
});
test('new residents expand the town without moving existing lots in its neighborhoods',()=>{
  const before=buildTownLayout(parishes,homes(24)),after=buildTownLayout(parishes,homes(60));
  assert.ok(after.radius>before.radius);
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
