'use client';
import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import type { FormState } from '@/lib/types';
import { submitParticipation } from '@/app/actions';

type Parish={city_code:number;name:string};
type Municipality={code:number;name:string;uf:string};
export default function ParticipationForm({parishes,initialMunicipality}:{parishes:Parish[];initialMunicipality?:Municipality}) {
  const [state,action,pending]=useActionState(submitParticipation,{} as FormState);
  const [cityCode,setCityCode]=useState(initialMunicipality?String(initialMunicipality.code):'');
  const [cityQuery,setCityQuery]=useState(initialMunicipality?`${initialMunicipality.name} · ${initialMunicipality.uf}`:'');
  const [fetchedCityResults,setCityResults]=useState<Municipality[]>([]);
  const cityResults=cityCode||cityQuery.trim().length<2?[]:fetchedCityResults;
  const [cityOpen,setCityOpen]=useState(false);
  const [cityError,setCityError]=useState('');
  const [activeCity, setActiveCity]=useState(0);
  const cityParishes=parishes.filter(p=>p.city_code===Number(cityCode));
  useEffect(()=>{
    if(cityCode||cityQuery.trim().length<2)return;
    const controller=new AbortController();
    const timer=setTimeout(()=>fetch(`/api/municipalities?q=${encodeURIComponent(cityQuery.trim())}`,{signal:controller.signal}).then(response=>response.ok?response.json():{municipalities:[]}).then(data=>setCityResults(data.municipalities)).catch(()=>{}),160);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[cityCode,cityQuery]);
  const changeCityQuery=(value:string)=>{setCityCode('');setCityError('');setCityQuery(value);setCityResults([]);setActiveCity(0);setCityOpen(true);};
  return <form action={action} className="data-form participation-form" onSubmit={event=>{if(!cityCode){event.preventDefault();setCityError('Selecione um município nas sugestões antes de enviar.');setCityOpen(true);}}}>
    <label>Município<div className="municipality-picker"><input type="hidden" name="city_code" value={cityCode}/><input role="combobox" aria-autocomplete="list" aria-expanded={cityOpen&&cityResults.length>0} aria-controls="municipality-results" aria-activedescendant={cityOpen&&cityResults[activeCity]?`municipality-option-${cityResults[activeCity].code}`:undefined} aria-label="Buscar município por nome ou UF" aria-describedby="municipality-help" aria-invalid={Boolean(cityError)} value={cityQuery} placeholder="Digite o nome da cidade ou UF" autoComplete="off" required={!cityQuery} onFocus={()=>setCityOpen(true)} onBlur={()=>setCityOpen(false)} onChange={event=>changeCityQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Escape')setCityOpen(false);if(event.key==='ArrowDown'&&cityResults.length){event.preventDefault();setCityOpen(true);setActiveCity(index=>Math.min(index+1,cityResults.length-1));}if(event.key==='ArrowUp'&&cityResults.length){event.preventDefault();setActiveCity(index=>Math.max(index-1,0));}if(event.key==='Enter'&&cityOpen&&cityResults.length){event.preventDefault();const city=cityResults[activeCity];setCityCode(String(city.code));setCityQuery(`${city.name} · ${city.uf}`);setCityError('');setCityOpen(false);}}}/>{cityOpen&&cityResults.length>0&&<div className="municipality-results" id="municipality-results" role="listbox">{cityResults.map((city,index)=><button type="button" role="option" id={`municipality-option-${city.code}`} aria-selected={activeCity===index} key={city.code} onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setActiveCity(index)} onClick={()=>{setCityCode(String(city.code));setCityQuery(`${city.name} · ${city.uf}`);setCityError('');setCityOpen(false);}}><strong>{city.name}</strong><span>{city.uf}</span></button>)}</div>}</div><small id="municipality-help" role={cityError?'alert':undefined}>{cityError|| (cityCode?'Município selecionado.':'Escolha um resultado para confirmar a cidade e o estado.')}</small></label>
    <label>Paróquia<input name="parish_name" list="parish-options" placeholder="Ex.: Nossa Senhora da Abadia" required minLength={2} maxLength={140}/><datalist id="parish-options">{cityParishes.map(parish=><option key={parish.name} value={parish.name}/>)}</datalist><small>Se ela ainda não estiver no mapa, vamos cadastrá-la durante a revisão.</small></label>
    <label>Como seu nome aparecerá<input name="display_name" placeholder="Nome ou apelido público" required minLength={2} maxLength={140}/></label>
    <label>Seu perfil do Instagram<input name="username" placeholder="@seu.perfil" autoCapitalize="none" autoComplete="off" required maxLength={31}/><small>Usamos o perfil para identificar sua casa e evitar cadastros duplicados.</small></label>
    <label className="participation-consent"><input type="checkbox" name="consent" required/><span>Autorizo a publicação do nome informado e do meu perfil do Instagram no mapa se a solicitação for aprovada.</span></label>
    <label className="participation-trap" aria-hidden="true" tabIndex={-1}>Site<input name="website" autoComplete="off" tabIndex={-1}/></label>
    <p className="field-note">Sua solicitação será revisada pela equipe. Ela não aparece no mapa enquanto estiver pendente. Não informe endereço residencial.</p>
    <button className="primary-button" disabled={pending}>{pending?'Enviando…':'Enviar para revisão'}</button>
    <div aria-live="polite">{state.error&&<p className="form-error" role="alert">{state.error}</p>}{state.success&&<p className="form-success" role="status">{state.success}</p>}</div>
    <Link href="/" className="back-link">Voltar ao mapa</Link>
  </form>;
}
