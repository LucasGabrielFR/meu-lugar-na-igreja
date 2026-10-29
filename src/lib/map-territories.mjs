import {estimateTownRadius} from './town-layout.mjs';
/** @type {Record<string,string>} */
export const STATE_NAMES={RO:'Rondônia',AC:'Acre',AM:'Amazonas',RR:'Roraima',PA:'Pará',AP:'Amapá',TO:'Tocantins',MA:'Maranhão',PI:'Piauí',CE:'Ceará',RN:'Rio Grande do Norte',PB:'Paraíba',PE:'Pernambuco',AL:'Alagoas',SE:'Sergipe',BA:'Bahia',MG:'Minas Gerais',ES:'Espírito Santo',RJ:'Rio de Janeiro',SP:'São Paulo',PR:'Paraná',SC:'Santa Catarina',RS:'Rio Grande do Sul',MS:'Mato Grosso do Sul',MT:'Mato Grosso',GO:'Goiás',DF:'Distrito Federal'};
/** @type {Record<string,string[]>} */
export const REGIONS={'Norte':['RO','AC','AM','RR','PA','AP','TO'],'Nordeste':['MA','PI','CE','RN','PB','PE','AL','SE','BA'],'Centro-Oeste':['MS','MT','GO','DF'],'Sudeste':['MG','ES','RJ','SP'],'Sul':['PR','SC','RS']};
export const regionFor=uf=>Object.entries(REGIONS).find(([,ufs])=>ufs.includes(uf))?.[0]??'';
export const mercatorLatitude=latitude=>-Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360))*180/Math.PI;
export function buildTownScales(cities,seats,radii={}){
  const nodes=cities.filter(c=>c.active&&c.parishes&&seats.has(c.code)).map(c=>{
    const seat=seats.get(c.code),base=3/(111320*Math.cos(seat.lat*Math.PI/180));
    return {code:c.code,x:seat.lon,y:mercatorLatitude(seat.lat),base,radius:(radii[c.code]??estimateTownRadius(c.houses,c.parishes))*base,factor:1};
  });
  const bucketSize=0.6,grid=new Map();
  for(let i=0;i<nodes.length;i++){
    const n=nodes[i],bx=Math.floor(n.x/bucketSize),by=Math.floor(n.y/bucketSize),key=`${bx}:${by}`;
    let cell=grid.get(key);if(!cell){cell=[];grid.set(key,cell);}cell.push(i);
  }
  for(let i=0;i<nodes.length;i++){
    const a=nodes[i],bx=Math.floor(a.x/bucketSize),by=Math.floor(a.y/bucketSize);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      const cell=grid.get(`${bx+dx}:${by+dy}`);if(!cell)continue;
      for(const j of cell){
        if(j<=i)continue;
        const b=nodes[j],total=a.radius+b.radius,ddx=a.x-b.x,ddy=a.y-b.y;
        if(Math.abs(ddx)>total*1.2||Math.abs(ddy)>total*1.2)continue;
        const factor=Math.min(1,Math.hypot(ddx,ddy)*.82/total);
        a.factor=Math.min(a.factor,factor);b.factor=Math.min(b.factor,factor);
      }
    }
  }
  return Object.fromEntries(nodes.map(n=>[n.code,n.base*Math.max(.0001,n.factor)]));
}
export function convexOutline(points){
  const sorted=[...new Map(points.map(p=>[p.join(':'),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(sorted.length<3)return sorted;
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lower=[],upper=[];
  for(const p of sorted){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(const p of [...sorted].reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
export function geographicPath(collection){
  const points=[],paths=[];
  for(const feature of collection.features??[]){
    const geometry=feature.geometry;if(!geometry)continue;
    const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
    for(const polygon of polygons)for(const ring of polygon){
      const projected=ring.filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])).map(([x,y])=>[x,mercatorLatitude(y)]);
      points.push(...projected);if(projected.length)paths.push(projected.map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join('')+'Z');
    }
  }
  if(!points.length)throw Error('Limite municipal sem geometria válida');
  return {path:paths.join(''),bounds:points.reduce((b,[x,y])=>[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)],[Infinity,Infinity,-Infinity,-Infinity])};
}

/**
 * @param {{ lon: number; lat: number; y: number }} anchor
 * @param {{ cells?: { col: number; row: number }[] } | null | undefined} layout
 * @param {number} scale
 * @param {number[] | null | undefined} bounds
 */
export function clampTownToBoundary(anchor, layout, scale, bounds) {
  if (!layout || !bounds || bounds.length < 4) return anchor;
  const [minLon, minY, maxLon, maxY] = bounds;
  let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
  for (const c of layout.cells ?? []) {
    if (c.col < minCol) minCol = c.col;
    if (c.col > maxCol) maxCol = c.col;
    if (c.row < minRow) minRow = c.row;
    if (c.row > maxRow) maxRow = c.row;
  }
  if (!Number.isFinite(minCol)) return anchor;

  const townMinX = (minCol * 192 - 104) * scale;
  const townMaxX = (maxCol * 192 + 104) * scale;
  const townMinY = (minRow * 192 - 104) * 0.7 * scale;
  const townMaxY = (maxRow * 192 + 104) * 0.7 * scale;

  const padX = Math.max(0.002, (maxLon - minLon) * 0.02);
  const padY = Math.max(0.002, (maxY - minY) * 0.02);

  let lon = anchor.lon;
  let y = anchor.y;

  if (lon + townMaxX > maxLon - padX) {
    lon = maxLon - padX - townMaxX;
  }
  if (lon + townMinX < minLon + padX) {
    lon = minLon + padX - townMinX;
  }
  if (y + townMaxY > maxY - padY) {
    y = maxY - padY - townMaxY;
  }
  if (y + townMinY < minY + padY) {
    y = minY + padY - townMinY;
  }

  return { lon, lat: anchor.lat, y };
}

/**
 * @param {number} code
 * @param {{ lon: number; lat: number; y: number }} seat
 * @param {Record<string | number, [number, number]>} [coastalDrags]
 * @param {{ cells?: { col: number; row: number }[] } | null | undefined} [layout]
 * @param {number} [scale]
 * @param {number[] | null | undefined} [boundaryBounds]
 */
export function computeTownAnchor(code, seat, coastalDrags = {}, layout = null, scale = 0, boundaryBounds = null) {
  let lon = seat.lon;
  let lat = seat.lat;
  const drag = coastalDrags[code] ?? coastalDrags[String(code)];
  if (drag) {
    lon += drag[0];
    lat += drag[1];
  }
  let anchor = { lon, lat, y: mercatorLatitude(lat) };
  if (boundaryBounds && layout && scale > 0) {
    anchor = clampTownToBoundary(anchor, layout, scale, boundaryBounds);
  }
  return anchor;
}

