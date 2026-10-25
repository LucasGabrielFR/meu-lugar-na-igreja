'use client';
import {useEffect,useMemo,useState} from 'react';
import {roadMercatorY} from '@/lib/map-roads.mjs';
import {roadsForView} from '@/lib/map-rendering.mjs';
type RoadLine={id:string;br:string;uf:string;rank?:number;points:number[][]};
type Tile={key:string;bounds:number[];url:string};
type Snapshot={lines:RoadLine[];tiles?:Tile[];metadata:{attribution:string;features:number}};
export function useRoadData(view:{center:number[];zoom:number;width:number;height:number},enabled:boolean){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[loaded,setLoaded]=useState<Record<string,RoadLine[]>>({}),[failed,setFailed]=useState(false);
  useEffect(()=>{const controller=new AbortController();fetch('/data/highways.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('roads');return r.json();}).then(setSnapshot).catch(()=>{if(!controller.signal.aborted)setFailed(true);});return ()=>controller.abort();},[]);
  const wanted=useMemo(()=>{
    if(!snapshot?.tiles||view.zoom<18||!enabled)return [];
    const units=48/view.zoom/Math.max(1,Math.min(view.width,view.height)),margin=.4;
    const left=view.center[0]-view.width*units/2-margin,right=view.center[0]+view.width*units/2+margin,top=view.center[1]-view.height*units/2-margin,bottom=view.center[1]+view.height*units/2+margin;
    return snapshot.tiles.filter(tile=>tile.bounds[2]>=left&&tile.bounds[0]<=right&&roadMercatorY(tile.bounds[1])>=top&&roadMercatorY(tile.bounds[3])<=bottom)
      .sort((a,b)=>Math.hypot((a.bounds[0]+a.bounds[2])/2-view.center[0],roadMercatorY((a.bounds[1]+a.bounds[3])/2)-view.center[1])-Math.hypot((b.bounds[0]+b.bounds[2])/2-view.center[0],roadMercatorY((b.bounds[1]+b.bounds[3])/2)-view.center[1])).slice(0,16);
  },[snapshot,view,enabled]);
  const wantedKey=wanted.map(tile=>tile.key).sort().join(',');
  useEffect(()=>{
    const controller=new AbortController();
    const selected=wantedKey.split(',').filter(Boolean),tiles=snapshot?.tiles?.filter(tile=>selected.includes(tile.key)&&!loaded[tile.key])??[];
    if(!tiles.length)return ()=>controller.abort();
    void Promise.all(tiles.map(async tile=>{try{const r=await fetch(tile.url,{signal:controller.signal});if(!r.ok)throw Error('road-tile');const json=await r.json();return {key:tile.key,lines:json.lines as RoadLine[]};}catch{if(!controller.signal.aborted)setFailed(true);return null;}})).then(results=>{
      if(controller.signal.aborted)return;
      const successful=results.filter((row):row is {key:string;lines:RoadLine[]}=>row!==null);
      if(!successful.length)return;
      setLoaded(previous=>{const next={...previous,...Object.fromEntries(successful.map(row=>[row.key,row.lines]))};for(const key of Object.keys(next)){if(Object.keys(next).length<=24)break;if(!selected.includes(key))delete next[key];}return next;});
    });
    return ()=>controller.abort();
  },[snapshot,wantedKey,loaded]);
  const mergedLines=useMemo(()=>{
    const merged=new Map((snapshot?.lines??[]).map(line=>[line.id,line]));
    for(const key of wantedKey.split(','))for(const line of loaded[key]??[])merged.set(line.id,line);
    return [...merged.values()];
  },[snapshot,wantedKey,loaded]);
  const highways=useMemo(()=>enabled?roadsForView(mergedLines,view):[],[mergedLines,view,enabled]);
  return {highways,failed,detailTiles:wanted.filter(tile=>loaded[tile.key]).length};
}
