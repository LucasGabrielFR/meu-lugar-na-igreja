'use client';
import { useMemo, useState } from 'react';
import { buildTownLayout, BLOCK_SIZE } from '@/lib/town-layout.mjs';
import {selectMapLabels} from '@/lib/map-labels.mjs';
import {streetPath} from '@/lib/map-rendering.mjs';
import { churchConstructionLevel } from '@/lib/layout.mjs';
import type { City, CityWorld, MapSelection } from '@/lib/types';

const groundY=(y:number)=>y*.7;
function HouseArt({color,seed,selected}:{color:string;seed:number;selected:boolean}) {
  const roof=['#ad7054','#6e8392','#bb975e','#806d83'][seed%4];
  return <><ellipse cx="0" cy="2" rx="15" ry="8" fill={selected?'#edd18a':'#8eae78'}/><path d="M-8-10L1-5V8L-8 3Z" fill={color} stroke="#50654f" strokeWidth=".55"/><path d="M1-5L9-10V3L1 8Z" fill="#e3cf9e" stroke="#50654f" strokeWidth=".55"/><path d="M-11-11L0-22L12-13L1-4Z" fill={roof}/><path d="M-11-11L0-22L-1-12L-8-5Z" fill="#d5ae75"/><path d="M-4-5V0L-1 2V-3Z" fill="#fff1b4"/><path d="M4-1L7-3V2L4 4Z" fill="#fff1b4"/><path d="M-7-1L-4 1V6L-7 4Z" fill="#6e6653"/>{seed%3===0&&<path d="M5-20V-27L8-25V-17Z" fill="#9b8269"/>}</>;
}
function ChurchArt({level,selected}:{level:number;selected:boolean}) {
  const tower=31+level*6;
  return <g><ellipse cx="0" cy="9" rx="29" ry="16" fill={selected?'#e9cf8e':'#d9cfad'}/><path d="M-14-24L5-15V19L-14 10Z" fill="#f8edce" stroke="#8b8a6a" strokeWidth=".65"/><path d="M5-15L25-28V6L5 19Z" fill="#dfcea7" stroke="#8b8a6a" strokeWidth=".65"/><path d="M-18-24L-1-40L29-28L5-12Z" fill="#ae7452"/><path d="M-18-24L-1-40L5-26L-14-16Z" fill="#cda46c"/>
    <path d={`M-25 ${-tower}L-13 ${-tower+5}V12L-25 6Z`} fill="#faf0d3" stroke="#8b8a6a" strokeWidth=".6"/><path d={`M-13 ${-tower+5}L-5 ${-tower}V7L-13 12Z`} fill="#d9c49b"/>
    <path d={`M-29 ${-tower}L-18 ${-tower-17}L-1 ${-tower}L-13 ${-tower+6}Z`} fill="#b38d4e"/><path d={`M-18 ${-tower-28}V${-tower-16}M-23 ${-tower-24}H-13`} stroke="#765a30" strokeWidth="2.2"/>
    <path d="M-7 12V1Q-2-8 3 2V17Z" fill="#687f83"/><ellipse cx="-4" cy="-18" rx="3.6" ry="4.5" fill="#d2b057"/>
    {level>=3&&<path d="M14-21L20-24V-15L14-12Z" fill="#fff2bc"/>}
  </g>;
}
function TreeArt({variant}:{variant:number}) {
  const color=['#62885a','#799c68','#8f9b64'][variant];
  return <g><ellipse cx="3" cy="3" rx="9" ry="4" fill="#486d4c" opacity=".18"/><path d="M0 2V-12" stroke="#8b7956" strokeWidth="2"/><path d="M-10-11L-3-22L8-19L12-10L2-6Z" fill={color}/><path d="M-10-11L-3-22L0-12L2-6Z" fill="#7ca06b"/></g>;
}

export default function TownArt({exits,city,world,layout,bounds,unitPixels,selectedHouse,selectedParish,onInspect}:{exits:number[];city:City;world:CityWorld;layout:ReturnType<typeof buildTownLayout>;bounds:{left:number;right:number;top:number;bottom:number};unitPixels:number;selectedHouse:number|null;selectedParish:number|null;onInspect:(selection:MapSelection)=>void}) {
  const [hovered,setHovered]=useState<number|null>(null);
  const blockPixels=BLOCK_SIZE*unitPixels;
  const inView=(x:number,y:number,margin=110)=>x>bounds.left-margin&&x<bounds.right+margin&&groundY(y)>bounds.top-margin&&groundY(y)<bounds.bottom+margin;
  const depth=useMemo(()=>[...layout.trees.map((tree,i)=>({kind:'tree' as const,x:tree.x,y:tree.y,key:`tree-${i}`,tree})),...layout.plots.map(plot=>({kind:'house' as const,x:plot.x,y:plot.y,key:`house-${plot.house.id}`,plot})),...layout.districts.map(district=>({kind:'church' as const,x:district.x,y:district.y,key:`church-${district.parish.id}`,district}))].sort((a,b)=>a.y-b.y),[layout]);
  const visibleDepth=depth.filter(item=>inView(item.x,item.y));
  const streetDrawing=streetPath(layout.streets.filter(s=>inView((s.ax+s.bx)/2,(s.ay+s.by)/2,BLOCK_SIZE)));
  const viewWidth=(bounds.right-bounds.left)*unitPixels,viewHeight=(bounds.bottom-bounds.top)*unitPixels;
  const parishLabels=selectMapLabels(layout.districts.filter(d=>inView(d.x,d.y)&&(blockPixels>=130||d.parish.id===selectedParish||d.parish.id===hovered)).map(d=>({id:d.parish.id,district:d,x:(d.x-bounds.left)*unitPixels,y:(groundY(d.y)-bounds.top)*unitPixels-(65+churchConstructionLevel(d.houses)*6)*unitPixels-34,width:142,height:30,priority:d.parish.id===selectedParish?100000:d.parish.id===hovered?99999:d.houses})),{width:viewWidth,height:viewHeight,padding:5});
  const sectorLabels=blockPixels>=20&&blockPixels<130&&layout.districts.length>12?selectMapLabels(layout.sectors.map((sector,i)=>({id:sector.key,x:(sector.districts.reduce((sum,d)=>sum+d.x,0)/sector.districts.length-bounds.left)*unitPixels,y:(groundY(sector.districts.reduce((sum,d)=>sum+d.y,0)/sector.districts.length)-bounds.top)*unitPixels,width:106,height:24,priority:sector.districts.length,title:`Setor ${i+1}`,count:sector.districts.length})),{width:viewWidth,height:viewHeight,padding:12,limit:12}):[];
  const inspect=(parish:CityWorld['parishes'][number])=>onInspect({city,parish});
  return <g className="living-town" data-town={city.code} data-town-houses={world.houses.length} data-town-layout="blocks">
    {layout.cells.filter(c=>inView(c.col*BLOCK_SIZE,c.row*BLOCK_SIZE,BLOCK_SIZE)).map(cell=><rect key={`${cell.col}:${cell.row}`} x={cell.col*BLOCK_SIZE-88} y={groundY(cell.row*BLOCK_SIZE-88)} width="176" height={176*.7} rx="13" fill={['#afc38d','#a8bd8d','#b8c697'][Math.abs(cell.col+cell.row)%3]} opacity=".48"/>)}
    <g strokeLinejoin="round" strokeLinecap="round" fill="none">
      <g data-town-road-count={layout.streets.length}><path d={streetDrawing} stroke="#d9d8bd" strokeWidth="13"/><path d={streetDrawing} stroke="#89948b" strokeWidth="8"/>{blockPixels>=45&&<path d={streetDrawing} stroke="#eee7d2" strokeWidth=".8" strokeDasharray="5 7"/>}</g>
      {[...new Set(exits)].map(angle=>{const start={x:Math.cos(angle)*(layout.radius+4),y:Math.sin(angle)*(layout.radius+4)};const node=layout.nodes.reduce((nearest,p)=>Math.hypot(p.x-start.x,p.y-start.y)<Math.hypot(nearest.x-start.x,nearest.y-start.y)?p:nearest,layout.nodes[0]??{x:0,y:0});const path=`M${start.x} ${groundY(start.y)}L${node.x} ${groundY(start.y)}L${node.x} ${groundY(node.y)}`;return <g key={angle}><path d={path} stroke="#d9d8bd" strokeWidth="12"/><path d={path} stroke="#89948b" strokeWidth="7"/></g>;})}
    </g>
    {layout.districts.filter(d=>inView(d.x,d.y)).map(d=><g key={d.parish.id} pointerEvents="none"><ellipse cx={d.x} cy={groundY(d.y+13)} rx="39" ry="28" fill="#e4dab8"/><path d={`M${d.x} ${groundY(d.y+40)}V${groundY(d.y+BLOCK_SIZE/2)}`} stroke="#d9d1ae" strokeWidth="6"/></g>)}
    {layout.plaza&&<g transform={`translate(${layout.plaza.x},${groundY(layout.plaza.y)})`} pointerEvents="none"><rect x="-64" y="-40" width="128" height="80" rx="22" fill="#becb9c"/><ellipse rx="32" ry="23" fill="#ece1be" stroke="#c9bd99" strokeWidth="2"/><ellipse cy="-1" rx="15" ry="10" fill="#d0b98a"/><ellipse cy="-3" rx="11" ry="7" fill="#70aaa8"/><path d="M0-3V-15" stroke="#c5dfe1" strokeWidth="2"/><path d="M-5-10Q0-21 5-10" fill="none" stroke="#c5dfe1" strokeWidth="1.5"/><path d="M-25 8L-12 13M13 13L26 8" stroke="#97774f" strokeWidth="3"/></g>}
    {visibleDepth.map(item=>item.kind==='tree'?(blockPixels>=45&&<g key={item.key} transform={`translate(${item.tree.x},${groundY(item.tree.y)})`} pointerEvents="none"><TreeArt variant={item.tree.variant}/></g>):item.kind==='house'?<g key={item.key} transform={`translate(${item.plot.x},${groundY(item.plot.y)})`} className="town-home" data-house-id={item.plot.house.id} role="button" tabIndex={0} aria-label={`Casa de ${item.plot.house.display_name}`} onClick={event=>{event.stopPropagation();onInspect({city,house:item.plot.house,parish:world.parishes.find(p=>p.id===item.plot.house.parish_id)});}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onInspect({city,house:item.plot.house,parish:world.parishes.find(p=>p.id===item.plot.house.parish_id)});}}}>
      <title>@{item.plot.house.username}</title>{blockPixels>=60||selectedHouse===item.plot.house.id?<HouseArt color={item.plot.house.color} seed={item.plot.house.id} selected={selectedHouse===item.plot.house.id}/>:<path d="M-9 4V-7L0-14L10-7V4Z" fill={item.plot.house.color}/>}
    </g>:<g key={item.key} transform={`translate(${item.district.x},${groundY(item.district.y)})`} className="town-church" data-parish-id={item.district.parish.id} role="button" tabIndex={0} aria-label={item.district.parish.name} onPointerEnter={event=>{if(!event.buttons)setHovered(item.district.parish.id);}} onPointerLeave={event=>{if(!event.buttons)setHovered(null);}} onFocus={()=>setHovered(item.district.parish.id)} onBlur={()=>setHovered(null)} onClick={event=>{event.stopPropagation();inspect(item.district.parish);}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();inspect(item.district.parish);}}}>
      <title>{item.district.parish.name} · {item.district.houses} casas</title>{blockPixels>=38?<ChurchArt level={churchConstructionLevel(item.district.houses)} selected={selectedParish===item.district.parish.id}/>:<g><path d="M-13 10V-23L0-36L15-23V10Z" fill="#f3e7c8"/><path d="M-17-23L0-41L19-23Z" fill="#af8050"/><path d="M0-55V-40M-6-49H6" stroke="#715b35" strokeWidth="3"/></g>}
    </g>)}
    {sectorLabels.map(label=><g key={label.id} transform={`translate(${bounds.left+label.x/unitPixels},${bounds.top+label.y/unitPixels}) scale(${1/unitPixels})`} pointerEvents="none"><rect x="-53" y="0" width="106" height="24" rx="7" fill="#fbf5e7" opacity=".94"/><text x="0" y="16" textAnchor="middle" fill="#34524b" fontSize="10">{label.title} · {label.count} paróquias</text></g>)}
    {parishLabels.map(label=>{const name=label.district.parish.name.replace(/^Paróquia\s+/i,'');const words=name.split(' '),lines=[''];for(const word of words){const i=lines.length-1;if((lines[i]+' '+word).trim().length<=24)lines[i]=(lines[i]+' '+word).trim();else if(lines.length<2)lines.push(word);else {lines[i]=lines[i].slice(0,22)+'…';break;}}return <g key={label.id} transform={`translate(${bounds.left+label.x/unitPixels},${bounds.top+label.y/unitPixels}) scale(${1/unitPixels})`} pointerEvents="none"><rect x="-71" width="142" height="30" rx="4" fill="#fff9e8" stroke="#cbbb91" strokeWidth=".8"/>{lines.map((line,i)=><text key={i} y={12+i*12} textAnchor="middle" fill="#294b48" fontSize="10" fontWeight="600">{line}</text>)}</g>;})}
  </g>;
}