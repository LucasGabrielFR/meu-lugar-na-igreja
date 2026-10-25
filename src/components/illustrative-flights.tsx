'use client';
import {useEffect,useRef,useState} from 'react';
import {createIllustrativeFlight,flightOnScreen,flightBudget} from '@/lib/illustrative-flights.mjs';
type Camera={center:[number,number];units:number;viewport:{width:number;height:number}};
type Flight=ReturnType<typeof createIllustrativeFlight>&{id:number;born:number};
function beginFlight(animation:SVGAnimateMotionElement|null){
  // SMIL defaults to the document's time zero, not the insertion time of a new flight.
  if(animation)animation.beginElement();
}
export default function IllustrativeFlights({center,units,viewport,active}:{center:[number,number];units:number;viewport:{width:number;height:number};active:boolean}){
  const [flights,setFlights]=useState<Flight[]>([]);
  const camera=useRef<Camera>({center,units,viewport}),current=useRef<Flight[]>([]),sequence=useRef(0),layer=useRef<SVGGElement>(null);
  useEffect(()=>{camera.current={center,units,viewport};},[center,units,viewport]);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    let intersecting=true,disposed=false,timer:ReturnType<typeof setTimeout>|undefined;
    let nextAt=performance.now()+800+Math.random()*1400;
    const update=()=>{
      if(disposed)return;
      if(timer)clearTimeout(timer);
      const now=performance.now(),view=camera.current;
      if(!active||document.visibilityState!=='visible'||media.matches||!intersecting){
        if(current.current.length){current.current=[];setFlights([]);}
        nextAt=now+800+Math.random()*1400;return;
      }
      const budget=flightBudget(view.viewport);
      const remaining=current.current.filter(f=>flightOnScreen(f,view,now)).slice(0,budget);
      if(remaining.length<current.current.length&&!remaining.length)nextAt=Math.min(nextAt,now+1000+Math.random()*2000);
      if(now>=nextAt&&remaining.length<budget){
        remaining.push({...createIllustrativeFlight(view),id:++sequence.current,born:now});
        nextAt=now+7500+Math.random()*7500;
      }
      if(remaining.length!==current.current.length||remaining.some((f,i)=>f.id!==current.current[i]?.id)){
        current.current=remaining;setFlights(remaining);
      }
      timer=setTimeout(update,250);
    };
    document.addEventListener('visibilitychange',update);media.addEventListener('change',update);
    const observer=new IntersectionObserver(entries=>{intersecting=entries.some(entry=>entry.isIntersecting);update();});
    const svg=layer.current?.ownerSVGElement;if(svg)observer.observe(svg);
    timer=setTimeout(update,100);
    return ()=>{disposed=true;if(timer)clearTimeout(timer);observer.disconnect();document.removeEventListener('visibilitychange',update);media.removeEventListener('change',update);};
  },[active]);
  return <g ref={layer} className="illustrative-flights" pointerEvents="none" aria-hidden="true" visibility={active?undefined:'hidden'} data-flight-count={flights.length}>
    {flights.map(flight=><g key={flight.id} data-illustrative-flight={flight.id}>
      <g transform={`scale(${units*flight.size/28})`} className="illustrative-flight-art"><path d="M-62 0H-19" stroke="#fffdf2" strokeWidth="1.3" opacity=".25"/><path d="M14 0L6-2L-1-12L-5-12L-2-2L-10-2L-14-6L-16-6L-14 0L-16 6L-14 6L-10 2L-2 2L-5 12L-1 12L6 2Z" fill="#fffdf2" stroke="#6d868b" strokeWidth=".6" strokeLinejoin="round"/><path d="M8-1L11 0L8 1" fill="#8da5b2"/></g>
      <animateMotion ref={beginFlight} begin="indefinite" path={flight.path} dur={`${flight.duration/1000}s`} rotate="auto" fill="freeze"/>
    </g>)}
  </g>;
}
