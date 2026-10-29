'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState, Component, type ReactNode, type FormEvent } from 'react';
import { ArrowUpRight, Church, Compass, Layers3, List, MapPin, Minus, Plus, RotateCcw, Search, FileText, X, CircleHelp, Home, User, Target, Footprints } from 'lucide-react';
import type { City, MapFocus, MapSelection, Parish, World } from '@/lib/types';
import { MAX_MAP_ZOOM, MIN_MAP_ZOOM } from '@/lib/map-navigation.mjs';
import { churchConstructionLevel } from '@/lib/layout.mjs';
import { createHouseOnMap } from '@/app/actions';
import { useCityCache } from './use-city-cache';
import MapLoading from './map-loading';
import MapDialog from './map-dialog';
import GeographyPanel from './geography-panel';
import {REGIONS,STATE_NAMES,regionFor} from '@/lib/map-territories.mjs';
import { ResidentGamificationCard } from './resident-gamification';
import { DailyMissionsBoard } from './daily-missions';
import { HowItWorksGuide } from './how-it-works';

const WorldMap=dynamic(()=>import('./world-map'),{ssr:false,loading:()=> <MapLoading/>});
const WalkMode=dynamic(()=>import('./walk-mode'),{ssr:false});
type Municipality={code:number;name:string;uf:string;catalog_parishes?:number};
type HouseLookup={id:number;city_code:number;parish_id:number;username:string;display_name:string;parish_name:string;city_name:string;uf:string;level?:number;role?:string};

class MapBoundary extends Component<{children:ReactNode;onList:()=>void},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="map-loading"><p>Não foi possível desenhar o mapa neste momento.</p><button onClick={this.props.onList}>Explorar pela lista</button></div>:this.props.children;}
}

export default function Explorer({
  world,
  initialCity,
  initialHouse,
  initialWalk = false,
  cleanMode = false,
  autoWalk = false,
}: {
  world: World;
  initialCity: number | null;
  initialHouse: number | null;
  initialWalk?: boolean;
  cleanMode?: boolean;
  autoWalk?: boolean;
}) {
  const [search,setSearch]=useState(''),[results,setResults]=useState<Municipality[]>([]),[searching,setSearching]=useState(false);
  const [handleQuery,setHandleQuery]=useState(''),[findingHandle,setFindingHandle]=useState(false),[handleFeedback,setHandleFeedback]=useState<string|null>(null);
  const [recentHouse,setRecentHouse]=useState<HouseLookup|null>(null);
  const [touring,setTouring]=useState(false);
  const [uf,setUf]=useState(''),[zoom,setZoom]=useState(1),[showRoads,setShowRoads]=useState(false),[showHighways,setShowHighways]=useState(true);
  const [extraCities,setExtraCities]=useState<Record<number,City>>({});
  const [cityHouseOverrides,setCityHouseOverrides]=useState<Record<number,number>>({});
  const [focus,setFocus]=useState<MapFocus>({code:initialCity,sequence:0,houseId:initialHouse??undefined});
  const [selection,setSelection]=useState<MapSelection|null>(()=>{const city=world.cities.find(c=>c.code===initialCity),house=world.houses.find(h=>h.id===initialHouse);return city&&house?{city,house,parish:world.parishes.find(p=>p.id===house.parish_id)}:null;});
  const [modal,setModal]=useState<'rules'|'layers'|'list'|'details'|'geography'|'create-house'|'walk'|null>(initialWalk?'walk':initialHouse?'details':null);
  const [geography,setGeography]=useState<{region:string;uf?:string}|null>(null);
  const [listCity,setListCity]=useState<number|null>(null);
  const [showMissions,setShowMissions]=useState(true);
  const [walkTargetCity,setWalkTargetCity]=useState<City|null>(null);
  const [hoveredCityCode,setHoveredCityCode]=useState<number|null>(null);
  const [centerCityCode,setCenterCityCode]=useState<number|null>(null);

  // On-map house creation modal state
  const [createUsername,setCreateUsername]=useState('');
  const [createDisplayName,setCreateDisplayName]=useState('');
  const [createCitySearch,setCreateCitySearch]=useState('');
  const [createCityResults,setCreateCityResults]=useState<Municipality[]>([]);
  const [createSelectedCity,setCreateSelectedCity]=useState<Municipality|null>(null);
  const [createParishes,setCreateParishes]=useState<Parish[]>([]);
  const [loadingCreateParishes,setLoadingCreateParishes]=useState(false);
  const [createParishId,setCreateParishId]=useState<number|''>('');
  const [creatingHouse,setCreatingHouse]=useState(false);
  const [createFeedback,setCreateFeedback]=useState<{error?:string;ok?:string}|null>(null);

  const {worlds,loadCity}=useCityCache(world,initialCity);
  const cities=useMemo(()=>{
    const base=[...world.cities,...Object.values(extraCities).filter(c=>!world.cities.some(existing=>existing.code===c.code))];
    return base.map(c=>cityHouseOverrides[c.code]!==undefined?{...c,houses:cityHouseOverrides[c.code],active:true}:c);
  },[world.cities,extraCities,cityHouseOverrides]);
  const focusedCity=cities.find(c=>c.code===(selection?.city.code??focus.code));
  const currentViewCity = useMemo(() => {
    return (
      (hoveredCityCode ? cities.find(c => c.code === hoveredCityCode) : null) ??
      focusedCity ??
      (selection?.city) ??
      (centerCityCode ? cities.find(c => c.code === centerCityCode) : null) ??
      cities.find(c => c.active && (c.houses > 0 || c.parishes > 0)) ??
      cities[0]
    );
  }, [hoveredCityCode, focusedCity, selection, centerCityCode, cities]);
  const filteredCities=cities.filter(c=>c.active&&(!uf||c.uf===uf)&&(!geography||geography.uf||regionFor(c.uf)===geography.region));
  const closeModal=()=>setModal(null);
  const changeSearch=(value:string)=>{setSearch(value);setResults([]);setSearching(value.trim().length>=2);};

  // Load recent house ticker on mount & prewarm walk mode assets
  useEffect(()=>{
    fetch('/api/houses').then(r=>r.ok?r.json():null).then(d=>{
      if(d?.houses?.[0])setRecentHouse(d.houses[0]);
    }).catch(()=>{});

    if(typeof window!=='undefined'){
      if(initialWalk && initialCity){
        void loadCity(initialCity).catch(()=>{});
      }
      const prewarm=()=>{
        import('./walk-mode').then(m=>m.warmWalkAssets?.()).catch(()=>{});
      };
      const win=window as unknown as {requestIdleCallback?:(cb:()=>void)=>void};
      if(typeof win.requestIdleCallback==='function'){
        win.requestIdleCallback(prewarm);
      }else{
        setTimeout(prewarm,1200);
      }
    }
  },[]);

  // Municipality search in topbar
  useEffect(()=>{
    if(search.trim().length<2)return;
    const controller=new AbortController();
    const timer=window.setTimeout(()=>fetch(`/api/municipalities?q=${encodeURIComponent(search.trim())}`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('search');return r.json();}).then(data=>{if(!controller.signal.aborted){setResults(data.municipalities??[]);setSearching(false);}}).catch(()=>{if(!controller.signal.aborted)setSearching(false);}),180);
    return ()=>{window.clearTimeout(timer);controller.abort();};
  },[search]);

  // Municipality search in Create House modal
  useEffect(()=>{
    if(modal!=='create-house'||createCitySearch.trim().length<2||createSelectedCity)return;
    const controller=new AbortController();
    const timer=window.setTimeout(()=>fetch(`/api/municipalities?q=${encodeURIComponent(createCitySearch.trim())}`,{signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{if(!controller.signal.aborted&&data?.municipalities)setCreateCityResults(data.municipalities);}).catch(()=>{}),180);
    return ()=>{window.clearTimeout(timer);controller.abort();};
  },[modal,createCitySearch,createSelectedCity]);

  const selectCreateCity=(municipality:Municipality|null,preferredParishId?:number)=>{
    setCreateSelectedCity(municipality);
    setCreateCityResults([]);
    if(!municipality){
      setCreateParishes([]);
      setCreateParishId('');
      setLoadingCreateParishes(false);
      return;
    }
    setCreateCitySearch(`${municipality.name} · ${municipality.uf}`);
    setLoadingCreateParishes(true);
    void loadCity(municipality.code).then(cityWorld=>{
      setCreateParishes(cityWorld.parishes);
      if(preferredParishId&&cityWorld.parishes.some(p=>p.id===preferredParishId)){
        setCreateParishId(preferredParishId);
      }else{
        setCreateParishId(cityWorld.parishes[0]?.id??'');
      }
      setLoadingCreateParishes(false);
    }).catch(()=>{
      setCreateParishes([]);
      setCreateParishId('');
      setLoadingCreateParishes(false);
    });
  };

  const focusCity=(municipality:Municipality|null,houseId?:number,parishId?:number,municipal=false)=>{
    if(municipality&&!cities.some(c=>c.code===municipality.code))setExtraCities(previous=>({...previous,[municipality.code]:{...municipality,description:'',active:false,parishes:0,houses:0}}));
    setFocus(previous=>({code:municipality?.code??null,sequence:previous.sequence+1,houseId,parishId,municipal}));setUf('');setGeography(null);setSelection(null);setModal(null);changeSearch('');
    window.history.replaceState(null,'',municipality?`/?cidade=${municipality.code}${houseId?`&casa=${houseId}`:''}`:'/');
  };

  // Auto-tour ("Passear") cycling through active cities
  useEffect(()=>{
    if(!touring)return;
    const pool=cities.filter(c=>c.active&&(c.houses>0||c.parishes>0)).sort((a,b)=>(b.houses-a.houses)||(b.parishes-a.parishes));
    if(!pool.length)return;
    let index=Math.floor(Math.random()*Math.min(pool.length,25));
    const step=()=>{
      const target=pool[index%pool.length];
      index=(index+1)%Math.min(pool.length,40);
      if(target){
        void loadCity(target.code).catch(()=>{});
        setFocus(prev=>({code:target.code,sequence:prev.sequence+1}));
      }
    };
    step();
    const timer=window.setInterval(step,6500);
    return ()=>window.clearInterval(timer);
  },[touring,cities,loadCity]);

  const openCreateHouseModal=(prefillHandle?:string,prefillCity?:Municipality,prefillParishId?:number)=>{
    setTouring(false);
    setCreateFeedback(null);
    if(prefillHandle)setCreateUsername(prefillHandle);
    const targetCity=prefillCity??(createSelectedCity?null:(focusedCity??cities.find(c=>c.houses>0)??cities[0]??null));
    if(targetCity){
      selectCreateCity({code:targetCity.code,name:targetCity.name,uf:targetCity.uf},prefillParishId);
    }
    setModal('create-house');
  };

  const handleFindHouse=async(event?:FormEvent)=>{
    event?.preventDefault();
    const cleaned=handleQuery.trim().replace(/^@+/,'');
    if(!cleaned)return;
    setTouring(false);
    setFindingHandle(true);
    setHandleFeedback(null);
    try{
      const res=await fetch(`/api/houses?q=${encodeURIComponent(cleaned)}`);
      const data=await res.json();
      const matched=(data.houses as HouseLookup[]|undefined)?.[0];
      if(matched){
        const cityWorld=await loadCity(matched.city_code,true).catch(()=>null);
        const cityObj=cities.find(c=>c.code===matched.city_code)??{
          code:matched.city_code,name:matched.city_name,uf:matched.uf,description:'',active:true,
          parishes:cityWorld?.parishes.length??1,houses:cityWorld?.houses.length??1
        };
        focusCity(cityObj,matched.id,matched.parish_id);
        setHandleQuery(`@${matched.username}`);
      }else{
        setHandleFeedback(`@${cleaned} ainda não tem casa — crie agora!`);
        openCreateHouseModal(`@${cleaned}`);
      }
    }catch{
      setHandleFeedback('Não foi possível buscar o @ agora.');
    }finally{
      setFindingHandle(false);
    }
  };

  const handleCreateHouseSubmit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(!createSelectedCity||!createParishId){
      setCreateFeedback({error:'Selecione um município e uma paróquia válida.'});
      return;
    }
    setCreatingHouse(true);
    setCreateFeedback(null);
    try{
      const res=await createHouseOnMap({
        username:createUsername,
        display_name:createDisplayName,
        city_code:createSelectedCity.code,
        parish_id:Number(createParishId),
      });
      if(res.error){
        setCreateFeedback({error:res.error});
      }else if(res.houseId&&res.cityCode&&res.parishId&&res.username){
        const updatedWorld=await loadCity(res.cityCode,true).catch(()=>null);
        if(updatedWorld){
          setCityHouseOverrides(prev=>({...prev,[res.cityCode!]:updatedWorld.houses.length}));
        }
        const matchedParish=createParishes.find(p=>p.id===res.parishId);
        setRecentHouse({
          id:res.houseId,
          city_code:res.cityCode,
          parish_id:res.parishId,
          username:res.username,
          display_name:createDisplayName.trim()||`@${res.username}`,
          parish_name:matchedParish?.name??'Paróquia',
          city_name:createSelectedCity.name,
          uf:createSelectedCity.uf,
        });
        setCreateFeedback({ok:res.success});
        const targetCity=cities.find(c=>c.code===res.cityCode)??{
          code:res.cityCode,name:createSelectedCity.name,uf:createSelectedCity.uf,description:'',active:true,
          parishes:updatedWorld?.parishes.length??1,houses:updatedWorld?.houses.length??1
        };
        focusCity(targetCity,res.houseId,res.parishId);
      }
    }catch{
      setCreateFeedback({error:'Não foi possível criar a casa agora. Tente novamente.'});
    }finally{
      setCreatingHouse(false);
    }
  };

  const openWalkMode = (targetCity?: City | null) => {
    const city = targetCity ?? currentViewCity ?? cities[0];
    if (!city) return;
    setTouring(false);
    setWalkTargetCity(city);
    void loadCity(city.code).catch(() => {});
    setModal('walk');
  };

  const inspect=(value:MapSelection)=>{setTouring(false);setSelection(value);setModal('details');if(value.city.active)void loadCity(value.city.code).catch(()=>{});window.history.replaceState(null,'',`/?cidade=${value.city.code}${value.house?`&casa=${value.house.id}`:''}`);};
  const inspectGeography=(region:string,state?:string)=>{setTouring(false);setUf(state??'');setGeography({region,uf:state});setSelection(null);setFocus(previous=>({code:null,region:state?undefined:region,uf:state,sequence:previous.sequence+1}));setModal('geography');window.history.replaceState(null,'','/');};
  const openList=()=>{setTouring(false);setListCity(focusedCity?.active?focusedCity.code:null);if(focusedCity?.active)void loadCity(focusedCity.code).catch(()=>{});setModal('list');};
  const detailWorld=selection?worlds[selection.city.code]:undefined;
  const parishHouses=selection?.parish?(detailWorld?.houses??[]).filter(h=>h.parish_id===selection.parish!.id):[];
  const title=modal==='create-house'?'Construir minha casa no mapa':modal==='rules'?'Como funciona':modal==='layers'?'O seu mapa':modal==='geography'?(geography?.uf?STATE_NAMES[geography.uf]:geography?.region)??'Brasil':modal==='list'?(listCity?'Bairros e moradores':'Cidades da comunidade'):selection?.house?.display_name??selection?.parish?.name??selection?.city.name??'A comunidade';
  const breadcrumbUf=focusedCity?.uf??geography?.uf;
  const breadcrumbRegion=breadcrumbUf?regionFor(breadcrumbUf):geography?.region;
  const totalActiveCities=cities.filter(c=>c.active).length;
  const totalParishes=cities.reduce((sum,c)=>sum+c.parishes,0);
  const totalHouses=cities.reduce((sum,c)=>sum+c.houses,0);
  const topCity=useMemo(()=>cities.reduce<City|null>((best,c)=>!best||(c.houses>best.houses)||(c.houses===best.houses&&c.parishes>best.parishes)?c:best,null),[cities]);
  const activeUsername = selection?.house?.username ?? (handleQuery && handleQuery.replace(/^@/, '').trim().length >= 2 ? handleQuery.replace(/^@/, '').trim() : null);

  return <main className={`explorer clean-explorer ${cleanMode ? 'clean-video-mode' : ''}`}>
    <header className="topbar clean-topbar">
      <Link className="brand product-brand" href="/" aria-label="Meu Lugar na Igreja · início" onClick={event=>{if(!event.ctrlKey&&!event.metaKey){event.preventDefault();setTouring(false);focusCity(null);}}}><Image className="product-mark" src="/brand/meu-lugar-na-igreja-mark.png" alt="" width={48} height={48}/><span>Meu Lugar na Igreja<small>ACUTISTECH</small></span></Link>
      <div className="top-search-wrap"><label className="top-search"><Search size={18}/><input value={search} onChange={event=>changeSearch(event.target.value)} placeholder="Buscar município" aria-label="Buscar município" onKeyDown={event=>{if(event.key==='Enter'&&results[0])focusCity(results[0]);if(event.key==='Escape')changeSearch('');}}/>{search&&<button aria-label="Limpar busca" onClick={()=>changeSearch('')}><X size={15}/></button>}</label>
        {search.trim().length>=2&&<div className="search-results">{results.map(result=>{const registered=cities.find(c=>c.code===result.code);return <button key={result.code} onClick={()=>focusCity(result)}><MapPin size={16}/><span><strong>{result.name}</strong><small>{result.uf} · {registered?.houses?`${registered.houses} casas`:(result.catalog_parishes?`${result.catalog_parishes} paróquias no catálogo`:'encontrar no mapa')}</small></span><ArrowUpRight size={15}/></button>;})}{!results.length&&<p className="search-feedback" role="status">{searching?'Buscando municípios…':'Nenhum município encontrado.'}</p>}</div>}
      </div>
      <nav className="clean-nav">
        <button type="button" className={`tour-button missions-nav-btn${showMissions?' active':''}`} onClick={()=>setShowMissions(s=>!s)} title="Quadro de Missões Diárias do Mapa">
          <Target size={16}/><span>Missões</span>
        </button>
        <button type="button" className="tour-button walk-nav-btn" onClick={()=>openWalkMode(currentViewCity)} title={`Passear em 3D pelas ruas de ${currentViewCity?.name ?? 'sua paróquia'} com seu bonequinho`}>
          <Footprints size={16}/><span>Passear</span>
        </button>
        <form className="top-handle-finder" onSubmit={handleFindHouse} role="search" aria-label="Encontrar casa por @ do Instagram">
          <span className="handle-at" aria-hidden="true">@</span>
          <input value={handleQuery} onChange={e=>{setHandleQuery(e.target.value);if(handleFeedback)setHandleFeedback(null);}} placeholder="seu @" aria-label="Digite seu @ para achar sua casa" />
          <button type="submit" disabled={findingHandle}>{findingHandle?'…':'achar'}</button>
        </form>
        <button type="button" className="participate-link" onClick={()=>openCreateHouseModal()}>
          <Home size={15}/><span>Construir casa</span>
        </button>
        <Link href="/privacidade" className="legal-nav-link" aria-label="Políticas de Privacidade e Termos"><FileText size={16}/><span>Privacidade</span></Link>
        <button className="help-button" onClick={()=>setModal('rules')} aria-label="Como funciona"><CircleHelp size={19}/><span>Como funciona</span></button>
      </nav>
    </header>
    <section className="map-area clean-map" aria-label="Mapa da comunidade">
      <DailyMissionsBoard
        isOpen={showMissions}
        onToggle={() => setShowMissions(s => !s)}
        activeUsername={activeUsername}
        onOpenWalk={() => openWalkMode(currentViewCity)}
        onOpenCreateHouse={() => openCreateHouseModal()}
        onOpenHowItWorks={() => setModal('rules')}
        onSelectParishMatriz={() => {
          if (focusedCity && detailWorld?.parishes[0]) {
            inspect({ city: focusedCity, parish: detailWorld.parishes[0] });
          }
        }}
      />
      <div className="map-status-pills" aria-label="Status da campanha no mapa">
        <span className="status-pill day-pill" title="A contagem de dias iniciará no lançamento oficial da campanha">DIA 0 · PRÉ-LANÇAMENTO</span>
        <button type="button" className="status-pill" onClick={openList}>
          <span className="status-dot online" aria-hidden="true"/>
          <strong>{totalHouses.toLocaleString('pt-BR')}</strong> {totalHouses===1?'casa construída':'casas construídas'}
        </button>
        <button type="button" className="status-pill" onClick={openList}>
          ⛪ <strong>{totalParishes.toLocaleString('pt-BR')}</strong> paróquias · <strong>{totalActiveCities.toLocaleString('pt-BR')}</strong> cidades
        </button>
        {recentHouse ? (
          <button type="button" className="status-pill highlight-pill" onClick={()=>{
            const c=cities.find(city=>city.code===recentHouse.city_code)??{code:recentHouse.city_code,name:recentHouse.city_name,uf:recentHouse.uf};
            void loadCity(recentHouse.city_code).catch(()=>{});
            focusCity(c,recentHouse.id,recentHouse.parish_id);
          }}>
            🏡 Última casa: <strong>@{recentHouse.username}</strong> · {recentHouse.city_name}/{recentHouse.uf}
          </button>
        ) : topCity && (
          <button type="button" className="status-pill highlight-pill" onClick={()=>focusCity(topCity)}>
            ⛪ Destaque: <strong>{topCity.name}/{topCity.uf}</strong> · {topCity.parishes} paróquias
          </button>
        )}
        {handleFeedback && <span className="status-pill feedback-pill" role="status">{handleFeedback}</span>}
      </div>

      <div className="map-breadcrumb"><button onClick={()=>focusCity(null)}>Brasil</button>{breadcrumbRegion&&<><span>/</span><button onClick={()=>inspectGeography(breadcrumbRegion)}>{breadcrumbRegion}</button></>}{breadcrumbUf&&<><span>/</span><button aria-label={`Estado de ${STATE_NAMES[breadcrumbUf]}`} onClick={()=>inspectGeography(regionFor(breadcrumbUf),breadcrumbUf)}>{breadcrumbUf}</button></>}{focusedCity&&<><span>/</span><button aria-label={`Cidade de ${focusedCity.name}`} onClick={()=>inspect({city:focusedCity})}>{focusedCity.name}</button></>}{!breadcrumbRegion&&!focusedCity&&<><span>/</span><strong>Nossas comunidades</strong></>}</div>
      <div className="view-switch"><span className="map-mode-label"><Layers3 size={16}/> Mapa vivo</span><button onClick={openList} aria-label="Abrir lista" title="Comunidades e moradores"><List size={17}/></button></div>
      <MapBoundary onList={openList}><WorldMap cities={cities} worlds={worlds} loadCity={loadCity} focus={focus} zoom={zoom} onZoom={setZoom} uf={uf} onState={state=>inspectGeography(regionFor(state),state)} showRoads={showRoads} showHighways={showHighways} selectedHouse={selection?selection.house?.id??null:focus.houseId??null} selectedParish={selection?selection.parish?.id??null:focus.parishId??null} selectedCity={selection?.city.code??focus.code} animateFlights={modal===null} onInspect={inspect} onHoverCity={setHoveredCityCode} onCenterCity={setCenterCityCode}/></MapBoundary>
      <div className="map-tools clean-map-tools"><button aria-label="Camadas do mapa" onClick={()=>setModal('layers')}><Layers3 size={19}/></button><button aria-label="Aproximar mapa" onClick={()=>setZoom(z=>Math.min(z*1.5,MAX_MAP_ZOOM))}><Plus size={20}/></button><button aria-label="Afastar mapa" onClick={()=>setZoom(z=>Math.max(z/1.5,MIN_MAP_ZOOM))}><Minus size={20}/></button><button aria-label="Restaurar enquadramento" onClick={()=>focusCity(null)}><RotateCcw size={18}/></button></div>
      {focusedCity&&!focusedCity.active&&<div className="empty-community-note"><strong>{focusedCity.name} está começando.</strong><span>{focusedCity.catalog_parishes?`${focusedCity.catalog_parishes} paróquias disponíveis no catálogo.`:'A sua comunidade pode começar aqui.'}</span><button type="button" className="text-button" onClick={()=>openCreateHouseModal(undefined,{code:focusedCity.code,name:focusedCity.name,uf:focusedCity.uf})}>Construir minha casa aqui <ArrowUpRight size={13}/></button></div>}
      <div className="map-stats clean-map-stats"><span><strong>{totalActiveCities}</strong> cidades</span><span><strong>{totalParishes}</strong> paróquias</span><span><strong>{totalHouses}</strong> casas</span></div>

      <button type="button" className="map-bottom-cta" onClick={()=>openCreateHouseModal()}>
        <span className="cta-dot" aria-hidden="true"/>
        <span>⛪ <strong>construa sua casa aqui com seu @</strong> ou comente sua paróquia + cidade no <strong>@meu_lugar_na_igreja</strong></span>
      </button>

      <div className="attribution">{showRoads&&<><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · </>}{showHighways&&<>Rodovias: <a href="https://www.ibge.gov.br/geociencias/todos-os-produtos-geociencias/15759-brasil.html" target="_blank" rel="noreferrer">IBGE BC250</a> · </>}Mundo ilustrado · IBGE · <Link href="/privacidade" style={{pointerEvents:'auto',textDecoration:'underline'}}>Privacidade</Link> · <Link href="/termos" style={{pointerEvents:'auto',textDecoration:'underline'}}>Termos</Link></div>
    </section>
    {modal && modal !== 'walk' && <MapDialog title={title} onClose={closeModal}>
      {modal==='create-house'&&<div className="create-house-modal">
        <div className="create-house-methods">
          <div className="method-badge active-method">
            <strong>1. Construir direto pelo mapa</strong>
            <span>Informe um @ válido do Instagram, seu município e sua paróquia oficial abaixo.</span>
          </div>
          <a className="method-badge ig-method" href="https://www.instagram.com/meu_lugar_na_igreja/" target="_blank" rel="noreferrer">
            <strong>2. Ou comentar no Instagram <ArrowUpRight size={13}/></strong>
            <span>Comente sua paróquia + cidade + UF em <strong>@meu_lugar_na_igreja</strong> e nossa IA cria sua casa automaticamente!</span>
          </a>
        </div>

        <form className="data-form create-house-form" onSubmit={handleCreateHouseSubmit}>
          <label>
            Seu @ do Instagram *
            <input
              name="username"
              required
              placeholder="@seu_arroba"
              value={createUsername}
              onChange={e=>setCreateUsername(e.target.value)}
            />
            <small className="field-note">Usamos seu @ público para identificar sua casa no bairro da sua paróquia (máx. 1 casa por @, podendo mudar de paróquia quando quiser).</small>
          </label>

          <label>
            Nome para exibir na casa (opcional)
            <input
              name="display_name"
              placeholder="Ex.: Família Silva ou João Pedro"
              value={createDisplayName}
              onChange={e=>setCreateDisplayName(e.target.value)}
            />
          </label>

          <label>
            Município *
            <div className="municipality-picker">
              <input
                value={createCitySearch}
                onChange={e=>{
                  const val=e.target.value;
                  setCreateCitySearch(val);
                  if(val.trim().length<2)setCreateCityResults([]);
                  if(createSelectedCity&&val!==`${createSelectedCity.name} · ${createSelectedCity.uf}`){
                    selectCreateCity(null);
                  }
                }}
                placeholder="Digite o nome da sua cidade (ex.: Palhoça, Aparecida, São Paulo)"
                required
              />
              {createCityResults.length>0&&!createSelectedCity&&(
                <div className="municipality-results" role="listbox" aria-label="Municípios encontrados">
                  {createCityResults.map(m=>(
                    <button
                      type="button"
                      key={m.code}
                      onClick={()=>selectCreateCity(m)}
                    >
                      <strong>{m.name} · {m.uf}</strong>
                      <span>{m.catalog_parishes?`${m.catalog_parishes} paróquias`:'Selecionar'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>

          <label>
            Paróquia *
            <select
              name="parish_id"
              required
              disabled={!createSelectedCity||loadingCreateParishes||createParishes.length===0}
              value={createParishId}
              onChange={e=>setCreateParishId(e.target.value?Number(e.target.value):'')}
            >
              {!createSelectedCity&&<option value="">Escolha um município acima primeiro…</option>}
              {createSelectedCity&&loadingCreateParishes&&<option value="">Carregando paróquias de {createSelectedCity.name}…</option>}
              {createSelectedCity&&!loadingCreateParishes&&createParishes.length===0&&<option value="">Nenhuma paróquia ativa neste município ainda</option>}
              {createParishes.map(p=>(
                <option key={p.id} value={p.id}>{p.name}{p.jurisdiction?` (${p.jurisdiction})`:''}</option>
              ))}
            </select>
            {createSelectedCity&&!loadingCreateParishes&&createParishes.length===0&&(
              <small className="field-note">Não encontrou sua paróquia listada? Você também pode enviar uma solicitação completa em <Link href={`/participar?cidade=${createSelectedCity.code}`} style={{textDecoration:'underline',fontWeight:600}}>Solicitar inclusão</Link>.</small>
            )}
          </label>

          {createFeedback?.error&&<p className="form-error" role="alert">{createFeedback.error}</p>}
          {createFeedback?.ok&&<p className="form-success" role="status">{createFeedback.ok}</p>}

          <button type="submit" className="primary-button" disabled={creatingHouse||!createSelectedCity||!createParishId}>
            {creatingHouse?'Construindo sua casa no mapa…':'Construir minha casa e ir para lá'} <ArrowUpRight size={15}/>
          </button>
        </form>
      </div>}
      {modal==='rules'&&<HowItWorksGuide onOpenCreateHouse={()=>openCreateHouseModal()} onOpenWalk={()=>openWalkMode(focusedCity)} />}
      {modal==='layers'&&<div className="layer-options"><fieldset className="geography-buttons"><legend>Explorar as regiões do Brasil</legend>{Object.keys(REGIONS).map(region=><button key={region} onClick={()=>inspectGeography(region)}>{region}</button>)}</fieldset><label><input type="checkbox" checked={showHighways} onChange={event=>setShowHighways(event.target.checked)}/> Rodovias e conexões entre cidades</label><p>A malha do IBGE inclui rodovias federais, estaduais e outras estradas. Aproxime para carregar as vias da região. As entradas são adaptadas à cidade virtual; ligações em ocre são ilustrativas. Não são rotas de navegação.</p><label><input type="checkbox" checked={showRoads} onChange={event=>setShowRoads(event.target.checked)}/> Vias reais do OpenStreetMap</label><p>O visual padrão é ilustrado. Ative a cartografia real para orientação; as construções da comunidade continuam sendo uma representação virtual.</p></div>}
      {modal==='list'&&<div className="modal-places">{listCity?<><button onClick={()=>setListCity(null)}><MapPin size={16}/><span>Todas as cidades</span></button>{worlds[listCity]?worlds[listCity].parishes.map(parish=><details className="community-neighborhood" key={parish.id}><summary><Church size={17}/><span>{parish.name}<small>{worlds[listCity].houses.filter(h=>h.parish_id===parish.id).length} casas</small></span></summary><button onClick={()=>inspect({city:cities.find(c=>c.code===listCity)!,parish})}>Ver a comunidade <ArrowUpRight size={13}/></button>{worlds[listCity].houses.filter(h=>h.parish_id===parish.id).map(house=><button key={house.id} onClick={()=>inspect({city:cities.find(c=>c.code===listCity)!,parish,house})}><Home size={15}/><span>{house.display_name}<small>@{house.username}</small></span></button>)}</details>):<p role="status">Carregando a comunidade…</p>}</>:filteredCities.map(city=><button key={city.code} onClick={()=>{focusCity(city);setListCity(city.code);void loadCity(city.code).catch(()=>{});setModal('list');}}><MapPin size={17}/><span><strong>{city.name} · {city.uf}</strong><small>{city.houses} casas · {city.parishes} bairros paroquiais</small></span><ArrowUpRight size={15}/></button>)}</div>}
      {modal==='geography'&&geography&&<GeographyPanel cities={cities} region={geography.region} uf={geography.uf} onChoose={inspectGeography} onExplore={closeModal} onList={()=>{setListCity(null);setModal('list');}}/>}{modal==='details'&&selection&&<div className="community-detail">
        <span className="community-kicker">
          {selection.house
            ? (selection.house.role === 'criador' || selection.house.level === 99 || selection.house.username === 'lucasgfr26'
                ? '👑 CRIADOR DA PLATAFORMA · NÍVEL 99'
                : 'MORADOR DA COMUNIDADE')
            : selection.parish
            ? 'BAIRRO PAROQUIAL'
            : 'UMA CIDADE, MUITAS COMUNIDADES'}
        </span>
        {selection.house && (
          <div className="resident-identity">
            <span
              className="resident-initial"
              style={
                selection.house.role === 'criador' || selection.house.level === 99 || selection.house.username === 'lucasgfr26'
                  ? { background: 'linear-gradient(135deg, #ffd700, #b8860b)', color: '#000', fontWeight: 'bold' }
                  : undefined
              }
            >
              {selection.house.role === 'criador' || selection.house.level === 99 || selection.house.username === 'lucasgfr26'
                ? '👑'
                : selection.house.display_name.slice(0, 1).toLocaleUpperCase('pt-BR')}
            </span>
            <div>
              <strong>
                {selection.house.display_name}
                {(selection.house.role === 'criador' || selection.house.level === 99 || selection.house.username === 'lucasgfr26') && (
                  <span style={{ marginLeft: 6, fontSize: 11, padding: '2px 6px', background: '#ffd70025', color: '#b8860b', border: '1px solid #ffd700', borderRadius: 4, fontWeight: 700 }}>
                    Nível 99 · Criador
                  </span>
                )}
              </strong>
              <a href={`https://www.instagram.com/${encodeURIComponent(selection.house.username)}/`} target="_blank" rel="noreferrer">
                @{selection.house.username} <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        )}

        {selection.house && (
          <ResidentGamificationCard
            house={selection.house}
            city={selection.city}
            parish={selection.parish}
            onUpdate={() => void loadCity(selection.city.code, true)}
          />
        )}

        {selection.parish && !selection.house && selection.parish.has_approved_priest && (
          <div className="priest-approved-banner" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', margin: '12px 0' }}>
            <span className="eyebrow" style={{ color: '#16a34a', fontWeight: 700 }}>✨ PÁROCO CONFIRMADO</span>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#166534' }}>
              <strong>{selection.parish.priest_name}</strong> · Bênção pastoral ativa (+10% de bônus em todo o XP no bairro!)
            </p>
          </div>
        )}
        <p><MapPin size={14}/> {selection.city.name} · {STATE_NAMES[selection.city.uf]} · {regionFor(selection.city.uf)}</p>
        {selection.parish&&<p><Church size={14}/> {selection.parish.name}</p>}
        {selection.parish?.catalog_id&&<p className="field-note">{selection.parish.jurisdiction??'Diocese em aberto'}</p>}
        {selection.parish?.source_url&&<a className="text-button" href={selection.parish.source_url} target="_blank" rel="noreferrer">{selection.parish.source_kind==='reference'?'Fonte de referência · Acervo Católico':'Consultar fonte institucional'} <ArrowUpRight size={13}/></a>}
        {selection.parish?.catalog_id&&!selection.house&&<p className="field-note">{selection.parish.source_kind==='reference'?'Registro de diretório independente, com vínculo diocesano ainda não confirmado.':'Paróquia importada de diretório institucional.'} A igreja e o bairro são ilustrativos; a importação não confirma o perfil de nenhum padre.</p>}
        {selection.parish&&!selection.house&&<div className="community-detail-metrics"><span><strong>{parishHouses.length}</strong> casas</span><span><strong>{churchConstructionLevel(parishHouses.length)}</strong> nível da construção</span></div>}
        {!selection.parish&&!selection.house&&<><div className="community-detail-metrics"><span><strong>{selection.city.houses}</strong> casas</span><span><strong>{selection.city.parishes}</strong> bairros paroquiais</span></div><p className="field-note">As paróquias compartilham o mesmo município e seus espaços públicos. A sede municipal é posicionada a partir dos dados oficiais do IBGE.</p></>}
        {selection.parish?.description&&<p>{selection.parish.description}</p>}
        <button className="primary-button" onClick={()=>focusCity(selection.city,selection.house?.id,selection.parish?.id)}>Localizar {selection.house?'esta casa':selection.parish?'esta paróquia':'esta cidade'} no mapa <ArrowUpRight size={15}/></button>
        <button type="button" className="outline-button" style={{width:'100%',marginTop:'10px',background:'#102738',borderColor:'#102738',color:'#fff'}} onClick={()=>openWalkMode(selection.city)}><Footprints size={14}/> Passear pelas ruas em 3D</button>
        {!selection.house&&<button className="outline-button" style={{width:'100%',marginTop:'10px'}} onClick={()=>openCreateHouseModal(undefined,{code:selection.city.code,name:selection.city.name,uf:selection.city.uf},selection.parish?.id)}>Construir minha casa {selection.parish?'nesta paróquia':'nesta cidade'} <Home size={14}/></button>}
        {!selection.parish&&!selection.house&&<><button className="text-button" onClick={()=>focusCity(selection.city,undefined,undefined,true)}>Ver limite municipal · IBGE <MapPin size={14}/></button><p className="field-note">Dourado identifica a área virtual das construções. Azul tracejado mostra o limite municipal simplificado do IBGE.</p><button className="text-button" onClick={()=>inspectGeography(regionFor(selection.city.uf),selection.city.uf)}>Explorar {STATE_NAMES[selection.city.uf]}</button></>}
        {!selection.house&&<button className="text-button" onClick={()=>{setListCity(selection.city.code);void loadCity(selection.city.code).catch(()=>{});setModal('list');}}>Ver bairros e moradores <List size={15}/></button>}
      </div>}
    </MapDialog>}
    {modal==='walk'&&(()=>{
      const walkCity=walkTargetCity??currentViewCity??cities[0];
      if(!walkCity)return null;
      let walkWorld=worlds[walkCity.code];
      if(!walkWorld){
        return <MapLoading label={`Preparando as ruas e paróquias de ${walkCity.name}…`}/>;
      }
      if(!walkWorld.parishes||walkWorld.parishes.length===0){
        walkWorld={
          ...walkWorld,
          parishes:[{
            id:99000000+walkCity.code,
            city_code:walkCity.code,
            name:`Paróquia Matriz de ${walkCity.name}`,
            slot:0,
            description:`Comunidade paroquial de ${walkCity.name}`,
            active:true,
          }],
        };
      }
      const currentHouse = selection?.house ?? (recentHouse?.username ? { username: recentHouse.username, role: recentHouse.role, level: recentHouse.level } : null);
      const isCreator = currentHouse?.role === 'criador' || currentHouse?.level === 99 || currentHouse?.username === 'lucasgfr26';
      return (
        <WalkMode
          city={walkCity}
          world={walkWorld}
          onExit={()=>{
            const finalCity = walkTargetCity ?? walkCity;
            closeModal();
            if(finalCity) focusCity(finalCity);
          }}
          onTravel={async (destinationCode:number)=>{
            let destCity=cities.find(c=>c.code===destinationCode);
            if(!destCity){
              const res=await fetch(`/api/municipalities?q=${destinationCode}`).then(r=>r.ok?r.json():null).catch(()=>null);
              const mun=res?.municipalities?.find((m:any)=>m.code===destinationCode);
              if(mun){
                destCity={code:mun.code,name:mun.name,uf:mun.uf,description:'',active:true,parishes:mun.catalog_parishes??1,houses:0};
                setExtraCities(prev=>({...prev,[destinationCode]:destCity!}));
              }
            }
            if(!destCity)return null;
            let destWorld=await loadCity(destCity.code,true).catch(()=>null);
            if(!destWorld||!destWorld.parishes||destWorld.parishes.length===0){
              destWorld={
                parishes:[{
                  id:99000000+destCity.code,
                  city_code:destCity.code,
                  name:`Paróquia Matriz de ${destCity.name}`,
                  slot:0,
                  description:`Comunidade paroquial de ${destCity.name}`,
                  active:true,
                }],
                houses:destWorld?.houses??[],
              };
            }
            setWalkTargetCity(destCity);
            setFocus(prev => ({ code: destCity!.code, sequence: prev.sequence + 1 }));
            setModal('walk');
            window.history.replaceState(null, '', `/?cidade=${destCity.code}`);
            return { city: destCity, world: destWorld };
          }}
          username={currentHouse?.username ?? 'fiel_devoto'}
          defaultRole={isCreator ? 'criador' : 'leigo'}
          targetParishId={selection?.parish?.id ?? focus.parishId ?? undefined}
          autoWalk={autoWalk}
          cleanMode={cleanMode}
        />
      );
    })()}
  </main>;
}
