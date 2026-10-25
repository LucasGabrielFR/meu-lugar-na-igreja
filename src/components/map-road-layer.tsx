import type {projectHighways,buildRoadConnections} from '@/lib/map-roads.mjs';
export default function MapRoadLayer({roads,connections,towns,zoom,center,units,viewport}:{roads:ReturnType<typeof projectHighways>;connections:ReturnType<typeof buildRoadConnections>['connections'];towns:ReturnType<typeof buildRoadConnections>['towns'];zoom:number;center:[number,number];units:number;viewport:{width:number;height:number}}){
  if(zoom<2)return null;
  const inView=(bounds:number[])=>bounds[2]>=center[0]-viewport.width*units/2&&bounds[0]<=center[0]+viewport.width*units/2&&bounds[3]>=center[1]-viewport.height*units/2&&bounds[1]<=center[1]+viewport.height*units/2;
  const latitude=(2*Math.atan(Math.exp(-center[1]*Math.PI/180))-Math.PI/2)*180/Math.PI;
  const scale=3/(111320*Math.cos(latitude*Math.PI/180)),pavement=Math.max(7*scale,units*1.1),curb=pavement+Math.max(5*scale,units*1.5),mark=Math.max(.8*scale,units*.5),dash=Math.max(4*scale,units*4);
  const visibleTowns=towns.filter(town=>inView([town.x-town.radius*town.scale,town.y-town.radius*town.scale,town.x+town.radius*town.scale,town.y+town.radius*town.scale]));
  const visibleRoads=roads.filter(road=>inView(road.bounds)),roadPath=visibleRoads.map(road=>road.path).join('');
  const maskLeft=center[0]-(viewport.width/2+200)*units,maskTop=center[1]-(viewport.height/2+200)*units,maskWidth=(viewport.width+400)*units,maskHeight=(viewport.height+400)*units;
  return <g clipPath="url(#brazil-land-clip)" pointerEvents="none" opacity={Math.min(1,.3+zoom/16)} strokeLinejoin="round" strokeLinecap="round">
    <defs><mask id="road-town-interchanges" maskUnits="userSpaceOnUse" x={maskLeft} y={maskTop} width={maskWidth} height={maskHeight}><rect x={maskLeft} y={maskTop} width={maskWidth} height={maskHeight} fill="white"/>{visibleTowns.map(town=><ellipse key={town.code} cx={town.x} cy={town.y} rx={(town.radius+4)*town.scale} ry={(town.radius+4)*town.scale*.7} fill="black"/>)}</mask></defs>
    <g mask="url(#road-town-interchanges)" data-real-road-count={visibleRoads.length}><path d={roadPath} fill="none" stroke="#d9d8bd" strokeWidth={curb}/><path d={roadPath} fill="none" stroke="#89948b" strokeWidth={pavement}/>{zoom>=30&&<path d={roadPath} fill="none" stroke="#ede6cc" strokeWidth={mark} strokeDasharray={`${dash} ${dash*1.25}`}/>}</g>
    {zoom>=8&&connections.filter(road=>inView(road.bounds)).map(road=><g key={road.id} data-illustrative-road={road.id} data-city-access={road.cityCode}><path d={road.path} fill="none" stroke="#d9d8bd" strokeWidth={Math.max(12*road.scale,units*2)}/><path d={road.path} fill="none" stroke={road.kind==='local'?'#a19476':'#89948b'} strokeWidth={Math.max(7*road.scale,units*.9)}/>{zoom>=30&&<path d={road.path} fill="none" stroke="#ede6cc" strokeWidth={mark} strokeDasharray={`${dash} ${dash*1.25}`}/>}</g>)}
  </g>;
}
