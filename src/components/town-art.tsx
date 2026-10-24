'use client';
import { useMemo } from 'react';
import { buildTownLayout, seededValue } from '@/lib/town-layout.mjs';
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

export default function TownArt({city,world,layout,bounds,detailed,labels,selectedHouse,selectedParish,onInspect}:{city:City;world:CityWorld;layout:ReturnType<typeof buildTownLayout>;bounds:{left:number;right:number;top:number;bottom:number};detailed:boolean;labels:boolean;selectedHouse:number|null;selectedParish:number|null;onInspect:(selection:MapSelection)=>void}) {
  const depth=useMemo(()=>[...layout.trees.map((tree,i)=>({kind:'tree' as const,x:tree.x,y:tree.y,key:`tree-${i}`,tree})),...layout.plots.map(plot=>({kind:'house' as const,x:plot.x,y:plot.y,key:`house-${plot.house.id}`,plot})),...layout.districts.map(district=>({kind:'church' as const,x:district.x,y:district.y,key:`church-${district.parish.id}`,district}))].sort((a,b)=>a.y-b.y),[layout]);
  const visibleDepth=depth.filter(item=>item.x>bounds.left-90&&item.x<bounds.right+90&&groundY(item.y)>bounds.top-90&&groundY(item.y)<bounds.bottom+90);
  const projected=(x:number,y:number,r:number)=>`${Math.cos(x)*r},${groundY(Math.sin(y)*r)}`;
  return <g className="living-town" data-town={city.code} data-town-houses={world.houses.length}>
    <ellipse cy="7" rx={layout.radius+7} ry={(layout.radius+7)*.7} fill="#405c46" opacity=".17"/>
    <ellipse rx={layout.radius} ry={layout.radius*.7} fill="#a4b77f" stroke="#b7c598" strokeWidth="4"/>
    {layout.districts.map(d=>{const a=d.angle-d.sectorWidth/2,b=d.angle+d.sectorWidth/2;return <path key={d.parish.id} d={`M0 0L${projected(a,a,layout.radius-4)}A${layout.radius-4},${(layout.radius-4)*.7} 0 ${b-a>Math.PI?1:0} 1 ${projected(b,b,layout.radius-4)}Z`} fill={['#b8c690','#a4bc92','#c2c397','#9cb895'][d.index%4]} opacity=".46"/>;})}
    {layout.rings.map(r=><g key={r}><ellipse rx={r} ry={r*.7} fill="none" stroke="#d9d8bd" strokeWidth="13"/><ellipse rx={r} ry={r*.7} fill="none" stroke="#89948b" strokeWidth="8"/><ellipse rx={r} ry={r*.7} fill="none" stroke="#ede6cc" strokeWidth=".8" strokeDasharray="4 5" opacity=".75"/></g>)}
    <ellipse rx="80" ry="56" fill="none" stroke="#d9d8bd" strokeWidth="13"/><ellipse rx="80" ry="56" fill="none" stroke="#89948b" strokeWidth="8"/>
    {layout.districts.map(d=>{const boundary=d.angle+Math.PI/world.parishes.length;return <g key={d.parish.id}><path d={`M${Math.cos(boundary)*27} ${groundY(Math.sin(boundary)*27)}L${Math.cos(boundary)*(layout.radius-12)} ${groundY(Math.sin(boundary)*(layout.radius-12))}`} stroke="#d9d8bd" strokeWidth="12"/><path d={`M${Math.cos(boundary)*27} ${groundY(Math.sin(boundary)*27)}L${Math.cos(boundary)*(layout.radius-12)} ${groundY(Math.sin(boundary)*(layout.radius-12))}`} stroke="#89948b" strokeWidth="7"/><path d={`M0 0L${d.x} ${groundY(d.y)}`} stroke="#ded6b7" strokeWidth="11"/></g>;})}
    <ellipse rx="32" ry="23" fill="#ece1be" stroke="#c9bd99" strokeWidth="2"/><ellipse cy="-1" rx="15" ry="10" fill="#d0b98a"/><ellipse cy="-3" rx="11" ry="7" fill="#70aaa8"/><path d="M0-3V-15" stroke="#c5dfe1" strokeWidth="2"/><path d="M-5-10Q0-21 5-10" fill="none" stroke="#c5dfe1" strokeWidth="1.5"/>
    <path d="M-25 8L-12 13M13 13L26 8" stroke="#97774f" strokeWidth="3"/>
    {visibleDepth.map(item=>item.kind==='tree'?<g key={item.key} transform={`translate(${item.tree.x},${groundY(item.tree.y)})`} pointerEvents="none"><TreeArt variant={item.tree.variant}/></g>:item.kind==='house'?((detailed||item.plot.house.slot%Math.max(1,Math.ceil(world.houses.length/12))===0)&&<g key={item.key} transform={`translate(${item.plot.x},${groundY(item.plot.y)})`} className="town-home" data-house-id={item.plot.house.id} role="button" tabIndex={0} aria-label={`Casa de ${item.plot.house.display_name}`} onClick={event=>{event.stopPropagation();onInspect({city,house:item.plot.house,parish:world.parishes.find(p=>p.id===item.plot.house.parish_id)});}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onInspect({city,house:item.plot.house,parish:world.parishes.find(p=>p.id===item.plot.house.parish_id)});}}}>
      <title>@{item.plot.house.username}</title><HouseArt color={item.plot.house.color} seed={item.plot.house.id} selected={selectedHouse===item.plot.house.id}/>
    </g>):<g key={item.key} transform={`translate(${item.district.x},${groundY(item.district.y)})`} className="town-church" data-parish-id={item.district.parish.id} role="button" tabIndex={0} aria-label={item.district.parish.name} onClick={event=>{event.stopPropagation();onInspect({city,parish:item.district.parish});}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onInspect({city,parish:item.district.parish});}}}>
      <title>{item.district.parish.name} · {item.district.houses} casas</title><ChurchArt level={churchConstructionLevel(item.district.houses)} selected={selectedParish===item.district.parish.id}/>
    </g>)}
    {labels&&layout.districts.map(district=>{const name=district.parish.name.length>30?district.parish.name.slice(0,28)+'…':district.parish.name,width=Math.min(160,name.length*4.2+12),y=-(31+churchConstructionLevel(district.houses)*6)-36;return <g key={district.parish.id} transform={`translate(${district.x},${groundY(district.y)})`} pointerEvents="none"><rect x={-width/2} y={y-10} width={width} height="15" rx="3" fill="#fff9e8" stroke="#cbbb91" strokeWidth=".6"/><text className="town-parish-name" y={y} textAnchor="middle">{name}</text></g>;})}
    {labels&&<g transform="translate(0 33)" pointerEvents="none"><path d="M-39 0H39V13H-39Z" fill="#f2d78e" stroke="#957b4d" strokeWidth="1.4"/><text y="9.5" textAnchor="middle" fill="#314b4a" fontSize="8" fontWeight="700">{city.name.toLocaleUpperCase('pt-BR')}</text></g>}
    {detailed&&layout.rings.flatMap((r,ring)=>Array.from({length:8},(_,i)=>{const a=i*Math.PI/4+.15;return <g key={`${ring}-${i}`} transform={`translate(${Math.cos(a)*(r+8)},${groundY(Math.sin(a)*(r+8))})`} pointerEvents="none"><path d="M0 0V-8" stroke="#8c8b74" strokeWidth=".7"/><circle cy="-8" r="1.7" fill={seededValue(i+ring)>.3?'#fff1b8':'#f5dda4'}/></g>;}))}
  </g>;
}
