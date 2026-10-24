export function seededValue(seed) {
  let value=Math.imul(seed|0,1597334677);value=Math.imul(value^(value>>>16),2246822507);
  return ((value^(value>>>13))>>>0)/4294967296;
}
export function neighborhoodGeometry(index,count) {
  const angle=index/count*Math.PI*2-Math.PI/2;
  const churchRadius=Math.max(64,count*10);
  return {angle,churchRadius,startRadius:churchRadius+48,sectorWidth:Math.PI*2/count-Math.min(.22,Math.PI/count*.3)};
}
export function neighborhoodPlot(slot,index,count) {
  const geometry=neighborhoodGeometry(index,count);
  let remaining=slot,ring=0,radius=geometry.startRadius,capacity=Math.max(1,Math.floor(radius*geometry.sectorWidth/29));
  while(remaining>=capacity){remaining-=capacity;ring++;radius+=40;capacity=Math.max(1,Math.floor(radius*geometry.sectorWidth/29));}
  const angle=geometry.angle-geometry.sectorWidth/2+(remaining+.5)*geometry.sectorWidth/capacity;
  const jitter=(seededValue(slot*97+index*191)-.5)*Math.min(.035,6/radius);
  return {x:Math.cos(angle+jitter)*radius,y:Math.sin(angle+jitter)*radius,ring,radius,angle};
}
export function estimateTownRadius(houses,parishes) {
  const count=Math.max(1,parishes),perDistrict=Math.max(1,Math.ceil(houses/count));
  return neighborhoodPlot(perDistrict-1,0,count).radius+30;
}
/** @param {import('./types').Parish[]} parishes @param {import('./types').House[]} houses */
export function buildTownLayout(parishes,houses) {
  const ordered=[...parishes].sort((a,b)=>a.slot-b.slot),count=Math.max(1,ordered.length);
  const counts=new Map();for(const house of houses)counts.set(house.parish_id,(counts.get(house.parish_id)??0)+1);
  const districts=ordered.map((parish,index)=>{const geometry=neighborhoodGeometry(index,count);return {parish,index,...geometry,x:Math.cos(geometry.angle)*geometry.churchRadius,y:Math.sin(geometry.angle)*geometry.churchRadius,houses:counts.get(parish.id)??0};});
  const districtById=new Map(districts.map(district=>[district.parish.id,district]));
  const plots=houses.flatMap(house=>{
    const district=districtById.get(house.parish_id);if(!district)return [];
    return [{house,...neighborhoodPlot(house.slot,district.index,count)}];
  });
  const radius=plots.reduce((maximum,plot)=>Math.max(maximum,plot.radius+30),Math.max(115,neighborhoodGeometry(0,count).churchRadius+38));
  const rings=[];for(let ring=neighborhoodGeometry(0,count).startRadius-16;ring<radius-20;ring+=40)rings.push(ring);
  const trees=[];
  for(let attempt=0;attempt<1400&&trees.length<Math.min(90,18+Math.ceil(houses.length*.3));attempt++) {
    const angle=seededValue(attempt*79+11)*Math.PI*2,r=52+seededValue(attempt*113+31)*(radius-58);
    const tree={x:Math.cos(angle)*r,y:Math.sin(angle)*r,variant:attempt%3};
    if(plots.some(p=>Math.hypot(p.x-tree.x,p.y-tree.y)<20)||districts.some(p=>Math.hypot(p.x-tree.x,p.y-tree.y)<33)||rings.some(ring=>Math.abs(r-ring)<10))continue;
    trees.push(tree);
  }
  return {radius,districts,plots:plots.sort((a,b)=>a.y-b.y||a.house.id-b.house.id),rings,trees};
}
