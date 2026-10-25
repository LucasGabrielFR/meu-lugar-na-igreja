'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as MapPointerEvent, WheelEvent as MapWheelEvent } from 'react';
import geo from '../../public/data/brasil.json';
import municipalSeats from '../../public/data/municipio-sedes.json';
import { clampMapZoom, visibleMapTiles, zoomAround } from '@/lib/map-navigation.mjs';
import { buildTownLayout, estimateTownRadius } from '@/lib/town-layout.mjs';
import {minimumLabelParishes,selectMapLabels} from '@/lib/map-labels.mjs';
import {buildTownScales,regionFor,STATE_NAMES} from '@/lib/map-territories.mjs';
import {cachedTownLayout,cachedTownOutline,scopedCityCodes} from '@/lib/map-rendering.mjs';
import type { City, CityWorld, MapFocus, MapSelection } from '@/lib/types';
import MapLoading from './map-loading';
import TownArt from './town-art';
import {buildRoadConnections} from '@/lib/map-roads.mjs';
import MapRoadLayer from './map-road-layer';
import IllustrativeFlights from './illustrative-flights';
import {useRoadData} from './use-road-data';

const states:Record<string,string>={'11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO','21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA','31':'MG','32':'ES','33':'RJ','35':'SP','41':'PR','42':'SC','43':'RS','50':'MS','51':'MT','52':'GO','53':'DF'};
const mercatorY=(latitude:number)=>-Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360))*180/Math.PI;
const seats=new Map((municipalSeats as [number,number,number][]).map(([code,lon,lat])=>[code,{lon,lat,y:mercatorY(lat)}]));
const localScale=(latitude:number)=>3/(111320*Math.cos(latitude*Math.PI/180));
const biome=(uf:string)=>['AC','AM','AP','PA','RO','RR'].includes(uf)?'#779a7d':['AL','BA','CE','PB','PE','PI','RN','SE'].includes(uf)?'#b0b28b':['RS','SC','PR'].includes(uf)?'#9bb38b':'#94a882';
function TownEmblem({size,populated}:{size:number;populated:boolean}) {
  return <g transform={`scale(${size/10})`}><ellipse cy="4" rx="10" ry="5" fill="#d8d7b0" opacity=".8"/><path d="M-5-5H5V7H-5Z" fill="#f4e9cc" stroke="#53674e" strokeWidth=".8"/><path d="M-7-5L0-12L7-5Z" fill="#af8050"/><path d="M0-17V-11M-3-14H3" stroke="#5f6046" strokeWidth="1.1"/><path d="M-1 7V1H2V7" fill="#6f8985"/>{populated&&<><path d="M-12 0L-8-4L-4 0V7H-12Z" fill="#dcca9f" stroke="#6c7b58" strokeWidth=".6"/><path d="M5 1L9-3L13 1V8H5Z" fill="#dcca9f" stroke="#6c7b58" strokeWidth=".6"/></>}</g>;
}

export default function WorldMap({cities,worlds,loadCity,focus,zoom,onZoom,uf,onState,showRoads,showHighways,selectedHouse,selectedParish,selectedCity,animateFlights,onInspect}:{cities:City[];worlds:Record<number,CityWorld>;loadCity:(code:number)=>Promise<CityWorld>;focus:MapFocus;zoom:number;onZoom:(zoom:number)=>void;uf:string;onState:(uf:string)=>void;showRoads:boolean;showHighways:boolean;selectedHouse:number|null;selectedParish:number|null;selectedCity:number|null;animateFlights:boolean;onInspect:(selection:MapSelection)=>void}) {
  const container=useRef<HTMLDivElement>(null);
  const [viewport,setViewport]=useState({width:800,height:600});
  const [center,setCenter]=useState<[number,number]>(()=>{const point=focus.code?seats.get(focus.code):null;return point?[point.lon,point.y]:[-54,18];});
  const [tileView,setTileView]=useState({center:[-54,18],zoom:1,width:800,height:600});
  const [settledTiles,setSettledTiles]=useState<Set<string>>(()=>new Set());
  const [loadingExpired,setLoadingExpired]=useState(false);
  const [errors,setErrors]=useState<Record<number,string>>({});
  const [hoveredCity,setHoveredCity]=useState<number|null>(null),[hoveredParish,setHoveredParish]=useState<number|null>(null),[hoveredState,setHoveredState]=useState<string|null>(null);
  const [boundary,setBoundary]=useState<{code:number;path:string;bounds:number[]}|null>(null),[boundaryError,setBoundaryError]=useState<{code:number;message:string}|null>(null);
  const boundaryStatus=!selectedCity?'':boundary?.code===selectedCity?'Azul: limite municipal simplificado · IBGE':boundaryError?.code===selectedCity?boundaryError.message:'Carregando limite municipal…';
  const {highways,failed:roadsFailed,detailTiles}=useRoadData(tileView,showHighways);
  const appliedFocus=useRef(''),moved=useRef(false);
  const drag=useRef<{id:number;x:number;y:number;center:[number,number];units:number}|null>(null);
  const pointers=useRef(new Map<number,{x:number;y:number}>());
  const pinch=useRef<{distance:number;zoom:number;center:[number,number];anchor:number[]}|null>(null);
  const liveCamera=useRef({center,zoom}),cameraFrame=useRef<number|null>(null),inputUntil=useRef(0);
  useEffect(()=>{if(cameraFrame.current===null)liveCamera.current={center,zoom};},[center,zoom]);
  useEffect(()=>()=>{if(cameraFrame.current!==null)cancelAnimationFrame(cameraFrame.current);},[]);
  const queueCamera=useCallback((nextCenter:[number,number],nextZoom:number)=>{
    liveCamera.current={center:nextCenter,zoom:nextZoom};inputUntil.current=performance.now()+180;
    if(cameraFrame.current!==null)return;
    cameraFrame.current=requestAnimationFrame(()=>{cameraFrame.current=null;setCenter(liveCamera.current.center);onZoom(liveCamera.current.zoom);});
  },[onZoom]);
  useEffect(()=>{const timer=window.setTimeout(()=>setLoadingExpired(true),8000);return ()=>window.clearTimeout(timer);},[]);
  useEffect(()=>{if(!container.current)return;const observer=new ResizeObserver(([entry])=>setViewport({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(container.current);return ()=>observer.disconnect();},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>setTileView({center,zoom,...viewport}),180);return ()=>window.clearTimeout(timer);},[center,zoom,viewport]);
  const tiles=useMemo(()=>visibleMapTiles(tileView.center,tileView.zoom,tileView.width,tileView.height),[tileView]);
  const layouts=useMemo<Record<number,ReturnType<typeof buildTownLayout>>>(()=>Object.fromEntries(Object.entries(worlds).map(([code,world])=>[code,cachedTownLayout(world)])),[worlds]);
  const estimatedRadii=useMemo(()=>Object.fromEntries(cities.map(city=>[city.code,estimateTownRadius(city.houses,city.parishes)])),[cities]);
  const radiusOverrides=JSON.stringify(Object.entries(layouts).filter(([code,layout])=>layout.radius!==estimatedRadii[code]).map(([code,layout])=>[code,layout.radius]).sort((a,b)=>Number(a[0])-Number(b[0])));
  const radii=useMemo(()=>({...estimatedRadii,...Object.fromEntries(JSON.parse(radiusOverrides))}),[estimatedRadii,radiusOverrides]);
  const townScales=useMemo(()=>buildTownScales(cities,seats,radii),[cities,radii]);
  const outlines=useMemo(()=>Object.fromEntries(Object.entries(layouts).map(([code,layout])=>[code,cachedTownOutline(layout)])),[layouts]);
  const roadNetwork=useMemo(()=>highways.length&&tileView.zoom>=8?buildRoadConnections(cities,seats,highways,radii,townScales,scopedCityCodes(cities,seats,tileView,radii,townScales)):{connections:[],exits:{} as Record<number,number[]>,towns:[],unconnected:[]},[cities,highways,radii,townScales,tileView]);
  useEffect(()=>{
    if(!selectedCity)return;
    const controller=new AbortController();
    fetch(`/api/cities/${selectedCity}/boundary`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('boundary');const data=await response.json();if(!controller.signal.aborted)setBoundary(data);}).catch(()=>{if(!controller.signal.aborted)setBoundaryError({code:selectedCity,message:'Limite municipal indisponível agora. Área virtual destacada.'});});
    return ()=>controller.abort();
  },[selectedCity]);
  const dimension=48/zoom,units=dimension/Math.max(1,Math.min(viewport.width,viewport.height));
  const shapes=useMemo(()=>geo.features.map(feature=>{
    const geometry=feature.geometry as {type:string;coordinates:number[][][]|number[][][][]};
    const polygons=geometry.type==='Polygon'?[geometry.coordinates as number[][][]]:geometry.coordinates as number[][][][];
    const path=polygons.map(polygon=>polygon.map(ring=>ring.map(([lon,lat],i)=>`${i?'L':'M'}${lon.toFixed(5)},${mercatorY(lat).toFixed(6)}`).join('')+'Z').join('')).join('');
    const ring=polygons[0][0],x=(Math.min(...ring.map(p=>p[0]))+Math.max(...ring.map(p=>p[0])))/2;
    const y=mercatorY((Math.min(...ring.map(p=>p[1]))+Math.max(...ring.map(p=>p[1])))/2);
    const coordinates=polygons.flatMap(p=>p.flatMap(r=>r.map(([lon,lat])=>[lon,mercatorY(lat)])));
    const bounds=coordinates.reduce((b,[lon,lat])=>[Math.min(b[0],lon),Math.min(b[1],lat),Math.max(b[2],lon),Math.max(b[3],lat)],[Infinity,Infinity,-Infinity,-Infinity]);
    return {uf:states[feature.properties.codarea],path,x,y,bounds};
  }),[]);
  useEffect(()=>{
    const key=`${focus.sequence}:${viewport.width}:${viewport.height}`;if(appliedFocus.current===key)return;
    const frame=requestAnimationFrame(()=>{
      const point=focus.code?seats.get(focus.code):null;
      if(!point){
        const parts=shapes.filter(s=>focus.uf?s.uf===focus.uf:focus.region?regionFor(s.uf)===focus.region:false);
        if(parts.length){const box=parts.reduce((b,s)=>[Math.min(b[0],s.bounds[0]),Math.min(b[1],s.bounds[1]),Math.max(b[2],s.bounds[2]),Math.max(b[3],s.bounds[3])],[Infinity,Infinity,-Infinity,-Infinity]);setCenter([(box[0]+box[2])/2,(box[1]+box[3])/2]);onZoom(clampMapZoom(48/Math.max((box[2]-box[0])*Math.min(viewport.width,viewport.height)/viewport.width,(box[3]-box[1])*Math.min(viewport.width,viewport.height)/viewport.height)/1.2));}
        else {setCenter([-54,18]);onZoom(1);}
      }
      else {
        const city=cities.find(c=>c.code===focus.code),scale=townScales[focus.code!]??localScale(point.lat);
        const plot=focus.houseId?layouts[focus.code!]?.plots.find(p=>p.house.id===focus.houseId):null;
        const district=focus.parishId?layouts[focus.code!]?.districts.find(p=>p.parish.id===focus.parishId):null;
        if(focus.municipal){if(boundary?.code!==focus.code)return;const box=boundary.bounds;setCenter([(box[0]+box[2])/2,(box[1]+box[3])/2]);onZoom(clampMapZoom(48/Math.max((box[2]-box[0])*Math.min(viewport.width,viewport.height)/viewport.width,(box[3]-box[1])*Math.min(viewport.width,viewport.height)/viewport.height)/1.2));}
        else if(plot){setCenter([point.lon+plot.x*scale,point.y+plot.y*.7*scale]);onZoom(clampMapZoom(48/(100*scale)));}
        else if(district){setCenter([point.lon+district.x*scale,point.y+district.y*.7*scale]);onZoom(clampMapZoom(48/(384*scale)));}
        else {setCenter([point.lon,point.y]);onZoom(city?.parishes?clampMapZoom(48/((layouts[city.code]?.radius??estimateTownRadius(city.houses,city.parishes))*scale*3.1)):128);}
      }
      appliedFocus.current=key;
    });
    return ()=>cancelAnimationFrame(frame);
  },[focus,viewport,cities,layouts,onZoom,townScales,shapes,boundary]);
  const visibleCities=cities.flatMap(city=>{
    const point=seats.get(city.code);if(!point)return [];
    const radius=layouts[city.code]?.radius??estimateTownRadius(city.houses,city.parishes),scale=townScales[city.code]??localScale(point.lat);
    const pixels=radius*scale/units;
    if(Math.abs(point.lon-center[0])/units>viewport.width/2+pixels+100||Math.abs(point.y-center[1])/units>viewport.height/2+pixels+100)return [];
    return [{city,point,radius,scale,pixels}];
  });
  const needed=visibleCities.filter(({city,pixels})=>city.active&&pixels>=12&&!worlds[city.code]&&!errors[city.code]).slice(0,4).map(({city})=>city.code).join(',');
  const minimumParishes=minimumLabelParishes(zoom);
  const cityLabels=selectMapLabels(visibleCities.filter(({city})=>city.parishes>=minimumParishes||city.code===focus.code).map(({city,point,pixels})=>{
    return {id:city.code,x:(point.lon-center[0])/units+viewport.width/2,y:(point.y-center[1])/units+viewport.height/2-36,width:Math.max(65,city.name.length*7+14),height:pixels>=45?34:19,priority:(city.code===selectedCity?1e9:0)+city.parishes*100+Math.log2(city.houses+1)};
  }),{...viewport,limit:Math.max(5,Math.floor(viewport.width*viewport.height/18000)),padding:7});
  const cityLabelIds=new Set(cityLabels.map(label=>label.id));
  useEffect(()=>{
    let active=true;
    for(const code of needed.split(',').filter(Boolean).map(Number))void loadCity(code).catch(error=>{if(active&&error.name!=='AbortError')setErrors(previous=>({...previous,[code]:'Não foi possível carregar os moradores.'}));});
    return ()=>{active=false;};
  },[needed,loadCity]);
  const wheelZoom=(event:MapWheelEvent<SVGSVGElement>)=>{
    event.preventDefault();event.stopPropagation();const current=liveCamera.current,next=clampMapZoom(current.zoom*Math.exp(-Math.max(-180,Math.min(180,event.deltaY))*.0025));
    const box=event.currentTarget.getBoundingClientRect(),step=48/current.zoom/Math.min(viewport.width,viewport.height);
    const anchor=[current.center[0]+(event.clientX-box.left-box.width/2)*step,current.center[1]+(event.clientY-box.top-box.height/2)*step];
    queueCamera(zoomAround(current.center,anchor,current.zoom,next) as [number,number],next);
  };
  const startDrag=(event:MapPointerEvent<SVGSVGElement>)=>{
    if(event.button!==0)return;
    event.preventDefault();window.getSelection()?.removeAllRanges();
    if(!(event.target as Element).closest('[role="button"]'))event.currentTarget.focus({preventScroll:true});
    moved.current=false;pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.current.size===2){const [a,b]=[...pointers.current.values()],box=event.currentTarget.getBoundingClientRect();pinch.current={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom,center,anchor:[center[0]+((a.x+b.x)/2-box.left-box.width/2)*units,center[1]+((a.y+b.y)/2-box.top-box.height/2)*units]};drag.current=null;}
    else drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,center:liveCamera.current.center,units:48/liveCamera.current.zoom/Math.min(viewport.width,viewport.height)};
    if(!(event.target as Element).closest('[data-town],[data-city-marker]'))event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag=(event:MapPointerEvent<SVGSVGElement>)=>{
    if(pointers.current.has(event.pointerId))pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pinch.current&&pointers.current.size===2){const [a,b]=[...pointers.current.values()],next=clampMapZoom(pinch.current.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.current.distance));moved.current=true;queueCamera(zoomAround(pinch.current.center,pinch.current.anchor,pinch.current.zoom,next) as [number,number],next);return;}
    const origin=drag.current;if(!origin||origin.id!==event.pointerId)return;if(!event.buttons){drag.current=null;return;}const dx=event.clientX-origin.x,dy=event.clientY-origin.y;if(Math.hypot(dx,dy)>4)moved.current=true;queueCamera([origin.center[0]-dx*origin.units,origin.center[1]-dy*origin.units],liveCamera.current.zoom);
  };
  const endPointer=(event:MapPointerEvent<SVGSVGElement>)=>{pointers.current.delete(event.pointerId);drag.current=null;pinch.current=null;};
  const failed=visibleCities.find(({city})=>errors[city.code]);
  const summaryCity=cities.find(c=>c.code===(hoveredCity??(hoveredState?null:selectedCity)));
  const summaryParish=summaryCity&&(hoveredParish??selectedParish)?worlds[summaryCity.code]?.parishes.find(p=>p.id===(hoveredParish??selectedParish)):null;
  const stateCities=hoveredState?cities.filter(c=>c.active&&c.uf===hoveredState):[];
  return <div className="national-map-screen illustrated-world" ref={container} data-road-detail-tiles={detailTiles}>
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
      {shapes.map((shape,i)=><g key={i} onPointerEnter={()=>setHoveredState(shape.uf)} onPointerLeave={()=>setHoveredState(null)} onClick={()=>shape.uf&&onState(shape.uf)}><path d={shape.path} fill={shape.uf===uf||focus.region===regionFor(shape.uf)||hoveredState===shape.uf?'#c9ad6c':'transparent'} fillOpacity=".3" stroke="#eee2b8" strokeWidth=".65" vectorEffect="non-scaling-stroke"/>{shape.uf&&zoom>=.8&&zoom<7&&<g transform={`translate(${shape.x},${shape.y}) scale(${units})`}><text className="svg-state-label" textAnchor="middle">{shape.uf}</text></g>}</g>)}
      {boundary&&boundary.code===selectedCity&&<path d={boundary.path} fill="#4c93b0" fillOpacity=".06" stroke="#247b9d" strokeWidth="2" strokeDasharray="7 4" vectorEffect="non-scaling-stroke" onPointerEnter={()=>{setHoveredState(null);setHoveredCity(boundary.code);}} onPointerLeave={()=>setHoveredCity(null)} onClick={()=>{const city=cities.find(c=>c.code===boundary.code);if(city)onInspect({city});}}/>}{showHighways&&<MapRoadLayer roads={highways} connections={roadNetwork.connections} towns={roadNetwork.towns} zoom={zoom} center={center} units={units} viewport={viewport}/>}
      {visibleCities.filter(({city,pixels})=>pixels>=18||zoom>=8||city.parishes>=Math.max(1,Math.floor(minimumParishes/3))||city.code===focus.code).map(({city,point,scale,pixels})=>{
        const world=worlds[city.code],layout=layouts[city.code],town=!!world?.parishes.length&&pixels>=18;
        const labelY=-24;
        return <g key={city.code} data-city-marker={city.code} data-seat-longitude={point.lon} data-seat-latitude={point.lat} transform={`translate(${point.lon},${point.y})`} onPointerOver={event=>{if(performance.now()<inputUntil.current)return;setHoveredCity(city.code);const parish=(event.target as Element).closest('[data-parish-id]');setHoveredParish(parish?Number(parish.getAttribute('data-parish-id')):null);}} onPointerLeave={()=>{if(performance.now()<inputUntil.current)return;setHoveredCity(null);setHoveredParish(null);}} onClick={()=>onInspect({city})}>
          {town?<g transform={`scale(${scale})`}><path d={outlines[city.code]} fill="transparent" role="button" tabIndex={0} aria-label={`Território virtual de ${city.name}`} onFocus={()=>setHoveredCity(city.code)} onBlur={()=>setHoveredCity(null)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();onInspect({city});}}}/><TownArt exits={showHighways?(roadNetwork.exits[city.code]??[]):[]} city={city} world={world} layout={layout} bounds={{left:(center[0]-viewport.width*units/2-point.lon)/scale,right:(center[0]+viewport.width*units/2-point.lon)/scale,top:(center[1]-viewport.height*units/2-point.y)/scale,bottom:(center[1]+viewport.height*units/2-point.y)/scale}} unitPixels={scale/units} selectedHouse={selectedHouse} selectedParish={selectedParish} onInspect={onInspect}/>{(hoveredCity===city.code||selectedCity===city.code)&&<path d={outlines[city.code]} fill="#c8a14c" fillOpacity=".06" stroke="#c99a35" strokeWidth="2.5" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}</g>:<g transform={`scale(${units})`} role="button" tabIndex={0} className="world-city-emblem" aria-label={`Informações de ${city.name}`} onClick={event=>{event.stopPropagation();onInspect({city});}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onInspect({city});}}}><rect x="-18" y="-22" width="36" height="42" fill="transparent"/><TownEmblem size={4+Math.min(6,Math.log2(city.houses+1))} populated={city.houses>0}/></g>}
          {cityLabelIds.has(city.code)&&!(selectedParish&&selectedCity===city.code)&&<g data-city-label={city.code} transform={`scale(${units})`} pointerEvents="none"><text y={labelY} textAnchor="middle" className="svg-city-name">{city.name}</text>{pixels>=45&&<text y={labelY+16} textAnchor="middle" className="svg-city-count">{city.houses} casas · {city.parishes} bairros paroquiais</text>}</g>}
        </g>;
      })}
      <IllustrativeFlights center={center} units={units} viewport={viewport} active={animateFlights}/>
    </svg>
    {summaryCity?<aside className="map-hover-summary" role="status"><small>{summaryParish?'PARÓQUIA':'CIDADE · ÁREA VIRTUAL'}</small><strong>{summaryParish?.name??summaryCity.name}</strong><span>{summaryParish?`${summaryCity.name} · `:''}{STATE_NAMES[summaryCity.uf]} ({summaryCity.uf}) · {regionFor(summaryCity.uf)}</span><span>{summaryParish?`${worlds[summaryCity.code]?.houses.filter(h=>h.parish_id===summaryParish.id).length??0} casas nesta paróquia`:`${summaryCity.parishes} paróquias · ${summaryCity.houses} casas`}</span>{!summaryParish&&<small>Clique na área para ver a cidade; numa igreja para ver a paróquia.</small>}<small>Dourado: área ilustrada{boundaryStatus&&selectedCity===summaryCity.code?` · ${boundaryStatus}`:''}</small></aside>:hoveredState?<aside className="map-hover-summary" role="status"><small>ESTADO · {regionFor(hoveredState)}</small><strong>{STATE_NAMES[hoveredState]}</strong><span>{stateCities.length} cidades no mapa · {stateCities.reduce((sum,c)=>sum+c.parishes,0)} paróquias</span><span>{stateCities.reduce((sum,c)=>sum+c.houses,0)} casas</span><small>Clique para explorar o estado.</small></aside>:null}
    {roadsFailed&&showHighways&&<div className="world-data-status" role="status">Não foi possível carregar as rodovias. Recarregue o mapa para tentar novamente.</div>}
    {failed&&<div className="world-data-status" role="status">{errors[failed.city.code]} <button onClick={()=>setErrors(previous=>{const next={...previous};delete next[failed.city.code];return next;})}>Tentar novamente</button></div>}
  </div>;
}
