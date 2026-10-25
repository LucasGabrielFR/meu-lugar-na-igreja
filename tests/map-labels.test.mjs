import test from 'node:test';
import assert from 'node:assert/strict';
import {minimumLabelParishes,selectMapLabels} from '../src/lib/map-labels.mjs';
test('zoom progressively admits cities with fewer parishes',()=>{
  const thresholds=[1,2,4,8,16,32,64].map(minimumLabelParishes);
  assert.equal(thresholds[0],100);assert.equal(thresholds.at(-1),1);
  for(let i=1;i<thresholds.length;i++)assert.ok(thresholds[i]<=thresholds[i-1]);
});
test('overlapping labels favor parish priority, respect the viewport and fit a budget',()=>{
  const candidate=(id,x,y,priority)=>({id,x,y,width:100,height:20,priority});
  const labels=selectMapLabels([candidate('small',100,100,1),candidate('large',110,105,300),candidate('outside',2,10,500),candidate('separate',300,100,5),candidate('extra',450,200,2)],{width:600,height:400,limit:2});
  assert.deepEqual(labels.map(l=>l.id),['large','separate']);
  const all=selectMapLabels(Array.from({length:100},(_,id)=>candidate(id,(id%10)*60+65,Math.floor(id/10)*30+10,id)),{width:700,height:500});
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)assert.ok(all[i].right<=all[j].left||all[i].left>=all[j].right||all[i].bottom<=all[j].top||all[i].top>=all[j].bottom);
});
