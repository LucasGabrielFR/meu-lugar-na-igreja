'use client';
import {useEffect,useId,useState} from 'react';
export default function MunicipalityInput({ name = 'code' }: { name?: string } = {}){
  const id=useId(),[query,setQuery]=useState(''),[options,setOptions]=useState<{code:number;name:string;uf:string}[]>([]);
  useEffect(()=>{
    if(query.trim().length<2)return;
    const controller=new AbortController();
    const timer=setTimeout(()=>{void fetch('/api/municipalities?q='+encodeURIComponent(query),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('lookup');return r.json();}).then(data=>setOptions(data.municipalities)).catch(()=>{});},250);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[query]);
  return <label>Município brasileiro<input name={name} list={id} value={query} onChange={event=>{setQuery(event.target.value);setOptions([]);}} placeholder="Digite o nome ou código IBGE e selecione" required autoComplete="off"/><datalist id={id}>{options.map(m=><option key={m.code} value={m.code}>{m.name} · {m.uf}</option>)}</datalist><span className="field-note">Busca no catálogo local. Selecione o município para preencher o código IBGE.</span></label>;
}
