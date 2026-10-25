import {estimateTownRadius} from './town-layout.mjs';
export const roadMercatorY=latitude=>-Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360))*180/Math.PI;
/** @param {{id:string;br:string;uf:string;rank?:number;points:number[][]}[]} lines */
export function projectHighways(lines){return lines.map(line=>{const points=line.points.map(([x,lat])=>[x,roadMercatorY(lat)]);const bounds=points.reduce((b,[x,y])=>[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)],[Infinity,Infinity,-Infinity,-Infinity]);return {...line,points,bounds,path:points.map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join('')};});}
export function nearestHighway(point,roads,maxDistance){
  let best=null,distance=maxDistance;
  for(const road of roads){const [left,top,right,bottom]=road.bounds;if(point.x<left-distance||point.x>right+distance||point.y<top-distance||point.y>bottom+distance)continue;
    for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/length)):0;
      const target={x:a[0]+dx*t,y:a[1]+dy*t},gap=Math.hypot(point.x-target.x,point.y-target.y);
      if(gap<distance){distance=gap;best={...target,distance:gap,road:road.id};}
    }
  }
  return best;
}
export function townExit(node,target){
  const angle=Math.atan2((target.y-node.y)/.7,target.x-node.x),radius=node.radius-2;
  return {x:node.x+Math.cos(angle)*radius*node.scale,y:node.y+Math.sin(angle)*radius*.7*node.scale,angle};
}
export function townGateways(node,roads){
  const rx=(node.radius+14)*node.scale,ry=rx*.7,candidates=[];
  for(const road of roads){if(road.bounds[2]<node.x-rx||road.bounds[0]>node.x+rx||road.bounds[3]<node.y-ry||road.bounds[1]>node.y+ry)continue;
    for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1],b=road.points[i],ax=(a[0]-node.x)/rx,ay=(a[1]-node.y)/ry,dx=(b[0]-a[0])/rx,dy=(b[1]-a[1])/ry;
      const aa=dx*dx+dy*dy,bb=2*(ax*dx+ay*dy),cc=ax*ax+ay*ay-1,discriminant=bb*bb-4*aa*cc;if(aa<1e-20||discriminant<0)continue;
      for(const t of [(-bb-Math.sqrt(discriminant))/(2*aa),(-bb+Math.sqrt(discriminant))/(2*aa)])if(t>=0&&t<=1){const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
        candidates.push({x,y,angle:Math.atan2((y-node.y)/.7,x-node.x),rank:road.rank??1,road:road.id});}
    }
  }
  const selected=[];
  for(const candidate of candidates.sort((a,b)=>a.rank-b.rank||a.road.localeCompare(b.road))){
    if(selected.some(other=>Math.abs(Math.atan2(Math.sin(other.angle-candidate.angle),Math.cos(other.angle-candidate.angle)))<6/node.radius))continue;
    selected.push(candidate);
  }
  return selected;
}
function highwayGrid(roads){const grid=new Map();for(const road of roads){for(let x=Math.floor(road.bounds[0]);x<=Math.floor(road.bounds[2]);x++)for(let y=Math.floor(road.bounds[1]);y<=Math.floor(road.bounds[3]);y++){const key=x+':'+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(road);}}return grid;}
function nearbyRoads(grid,node,range){const found=new Map();for(let x=Math.floor(node.x-range);x<=Math.floor(node.x+range);x++)for(let y=Math.floor(node.y-range);y<=Math.floor(node.y+range);y++)for(const road of grid.get(x+':'+y)??[])found.set(road.id,road);return [...found.values()];}
/** @param {import('./types').City[]} cities @param {Map<number,{lon:number;lat:number}>} seats @param {ReturnType<typeof projectHighways>} roads @param {Record<number,number>} radii @param {Record<number,number>} scales @param {Set<number>|null} activeCodes */
export function buildRoadConnections(cities,seats,roads,radii={},scales={},activeCodes=null){
  const nodes=cities.flatMap(city=>{const seat=seats.get(city.code);if(!seat||!city.active||!city.parishes)return [];const scale=scales[city.code]??3/(111320*Math.cos(seat.lat*Math.PI/180));return [{code:city.code,x:seat.lon,y:roadMercatorY(seat.lat),lat:seat.lat,parishes:city.parishes,radius:radii[city.code]??estimateTownRadius(city.houses,city.parishes),scale}];});
  const connections=[],grid=highwayGrid(roads),connected=new Set();
  /** @type {Record<number,number[]>} */
  const exits={};
  const add=(id,a,target,b=null)=>{const start=townExit(a,target),end=b?townExit(b,a):target;
    exits[a.code]=[...(exits[a.code]??[]),start.angle];connected.add(a.code);if(b){exits[b.code]=[...(exits[b.code]??[]),end.angle];connected.add(b.code);}
    const lead=Math.min(Math.hypot(end.x-start.x,end.y-start.y)*.28,.04);
    const control={x:start.x+Math.cos(start.angle)*lead,y:start.y+Math.sin(start.angle)*lead*.7};
    const finish=b?{x:end.x+Math.cos(end.angle)*lead,y:end.y+Math.sin(end.angle)*lead*.7}:end;
    connections.push({id,cityCode:a.code,scale:a.scale,targetCityCode:b?.code??null,start,end,path:`M${start.x},${start.y}C${control.x},${control.y} ${finish.x},${finish.y} ${end.x},${end.y}`,bounds:[Math.min(start.x,control.x,finish.x,end.x),Math.min(start.y,control.y,finish.y,end.y),Math.max(start.x,control.x,finish.x,end.x),Math.max(start.y,control.y,finish.y,end.y)],kind:b?'local':'access'});
  };
  const remote=[];
  for(const node of nodes){
    if(activeCodes&&!activeCodes.has(node.code))continue;
    const range=25/(111.32*Math.cos(node.lat*Math.PI/180)),nearby=nearbyRoads(grid,node,range),gateways=townGateways(node,nearby);
    if(gateways.length){gateways.forEach((gateway,i)=>add(`gateway-${node.code}-${i}`,node,gateway));continue;}
    const outside=nearby.filter(road=>road.points.some(([x,y])=>((x-node.x)/(node.radius*node.scale))**2+((y-node.y)/(node.radius*node.scale*.7))**2>1.3));
    const nearest=nearestHighway(node,outside,range);
    if(nearest)add(`access-${node.code}`,node,nearest);else remote.push(node);
  }
  const degrees=new Map();
  for(const node of remote){if(connected.has(node.code))continue;
    const candidates=nodes.filter(other=>other.code!==node.code).map(other=>({other,km:Math.hypot(node.x-other.x,node.y-other.y)*111.32*Math.cos((node.lat+other.lat)*Math.PI/360)})).filter(row=>row.km<=100).sort((a,b)=>a.km-b.km);
    const candidate=candidates.find(row=>(degrees.get(row.other.code)??0)<3);if(!candidate)continue;
    const other=candidate.other;add(`local-${[node.code,other.code].sort((a,b)=>a-b).join('-')}`,node,other,other);for(const member of [node,other])degrees.set(member.code,(degrees.get(member.code)??0)+1);
  }
  const towns=activeCodes?nodes.filter(node=>activeCodes.has(node.code)||connected.has(node.code)):nodes;
  return {connections,exits,towns,unconnected:towns.filter(node=>!connected.has(node.code)).map(node=>node.code)};
}
