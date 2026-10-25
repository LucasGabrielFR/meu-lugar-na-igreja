export const BLOCK_SIZE=192;
// Square spiral: existing cells never move when a new parish or block is added.
export function gridCell(index){
  if(index===0)return {col:0,row:0};
  const ring=Math.ceil((Math.sqrt(index+1)-1)/2),side=ring*2,distance=(2*ring+1)**2-1-index;
  if(distance<side)return {col:ring-distance,row:-ring};
  if(distance<side*2)return {col:-ring,row:-ring+distance-side};
  if(distance<side*3)return {col:-ring+distance-side*2,row:ring};
  return {col:ring,row:ring-(distance-side*3)};
}
// Even cells are parish centers; odd cells are stable residential expansion blocks.
// Grouping overflow blocks by powers of two keeps their index polynomial, not exponential.
export function parishBlock(index,block=0){
  if(!block)return gridCell(index*2);
  const group=Math.floor(Math.log2(block)),width=2**group,offset=block-width;
  return gridCell(2**(group+1)*(2*(index*width+offset)+1)+1);
}
const lots=[];
for(let row=-2.5;row<=2.5;row++)for(let col=-2.5;col<=2.5;col++)if(Math.abs(col)>.5||Math.abs(row)>.5)lots.push({x:col*28,y:row*28});
export function neighborhoodGeometry(index){const cell=parishBlock(index);return {...cell,x:cell.col*BLOCK_SIZE,y:cell.row*BLOCK_SIZE};}
export function neighborhoodPlot(slot,index){
  const block=Math.floor(slot/lots.length),cell=parishBlock(index,block),lot=lots[slot%lots.length];
  return {x:cell.col*BLOCK_SIZE+lot.x,y:cell.row*BLOCK_SIZE+lot.y,block,col:cell.col,row:cell.row};
}
function extentRadius(extent){return (extent*BLOCK_SIZE+BLOCK_SIZE/2+12)*Math.SQRT2;}
export function estimateTownRadius(houses,parishes){
  const last=Math.max(0,parishes-1)*2;
  let extent=Math.ceil((Math.sqrt(last+1)-1)/2);
  if(parishes>1)extent=Math.max(1,extent);
  // Only a loading estimate for residents; loaded layouts use the actual occupied cells.
  if(houses>32*Math.max(1,parishes))extent=Math.max(extent,Math.ceil(Math.sqrt(houses/32)));
  return extentRadius(extent);
}
/** @param {import('./types').Parish[]} parishes @param {import('./types').House[]} houses */
export function buildTownLayout(parishes,houses){
  const ordered=[...parishes].sort((a,b)=>a.slot-b.slot),counts=new Map();
  for(const h of houses)counts.set(h.parish_id,(counts.get(h.parish_id)??0)+1);
  const districts=ordered.map(parish=>({parish,index:parish.slot,...neighborhoodGeometry(parish.slot),houses:counts.get(parish.id)??0}));
  const byId=new Map(districts.map(d=>[d.parish.id,d])),blocks=new Map();
  for(const d of districts)blocks.set(`${d.col}:${d.row}`,{col:d.col,row:d.row,parish_id:d.parish.id,core:true});
  const plots=houses.flatMap(house=>{const d=byId.get(house.parish_id);if(!d)return [];const plot=neighborhoodPlot(house.slot,d.index);const key=`${plot.col}:${plot.row}`;
    if(!blocks.has(key))blocks.set(key,{col:plot.col,row:plot.row,parish_id:d.parish.id,core:false});
    return [{house,...plot}];});
  const plaza=gridCell(1);
  if(districts.length>1)blocks.set(`${plaza.col}:${plaza.row}`,{...plaza,parish_id:0,core:false});
  const cells=[...blocks.values()],edges=new Map();
  const edge=(ax,ay,bx,by)=>{const key=[`${ax},${ay}`,`${bx},${by}`].sort().join('|');edges.set(key,{key,ax:ax*BLOCK_SIZE,ay:ay*BLOCK_SIZE,bx:bx*BLOCK_SIZE,by:by*BLOCK_SIZE});};
  for(const cell of cells){const x=cell.col-.5,y=cell.row-.5;
    edge(x,y,x+1,y);edge(x+1,y,x+1,y+1);edge(x+1,y+1,x,y+1);edge(x,y+1,x,y);
    // Shared grid routes connect every block to the central street network.
    let cx=x,cy=y;
    while(cx!==-.5){const next=cx+Math.sign(-.5-cx);edge(cx,cy,next,cy);cx=next;}
    while(cy!==-.5){const next=cy+Math.sign(-.5-cy);edge(cx,cy,cx,next);cy=next;}
  }
  const streets=[...edges.values()],nodes=new Map();
  for(const e of streets)for(const [x,y] of [[e.ax,e.ay],[e.bx,e.by]])nodes.set(`${x}:${y}`,{x,y});
  /** @type {Map<string,{key:string,col:number,row:number,districts:typeof districts}>} */
  const sectors=new Map();
  for(const d of districts){const col=Math.floor(d.col/4),row=Math.floor(d.row/4),key=`${col}:${row}`;
    const sector=sectors.get(key)??{key,col,row,districts:[]};sector.districts.push(d);sectors.set(key,sector);}
  const extent=cells.reduce((max,c)=>Math.max(max,Math.abs(c.col),Math.abs(c.row)),0),trees=[];
  for(const [i,cell] of cells.entries()){
    const x=cell.col*BLOCK_SIZE,y=cell.row*BLOCK_SIZE;
    for(const [n,dx,dy] of [[0,-72,-5],[1,72,8],[2,4,76]]){
      const tree={x:x+dx,y:y+dy,variant:(i+n)%3};
      if(!plots.some(p=>Math.hypot(p.x-tree.x,p.y-tree.y)<23))trees.push(tree);
    }
  }
  return {radius:extentRadius(extent),districts,plots:plots.sort((a,b)=>a.y-b.y||a.house.id-b.house.id),cells,streets,nodes:[...nodes.values()],sectors:[...sectors.values()],trees,plaza:districts.length>1?{x:plaza.col*BLOCK_SIZE,y:plaza.row*BLOCK_SIZE}:null};
}
