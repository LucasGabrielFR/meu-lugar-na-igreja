import {projectHighways} from './map-roads.mjs';
import {buildTownLayout} from './town-layout.mjs';
import {convexOutline} from './map-territories.mjs';
const roadBounds=new WeakMap(),projected=new WeakMap(),townLayouts=new WeakMap(),outlines=new WeakMap();
export function cachedTownLayout(world){
  let layout=townLayouts.get(world);if(!layout){layout=buildTownLayout(world.parishes,world.houses);townLayouts.set(world,layout);}return layout;
}
export function cachedTownOutline(layout){
  let path=outlines.get(layout);if(!path){const hull=convexOutline([...layout.cells.flatMap(c=>[[-104,-104],[104,-104],[104,104],[-104,104]].map(([x,y])=>[c.col*192+x,(c.row*192+y)*.7])),...layout.nodes.map(p=>[p.x,p.y*.7])]);path=hull.map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join('')+'Z';outlines.set(layout,path);}return path;
}
export function mapViewBounds(view,paddingPixels=180){
  const units=48/view.zoom/Math.max(1,Math.min(view.width,view.height));
  return [view.center[0]-(view.width/2+paddingPixels)*units,view.center[1]-(view.height/2+paddingPixels)*units,view.center[0]+(view.width/2+paddingPixels)*units,view.center[1]+(view.height/2+paddingPixels)*units];
}
export function roadsForView(lines,view){
  if(view.zoom<2)return [];
  const bounds=mapViewBounds(view),latitude=y=>(2*Math.atan(Math.exp(-y*Math.PI/180))-Math.PI/2)*180/Math.PI;
  // Enough surrounding cartography for 25 km access searches, not whole regional tiles.
  const margin=.5,west=bounds[0]-margin,east=bounds[2]+margin,north=latitude(bounds[1])+margin,south=latitude(bounds[3])-margin;
  const result=[];
  for(const line of lines){
    let box=roadBounds.get(line);
    if(!box){box=[Infinity,Infinity,-Infinity,-Infinity];for(const [x,y] of line.points){box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],y);}roadBounds.set(line,box);}
    if(box[2]<west||box[0]>east||box[3]<south||box[1]>north)continue;
    let road=projected.get(line);if(!road){road=projectHighways([line])[0];projected.set(line,road);}result.push(road);
  }
  return result;
}
export function scopedCityCodes(cities,seats,view,radii,scales){
  const box=mapViewBounds(view),result=new Set();
  for(const city of cities){const point=seats.get(city.code);if(!point)continue;const radius=(radii[city.code]??0)*(scales[city.code]??0),y=point.y??-Math.log(Math.tan(Math.PI/4+point.lat*Math.PI/360))*180/Math.PI;
    if(point.lon+radius>=box[0]&&point.lon-radius<=box[2]&&y+radius>=box[1]&&y-radius<=box[3])result.add(city.code);
  }
  return result;
}
export function streetPath(streets){return streets.map(s=>`M${s.ax},${s.ay*.7}L${s.bx},${s.by*.7}`).join('');}
