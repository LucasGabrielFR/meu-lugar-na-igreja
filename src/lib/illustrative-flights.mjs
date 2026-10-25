export function createIllustrativeFlight(camera,random=Math.random){
  const {width,height}=camera.viewport,angle=random()*Math.PI*2,dx=Math.cos(angle),dy=Math.sin(angle);
  const x=width*(.2+random()*.6),y=height*(.2+random()*.6),margin=80;
  const distance=(vx,vy)=>Math.min(vx>1e-8?(width+margin-x)/vx:vx< -1e-8?(-margin-x)/vx:Infinity,vy>1e-8?(height+margin-y)/vy:vy< -1e-8?(-margin-y)/vy:Infinity);
  const forward=distance(dx,dy),backward=distance(-dx,-dy);
  const toWorld=(px,py)=>({x:camera.center[0]+(px-width/2)*camera.units,y:camera.center[1]+(py-height/2)*camera.units});
  const start=toWorld(x-dx*backward,y-dy*backward),end=toWorld(x+dx*forward,y+dy*forward);
  const speed=48+random()*28,duration=Math.max(6000,Math.min(45000,(forward+backward)/speed*1000));
  return {start,end,duration,size:22+random()*8,path:`M${start.x},${start.y}L${end.x},${end.y}`};
}
export function flightOnScreen(flight,camera,now){
  const progress=(now-flight.born)/flight.duration;
  if(progress<0||progress>=1)return false;
  const x=(flight.start.x+(flight.end.x-flight.start.x)*progress-camera.center[0])/camera.units+camera.viewport.width/2;
  const y=(flight.start.y+(flight.end.y-flight.start.y)*progress-camera.center[1])/camera.units+camera.viewport.height/2;
  return x>=-120&&x<=camera.viewport.width+120&&y>=-120&&y<=camera.viewport.height+120;
}
export const flightBudget=viewport=>viewport.width>=700&&viewport.height>=450?2:1;
