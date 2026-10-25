import test from 'node:test';
import assert from 'node:assert/strict';
import {createIllustrativeFlight,flightOnScreen,flightBudget} from '../src/lib/illustrative-flights.mjs';
const camera={center:[-46.63,24.2],units:.001,viewport:{width:1200,height:700}};
test('random headings enter and leave the current viewport and cross its visible area',()=>{
  const headings=new Set();
  for(let i=0;i<36;i++){
    const values=[i/36,.4,.7,.5,.6];let at=0;
    const flight={...createIllustrativeFlight(camera,()=>values[at++]),born:100};
    const screen=p=>({x:(p.x-camera.center[0])/camera.units+600,y:(p.y-camera.center[1])/camera.units+350});
    for(const p of [screen(flight.start),screen(flight.end)])assert.ok(p.x<=-79||p.x>=1279||p.y<=-79||p.y>=779);
    assert.ok(flightOnScreen(flight,camera,100+flight.duration/2));
    headings.add(Math.round(Math.atan2(flight.end.y-flight.start.y,flight.end.x-flight.start.x)*100));
    assert.ok(flight.duration>=6000&&flight.duration<=45000);
  }
  assert.equal(headings.size,36);
});
test('camera changes and elapsed flights are culled, with smaller screens limited to one plane',()=>{
  const flight={...createIllustrativeFlight(camera,()=>.4),born:0};
  assert.equal(flightOnScreen(flight,camera,flight.duration),false);
  assert.equal(flightOnScreen(flight,{...camera,center:[-48,26]},flight.duration/2),false);
  assert.equal(flightBudget({width:390,height:700}),1);assert.equal(flightBudget(camera.viewport),2);
  const near={...camera,units:1e-7};
  const local={...createIllustrativeFlight(near,()=>.4),born:0};
  assert.ok(flightOnScreen(local,near,local.duration/2));
});
