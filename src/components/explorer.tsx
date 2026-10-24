'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState, Component, type ReactNode } from 'react';
import { ArrowUpRight, Church, Layers3, List, MapPin, Minus, Plus, RotateCcw, Search, Shield, X, CircleHelp, Home } from 'lucide-react';
import type { City, MapFocus, MapSelection, World } from '@/lib/types';
import { MAX_MAP_ZOOM, MIN_MAP_ZOOM } from '@/lib/map-navigation.mjs';
import { churchConstructionLevel } from '@/lib/layout.mjs';
import { useCityCache } from './use-city-cache';
import MapLoading from './map-loading';
import MapDialog from './map-dialog';

const WorldMap=dynamic(()=>import('./world-map'),{ssr:false,loading:()=> <MapLoading/>});
type Municipality={code:number;name:string;uf:string;catalog_parishes?:number};
class MapBoundary extends Component<{children:ReactNode;onList:()=>void},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="map-loading"><p>Não foi possível desenhar o mapa neste momento.</p><button onClick={this.props.onList}>Explorar pela lista</button></div>:this.props.children;}
}

export default function Explorer({world,initialCity,initialHouse}:{world:World;initialCity:number|null;initialHouse:number|null}) {
  const [search,setSearch]=useState(''),[results,setResults]=useState<Municipality[]>([]),[searching,setSearching]=useState(false);
  const [uf,setUf]=useState(''),[zoom,setZoom]=useState(1),[showRoads,setShowRoads]=useState(false);
  const [extraCities,setExtraCities]=useState<Record<number,City>>({});
  const [focus,setFocus]=useState<MapFocus>({code:initialCity,sequence:0,houseId:initialHouse??undefined});
  const [selection,setSelection]=useState<MapSelection|null>(()=>{const city=world.cities.find(c=>c.code===initialCity),house=world.houses.find(h=>h.id===initialHouse);return city&&house?{city,house,parish:world.parishes.find(p=>p.id===house.parish_id)}:null;});
  const [modal,setModal]=useState<'rules'|'layers'|'list'|'details'|null>(initialHouse?'details':null);
  const [listCity,setListCity]=useState<number|null>(null);
  const {worlds,loadCity}=useCityCache(world,initialCity);
  const cities=useMemo(()=>[...world.cities,...Object.values(extraCities).filter(c=>!world.cities.some(existing=>existing.code===c.code))],[world.cities,extraCities]);
  const focusedCity=cities.find(c=>c.code===(selection?.city.code??focus.code));
  const filteredCities=cities.filter(c=>c.active&&(!uf||c.uf===uf));
  const closeModal=()=>setModal(null);
  const changeSearch=(value:string)=>{setSearch(value);setResults([]);setSearching(value.trim().length>=2);};
  useEffect(()=>{
    if(search.trim().length<2)return;
    const controller=new AbortController();
    const timer=window.setTimeout(()=>fetch(`/api/municipalities?q=${encodeURIComponent(search.trim())}`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('search');return r.json();}).then(data=>{if(!controller.signal.aborted){setResults(data.municipalities??[]);setSearching(false);}}).catch(()=>{if(!controller.signal.aborted)setSearching(false);}),180);
    return ()=>{window.clearTimeout(timer);controller.abort();};
  },[search]);
  const focusCity=(municipality:Municipality|null,houseId?:number)=>{
    if(municipality&&!cities.some(c=>c.code===municipality.code))setExtraCities(previous=>({...previous,[municipality.code]:{...municipality,description:'',active:false,parishes:0,houses:0}}));
    setFocus(previous=>({code:municipality?.code??null,sequence:previous.sequence+1,houseId}));setSelection(null);setModal(null);changeSearch('');
    window.history.replaceState(null,'',municipality?`/?cidade=${municipality.code}${houseId?`&casa=${houseId}`:''}`:'/');
  };
  const inspect=(value:MapSelection)=>{setSelection(value);setModal('details');window.history.replaceState(null,'',`/?cidade=${value.city.code}${value.house?`&casa=${value.house.id}`:''}`);};
  const openList=()=>{setListCity(focusedCity?.active?focusedCity.code:null);if(focusedCity?.active)void loadCity(focusedCity.code).catch(()=>{});setModal('list');};
  const detailWorld=selection?worlds[selection.city.code]:undefined;
  const parishHouses=selection?.parish?(detailWorld?.houses??[]).filter(h=>h.parish_id===selection.parish!.id):[];
  const title=modal==='rules'?'Como funciona':modal==='layers'?'O seu mapa':modal==='list'?(listCity?'Bairros e moradores':'Cidades da comunidade'):selection?.house?.display_name??selection?.parish?.name??selection?.city.name??'A comunidade';
  return <main className="explorer clean-explorer">
    <header className="topbar clean-topbar">
      <Link className="brand product-brand" href="/" aria-label="Meu Lugar na Igreja · início" onClick={event=>{if(!event.ctrlKey&&!event.metaKey){event.preventDefault();focusCity(null);}}}><Image className="product-mark" src="/brand/meu-lugar-na-igreja-mark.png" alt="" width={48} height={48}/><span>Meu Lugar na Igreja<small>ACUTISTECH</small></span></Link>
      <div className="top-search-wrap"><label className="top-search"><Search size={18}/><input value={search} onChange={event=>changeSearch(event.target.value)} placeholder="Buscar município" aria-label="Buscar município" onKeyDown={event=>{if(event.key==='Enter'&&results[0])focusCity(results[0]);if(event.key==='Escape')changeSearch('');}}/>{search&&<button aria-label="Limpar busca" onClick={()=>changeSearch('')}><X size={15}/></button>}</label>
        {search.trim().length>=2&&<div className="search-results">{results.map(result=>{const registered=cities.find(c=>c.code===result.code);return <button key={result.code} onClick={()=>focusCity(result)}><MapPin size={16}/><span><strong>{result.name}</strong><small>{result.uf} · {registered?.houses?`${registered.houses} casas`:(result.catalog_parishes?`${result.catalog_parishes} paróquias no catálogo`:'encontrar no mapa')}</small></span><ArrowUpRight size={15}/></button>;})}{!results.length&&<p className="search-feedback" role="status">{searching?'Buscando municípios…':'Nenhum município encontrado.'}</p>}</div>}
      </div>
      <nav className="clean-nav"><Link href={`/participar${focusedCity?`?cidade=${focusedCity.code}`:''}`} className="participate-link">Adicionar casa <ArrowUpRight size={15}/></Link><button className="help-button" onClick={()=>setModal('rules')} aria-label="Como funciona"><CircleHelp size={19}/><span>Como funciona</span></button><Link href="/admin" className="admin-link" aria-label="Administração"><Shield size={17}/></Link></nav>
    </header>
    <section className="map-area clean-map" aria-label="Mapa da comunidade">
      <div className="map-breadcrumb"><button onClick={()=>focusCity(null)}>Brasil</button><span>/</span><strong>{focusedCity?`${focusedCity.name} · ${focusedCity.uf}`:uf||'Nossas comunidades'}</strong></div>
      <div className="view-switch"><span className="map-mode-label"><Layers3 size={16}/> Mapa vivo</span><button onClick={openList} aria-label="Abrir lista" title="Comunidades e moradores"><List size={17}/></button></div>
      <MapBoundary onList={openList}><WorldMap cities={cities} worlds={worlds} loadCity={loadCity} focus={focus} zoom={zoom} onZoom={setZoom} uf={uf} onState={setUf} showRoads={showRoads} selectedHouse={selection?.house?.id??null} selectedParish={selection?.parish?.id??null} onInspect={inspect}/></MapBoundary>
      <div className="map-tools clean-map-tools"><button aria-label="Camadas do mapa" onClick={()=>setModal('layers')}><Layers3 size={19}/></button><button aria-label="Aproximar mapa" onClick={()=>setZoom(z=>Math.min(z*1.5,MAX_MAP_ZOOM))}><Plus size={20}/></button><button aria-label="Afastar mapa" onClick={()=>setZoom(z=>Math.max(z/1.5,MIN_MAP_ZOOM))}><Minus size={20}/></button><button aria-label="Restaurar enquadramento" onClick={()=>focusCity(null)}><RotateCcw size={18}/></button></div>
      <div className="map-hint">Arraste para explorar <span>·</span> Aproxime para ver os bairros</div>
      {focusedCity&&!focusedCity.active&&<div className="empty-community-note"><strong>{focusedCity.name} está começando.</strong><span>{focusedCity.catalog_parishes?`${focusedCity.catalog_parishes} paróquias disponíveis no catálogo.`:'A sua comunidade pode começar aqui.'}</span><Link href={`/participar?cidade=${focusedCity.code}`}>Adicionar minha casa <ArrowUpRight size={13}/></Link></div>}
      <div className="map-stats clean-map-stats"><span><strong>{world.cities.filter(c=>c.active).length}</strong> cidades</span><span><strong>{world.cities.reduce((sum,c)=>sum+c.parishes,0)}</strong> paróquias</span><span><strong>{world.cities.reduce((sum,c)=>sum+c.houses,0)}</strong> casas</span></div>
      <div className="attribution">{showRoads&&<><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · </>}Mundo ilustrado · Sedes e limites: IBGE</div>
    </section>
    {modal&&<MapDialog title={title} onClose={closeModal}>
      {modal==='rules'&&<div className="rules-content"><p className="draft-notice">Regras iniciais · em construção</p><article><h3>Um mapa, uma cidade inteira</h3><p>Arraste e aproxime para ver praças, igrejas e casas. A cidade permanece no mesmo mapa durante toda a exploração. Use a roda do mouse, os botões ou uma pinça com dois dedos.</p></article><article><h3>Bairros que formam uma comunidade</h3><p>Cada paróquia tem seu bairro dentro da mesma cidade. Ruas e espaços públicos conectam os moradores. Novas casas ocupam novos quarteirões e ampliam a cidade.</p></article><article><h3>A sede é real. A cidade é uma criação nossa.</h3><p>A posição do município vem das sedes oficiais do IBGE. Casas, bairros e igrejas são ilustrativos; não indicam endereços de moradores nem limites territoriais reais das paróquias.</p></article><article><h3>Encontre as pessoas</h3><p>Toque numa casa ou igreja para ver suas informações. A lista também permite encontrar bairros e moradores. A busca superior aproxima o município sem sair do mapa.</p></article><article><h3>O que ainda vamos definir</h3><p>A construção da igreja cresce visualmente sem mudar sua natureza ou seu nome. Pontuação, cargos e eleições serão discutidos depois. A integração com comentários do Instagram e a verificação dos padres também ficam para as próximas etapas.</p></article></div>}
      {modal==='layers'&&<div className="layer-options"><label><input type="checkbox" checked={showRoads} onChange={event=>setShowRoads(event.target.checked)}/> Vias reais do OpenStreetMap</label><p>O visual padrão é ilustrado. Ative a cartografia real para orientação; as construções da comunidade continuam sendo uma representação virtual.</p></div>}
      {modal==='list'&&<div className="modal-places">{listCity?<><button onClick={()=>setListCity(null)}><MapPin size={16}/><span>Todas as cidades</span></button>{worlds[listCity]?worlds[listCity].parishes.map(parish=><details className="community-neighborhood" key={parish.id}><summary><Church size={17}/><span>{parish.name}<small>{worlds[listCity].houses.filter(h=>h.parish_id===parish.id).length} casas</small></span></summary><button onClick={()=>inspect({city:cities.find(c=>c.code===listCity)!,parish})}>Ver a comunidade <ArrowUpRight size={13}/></button>{worlds[listCity].houses.filter(h=>h.parish_id===parish.id).map(house=><button key={house.id} onClick={()=>inspect({city:cities.find(c=>c.code===listCity)!,parish,house})}><Home size={15}/><span>{house.display_name}<small>@{house.username}</small></span></button>)}</details>):<p role="status">Carregando a comunidade…</p>}</>:filteredCities.map(city=><button key={city.code} onClick={()=>{focusCity(city);setListCity(city.code);void loadCity(city.code).catch(()=>{});setModal('list');}}><MapPin size={17}/><span><strong>{city.name} · {city.uf}</strong><small>{city.houses} casas · {city.parishes} bairros paroquiais</small></span><ArrowUpRight size={15}/></button>)}</div>}
      {modal==='details'&&selection&&<div className="community-detail">
        <span className="community-kicker">{selection.house?'MORADOR DA COMUNIDADE':selection.parish?'BAIRRO PAROQUIAL':'UMA CIDADE, MUITAS COMUNIDADES'}</span>
        {selection.house&&<div className="resident-identity"><span className="resident-initial">{selection.house.display_name.slice(0,1).toLocaleUpperCase('pt-BR')}</span><div><strong>{selection.house.display_name}</strong><a href={`https://www.instagram.com/${encodeURIComponent(selection.house.username)}/`} target="_blank" rel="noreferrer">@{selection.house.username} <ArrowUpRight size={12}/></a></div></div>}
        <p><MapPin size={14}/> {selection.city.name} · {selection.city.uf}</p>
        {selection.parish&&<p><Church size={14}/> {selection.parish.name}</p>}
        {selection.parish&&!selection.house&&<div className="community-detail-metrics"><span><strong>{parishHouses.length}</strong> casas</span><span><strong>{churchConstructionLevel(parishHouses.length)}</strong> nível da construção</span></div>}
        {!selection.parish&&!selection.house&&<><div className="community-detail-metrics"><span><strong>{selection.city.houses}</strong> casas</span><span><strong>{selection.city.parishes}</strong> bairros paroquiais</span></div><p className="field-note">As paróquias compartilham o mesmo município e seus espaços públicos. A sede municipal é posicionada a partir dos dados oficiais do IBGE.</p></>}
        {selection.parish?.description&&<p>{selection.parish.description}</p>}
        <button className="primary-button" onClick={()=>focusCity(selection.city,selection.house?.id)}>Localizar {selection.house?'esta casa':'esta comunidade'} no mapa <ArrowUpRight size={15}/></button>
        {!selection.house&&<button className="text-button" onClick={()=>{setListCity(selection.city.code);void loadCity(selection.city.code).catch(()=>{});setModal('list');}}>Ver bairros e moradores <List size={15}/></button>}
      </div>}
    </MapDialog>}
  </main>;
}
