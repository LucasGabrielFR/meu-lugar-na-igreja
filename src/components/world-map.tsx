'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as MapPointerEvent, WheelEvent as MapWheelEvent } from 'react';
import geo from '../../public/data/brasil.json';
import municipalSeats from '../../public/data/municipio-sedes.json';
import { clampMapZoom, visibleMapTiles, zoomAround } from '@/lib/map-navigation.mjs';
import { buildTownLayout, estimateTownRadius } from '@/lib/town-layout.mjs';
import type { City, CityWorld, MapFocus, MapSelection } from '@/lib/types';
import MapLoading from './map-loading';
import TownArt from './town-art';

const states:Record<string,string>={'11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO','21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA','31':'MG','32':'ES','33':'RJ','35':'SP','41':'PR','42':'SC','43':'RS','50':'MS','51':'MT','52':'GO','53':'DF'};
const mercatorY=(latitude:number)=>-Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360))*180/Math.PI;
const seats=new Map((municipalSeats as [number,number,number][]).map(([code,lon,lat])=>[code,{lon,lat,y:mercatorY(lat)}]));
const localScale=(latitude:number)=>3/(111320*Math.cos(latitude*Math.PI/180));
const biome=(uf:string)=>['AC','AM','AP','PA','RO','RR'].includes(uf)?'#779a7d':['AL','BA','CE','PB','PE','PI','RN','SE'].includes(uf)?'#b0b28b':['RS','SC','PR'].includes(uf)?'#9bb38b':'#94a882';
function TownEmblem({size,populated}:{size:number;populated:boolean}) {
  return <g transform={`scale(${size/10})`}><ellipse cy="4" rx="10" ry="5" fill="#d8d7b0" opacity=".8"/><path d="M-5-5H5V7H-5Z" fill="#f4e9cc" stroke="#53674e" strokeWidth=".8"/><path d="M-7-5L0-12L7-5Z" fill="#af8050"/><path d="M0-17V-11M-3-14H3" stroke="#5f6046" strokeWidth="1.1"/><path d="M-1 7V1H2V7" fill="#6f8985"/>{populated&&<><path d="M-12 0L-8-4L-4 0V7H-12Z" fill="#dcca9f" stroke="#6c7b58" strokeWidth=".6"/><path d="M5 1L9-3L13 1V8H5Z" fill="#dcca9f" stroke="#6c7b58" strokeWidth=".6"/></>}</g>;
}

export default function WorldMap({cities,worlds,loadCity,focus,zoom,onZoom,uf,onState,showRoads,selectedHouse,selectedParish,onInspect}:{cities:City[];worlds:Record<number,CityWorld>;loadCity:(code:number)=>Promise<CityWorld>;focus:MapFocus;zoom:number;onZoom:(zoom:number)=>void;uf:string;onState:(uf:string)=>void;showRoads:boolean;selectedHouse:number|null;selectedParish:number|null;onInspect:(selection:MapSelection)=>void}) {
  const container=useRef<HTMLDivElement>(null);
  const [viewport,setViewport]=useState({width:800,height:600});
  const [center,setCenter]=useState<[number,number]>(()=>{const point=focus.code?seats.get(focus.code):null;return point?[point.lon,point.y]:[-54,18];});
  const [tileView,setTileView]=useState({center:[-54,18],zoom:1,width:800,height:600});
  const [settledTiles,setSettledTiles]=useState<Set<string>>(()=>new Set());
  const [loadingExpired,setLoadingExpired]=useState(false);
  const [errors,setErrors]=useState<Record<number,string>>({});
  const appliedFocus=useRef(''),moved=useRef(false);
  const drag=useRef<{id:number;x:number;y:number;center:[number,number]}|null>(null);
  const pointers=useRef(new Map<number,{x:number;y:number}>());
  const pinch=useRef<{distance:number;zoom:number;center:[number,number];anchor:number[]}|null>(null);
  useEffect(()=>{const timer=window.setTimeout(()=>setLoadingExpired(true),8000);return ()=>window.clearTimeout(timer);},[]);
  useEffect(()=>{if(!container.current)return;const observer=new ResizeObserver(([entry])=>setViewport({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(container.current);return ()=>observer.disconnect();},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>setTileView({center,zoom,...viewport}),180);return ()=>window.clearTimeout(timer);},[center,zoom,viewport]);
  const tiles=useMemo(()=>visibleMapTiles(tileView.center,tileView.zoom,tileView.width,tileView.height),[tileView]);
  const layouts=useMemo<Record<number,ReturnType<typeof buildTownLayout>>>(()=>Object.fromEntries(Object.entries(worlds).map(([code,world])=>[code,buildTownLayout(world.parishes,world.houses)])),[worlds]);
  const dimension=48/zoom,units=dimension/Math.max(1,Math.min(viewport.width,viewport.height));
  const shapes=useMemo(()=>geo.features.map(feature=>{
    const geometry=feature.geometry as {type:string;coordinates:number[][][]|number[][][][]};
    const polygons=geometry.type==='Polygon'?[geometry.coordinates as number[][][]]:geometry.coordinates as number[][][][];
    const path=polygons.map(polygon=>polygon.map(ring=>ring.map(([lon,lat],i)=>`${i?'L':'M'}${lon.toFixed(5)},${mercatorY(lat).toFixed(6)}`).join('')+'Z').join('')).join('');
    const ring=polygons[0][0],x=(Math.min(...ring.map(p=>p[0]))+Math.max(...ring.map(p=>p[0])))/2;
    const y=mercatorY((Math.min(...ring.map(p=>p[1]))+Math.max(...ring.map(p=>p[1])))/2);
    return {uf:states[feature.properties.codarea],path,x,y};
  }),[]);
  useEffect(()=>{
    const key=`${focus.sequence}:${viewport.width}:${viewport.height}`;if(appliedFocus.current===key)return;
    const frame=requestAnimationFrame(()=>{
      const point=focus.code?seats.get(focus.code):null;
      if(!point){setCenter([-54,18]);onZoom(1);}
      else {
        const city=cities.find(c=>c.code===focus.code),scale=localScale(point.lat);
        const plot=focus.houseId?layouts[focus.code!]?.plots.find(p=>p.house.id===focus.houseId):null;
        if(plot){setCenter([point.lon+plot.x*scale,point.y+plot.y*.7*scale]);onZoom(8192);}
        else {setCenter([point.lon,point.y]);onZoom(city?.houses?clampMapZoom(48/(estimateTownRadius(city.houses,city.parishes)*scale*3.1)):128);}
      }
      appliedFocus.current=key;
    });
    return ()=>cancelAnimationFrame(frame);
  },[focus,viewport,cities,layouts,onZoom]);
  const visibleCities=cities.flatMap(city=>{
    const point=seats.get(city.code);if(!point)return [];
    const radius=layouts[city.code]?.radius??estimateTownRadius(city.houses,city.parishes),scale=localScale(point.lat);
    const pixels=radius*scale/units;
    if(Math.abs(point.lon-center[0])/units>viewport.width/2+pixels+100||Math.abs(point.y-center[1])/units>viewport.height/2+pixels+100)return [];
    return [{city,point,radius,scale,pixels}];
  });
  const needed=visibleCities.filter(({city,pixels})=>city.active&&pixels>=12&&!worlds[city.code]&&!errors[city.code]).slice(0,4).map(({city})=>city.code).join(',');
  useEffect(()=>{
    let active=true;
    for(const code of needed.split(',').filter(Boolean).map(Number))void loadCity(code).catch(error=>{if(active&&error.name!=='AbortError')setErrors(previous=>({...previous,[code]:'Não foi possível carregar os moradores.'}));});
    return ()=>{active=false;};
  },[needed,loadCity]);
  const pointerPoint=(event:{clientX:number;clientY:number;currentTarget:SVGSVGElement})=>{const box=event.currentTarget.getBoundingClientRect();return [center[0]+(event.clientX-box.left-box.width/2)*units,center[1]+(event.clientY-box.top-box.height/2)*units];};
  const wheelZoom=(event:MapWheelEvent<SVGSVGElement>)=>{
    event.preventDefault();event.stopPropagation();const next=clampMapZoom(zoom*Math.exp(-Math.max(-180,Math.min(180,event.deltaY))*.0025));
    const anchor=pointerPoint(event);setCenter(zoomAround(center,anchor,zoom,next) as [number,number]);onZoom(next);
  };
  const startDrag=(event:MapPointerEvent<SVGSVGElement>)=>{
    if(event.button!==0)return;
    event.preventDefault();window.getSelection()?.removeAllRanges();
    if(!(event.target as Element).closest('[role="button"]'))event.currentTarget.focus({preventScroll:true});
    moved.current=false;pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.current.size===2){const [a,b]=[...pointers.current.values()],box=event.currentTarget.getBoundingClientRect();pinch.current={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom,center,anchor:[center[0]+((a.x+b.x)/2-box.left-box.width/2)*units,center[1]+((a.y+b.y)/2-box.top-box.height/2)*units]};drag.current=null;}
    else drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,center};
    if(!(event.target as Element).closest('[data-town],[data-city-marker]'))event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag=(event:MapPointerEvent<SVGSVGElement>)=>{
    if(pointers.current.has(event.pointerId))pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pinch.current&&pointers.current.size===2){const [a,b]=[...pointers.current.values()],next=clampMapZoom(pinch.current.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.current.distance));moved.current=true;setCenter(zoomAround(pinch.current.center,pinch.current.anchor,pinch.current.zoom,next) as [number,number]);onZoom(next);return;}
    const origin=drag.current;if(!origin||origin.id!==event.pointerId)return;if(!event.buttons){drag.current=null;return;}const dx=event.clientX-origin.x,dy=event.clientY-origin.y;if(Math.hypot(dx,dy)>4)moved.current=true;setCenter([origin.center[0]-dx*units,origin.center[1]-dy*units]);
  };
  const endPointer=(event:MapPointerEvent<SVGSVGElement>)=>{pointers.current.delete(event.pointerId);drag.current=null;pinch.current=null;};
  const failed=visibleCities.find(({city})=>errors[city.code]);
  return <div className="national-map-screen illustrated-world" ref={container}>
    {showRoads&&zoom<2&&settledTiles.size<tiles.length&&!loadingExpired&&<MapLoading label="Preparando a cartografia…" loaded={settledTiles.size} total={Math.max(1,tiles.length)}/>}
    <svg viewBox={`${center[0]-dimension/2} ${center[1]-dimension/2} ${dimension} ${dimension}`} preserveAspectRatio="xMidYMid meet" role="group" tabIndex={0} aria-label="Mapa contínuo do Brasil e suas comunidades" data-map-zoom={zoom.toFixed(2)} onKeyDown={event=>{const step=units*65;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(event.key))event.preventDefault();if(event.key==='ArrowLeft')setCenter([center[0]-step,center[1]]);if(event.key==='ArrowRight')setCenter([center[0]+step,center[1]]);if(event.key==='ArrowUp')setCenter([center[0],center[1]-step]);if(event.key==='ArrowDown')setCenter([center[0],center[1]+step]);if(event.key==='+'||event.key==='=')onZoom(clampMapZoom(zoom*1.35));if(event.key==='-')onZoom(clampMapZoom(zoom/1.35));}} onWheel={wheelZoom} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endPointer} onPointerCancel={endPointer} onClickCapture={event=>{if(moved.current){event.stopPropagation();moved.current=false;}}}>
      <defs><clipPath id="brazil-land-clip">{shapes.map((shape,i)=><path key={i} d={shape.path} clipRule="evenodd"/>)}</clipPath>
        <pattern id="world-ocean" width="38" height="38" patternUnits="userSpaceOnUse" patternTransform={`scale(${units})`}><path d="M4 18Q9 15 14 18T24 18M20 33Q25 30 30 33" stroke="#c5dfe7" strokeWidth=".7" opacity=".35" fill="none"/></pattern>
        <pattern id="world-grass" width="32" height="28" patternUnits="userSpaceOnUse" patternTransform={`scale(${units})`}><ellipse cx="4" cy="7" rx="1.4" ry=".8" fill="#527b55" opacity=".2"/><ellipse cx="22" cy="18" rx="1.1" ry=".7" fill="#426749" opacity=".18"/><path d="M13 25l2-3 2 3" fill="none" stroke="#cfce9c" strokeWidth=".65" opacity=".5"/></pattern>
      </defs>
      <rect x={center[0]-250} y={center[1]-250} width="500" height="500" fill="#91b8ce"/><rect x={center[0]-250} y={center[1]-250} width="500" height="500" fill="url(#world-ocean)"/>
      {shapes.map((shape,i)=><path key={i} d={shape.path} fill={biome(shape.uf)} fillRule="evenodd" stroke="#d7c58b" strokeWidth="1.2" vectorEffect="non-scaling-stroke"/>)}
      <g clipPath="url(#brazil-land-clip)">{showRoads&&tiles.map(tile=><image key={tile.key} href={`https://tile.openstreetmap.org/${tile.key}.png`} x={tile.left} y={tile.top} width={tile.size} height={tile.size} preserveAspectRatio="none" onLoad={()=>setSettledTiles(previous=>new Set(previous).add(tile.key))} onError={()=>setSettledTiles(previous=>new Set(previous).add(tile.key))}/>)}
        <rect x={center[0]-250} y={center[1]-250} width="500" height="500" fill="url(#world-grass)" opacity={showRoads ? .16 : 1}/>
      </g>
      {shapes.map((shape,i)=><g key={i} onClick={()=>shape.uf&&onState(shape.uf)}><path d={shape.path} fill={shape.uf===uf?'#c9ad6c':'transparent'} fillOpacity=".3" stroke="#eee2b8" strokeWidth=".65" vectorEffect="non-scaling-stroke"/>{shape.uf&&zoom>=.8&&zoom<7&&<g transform={`translate(${shape.x},${shape.y}) scale(${units})`}><text className="svg-state-label" textAnchor="middle">{shape.uf}</text></g>}</g>)}
      {zoom<7&&<><path id="illustrative-flight-route" d="M-74,20 Q-55,9 -34,-5" fill="none"/><g className="svg-airplane"><g transform={`scale(${units})`}><text fontSize="20">✈</text></g><animateMotion dur="23s" repeatCount="indefinite" rotate="auto"><mpath href="#illustrative-flight-route"/></animateMotion></g></>}
      {visibleCities.map(({city,point,scale,pixels})=>{
        const world=worlds[city.code],layout=layouts[city.code],town=!!world?.parishes.length&&pixels>=18;
        const labelY=Math.max(24,pixels*.7+30);
        return <g key={city.code} data-city-marker={city.code} data-seat-longitude={point.lon} data-seat-latitude={point.lat} transform={`translate(${point.lon},${point.y})`} onClick={()=>onInspect({city})}>
          {town?<g transform={`scale(${scale})`}><TownArt city={city} world={world} layout={layout} bounds={{left:(center[0]-viewport.width*units/2-point.lon)/scale,right:(center[0]+viewport.width*units/2-point.lon)/scale,top:(center[1]-viewport.height*units/2-point.y)/scale,bottom:(center[1]+viewport.height*units/2-point.y)/scale}} detailed={pixels>=100} labels={pixels>=180} selectedHouse={selectedHouse} selectedParish={selectedParish} onInspect={onInspect}/></g>:<g transform={`scale(${units})`} role="button" tabIndex={0} className="world-city-emblem" aria-label={`Informações de ${city.name}`} onClick={event=>{event.stopPropagation();onInspect({city});}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onInspect({city});}}}><rect x="-18" y="-22" width="36" height="42" fill="transparent"/><TownEmblem size={4+Math.min(6,Math.log2(city.houses+1))} populated={city.houses>0}/></g>}
          {(zoom>=1.5||focus.code===city.code)&&<g transform={`scale(${units})`} pointerEvents="none"><text y={town?labelY:26} textAnchor="middle" className="svg-city-name">{city.name}</text>{pixels>=45&&<text y={labelY+16} textAnchor="middle" className="svg-city-count">{city.houses} casas · {city.parishes} bairros paroquiais</text>}</g>}
        </g>;
      })}
    </svg>
    {failed&&<div className="world-data-status" role="status">{errors[failed.city.code]} <button onClick={()=>setErrors(previous=>{const next={...previous};delete next[failed.city.code];return next;})}>Tentar novamente</button></div>}
  </div>;
}
