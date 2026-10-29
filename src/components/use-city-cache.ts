'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CityWorld, World } from '@/lib/types';

export function useCityCache(initial:World,initialCity:number|null) {
  const [worlds,setWorlds]=useState<Record<number,CityWorld>>(()=>initialCity?{[initialCity]:{parishes:initial.parishes,houses:initial.houses}}:{});
  const cache=useRef(worlds);
  const inflight=useRef(new Map<number,{controller:AbortController;promise:Promise<CityWorld>}>());
  useEffect(()=>{const requests=inflight.current;return ()=>{for(const request of requests.values())request.controller.abort();requests.clear();};},[]);
  const loadCity=useCallback((code:number,force=false):Promise<CityWorld>=>{
    if(!force&&cache.current[code])return Promise.resolve(cache.current[code]);
    const existing=inflight.current.get(code);if(!force&&existing)return existing.promise;
    const controller=new AbortController();
    const promise=fetch(`/api/cities/${code}`,{signal:controller.signal}).then(async response=>{
      if(!response.ok)throw new Error('Não foi possível carregar a comunidade.');
      const world=await response.json() as CityWorld;
      if(!Array.isArray(world.houses)||!Array.isArray(world.parishes))throw new Error('Dados indisponíveis.');
      if(!controller.signal.aborted){cache.current={...cache.current,[code]:world};setWorlds(cache.current);}
      return world;
    }).finally(()=>{if(inflight.current.get(code)?.controller===controller)inflight.current.delete(code);});
    inflight.current.set(code,{controller,promise});
    return promise;
  },[]);
  return {worlds,loadCity};
}
