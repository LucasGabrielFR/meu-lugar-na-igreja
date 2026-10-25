import {existsSync,readFileSync,writeFileSync,mkdirSync,renameSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='https://geoservicos.ibge.gov.br/geoserver/ows';
const layer='CCAR:BC250_2021_Trecho_Rodoviario_L',batch=2000;
mkdirSync('.cache/ibge-road-pages',{recursive:true});
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function simplify(points,tolerance){
  if(points.length<=2)return points;
  const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;
  const stack=[[0,points.length-1]],limit=tolerance*tolerance;
  while(stack.length){const [first,last]=stack.pop(),a=points[first],b=points[last],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;let maximum=limit,index=-1;
    for(let i=first+1;i<last;i++){const p=points[i],t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0,d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(d>maximum){maximum=d;index=i;}}
    if(index>=0){keep[index]=1;stack.push([first,index],[index,last]);}
  }
  return points.filter((_,i)=>keep[i]).map(([x,y])=>[+x.toFixed(6),+y.toFixed(6)]);
}
async function page(offset){
  const path=`.cache/ibge-road-pages/${offset}.json`;
  if(existsSync(path)&&!process.argv.includes('--refresh')&&Date.now()-statSync(path).mtimeMs<86400000)return JSON.parse(readFileSync(path,'utf8'));
  for(let attempt=0;attempt<3;attempt++){
    try{const url=base+'?'+new URLSearchParams({service:'WFS',version:'2.0.0',request:'GetFeature',typeNames:layer,outputFormat:'application/json',srsName:'EPSG:4326',count:String(batch),startIndex:String(offset),propertyName:'geom,sigla,jurisdicao,operacional,situacaofisica,tipovia'});
      const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`IBGE HTTP ${r.status}`);const j=await r.json();if(!Array.isArray(j.features)||!Number.isInteger(j.numberMatched))throw Error('Resposta IBGE inválida');
      writeFileSync(path+'.tmp',JSON.stringify(j));renameSync(path+'.tmp',path);return j;
    }catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));}
  }
}
const lines=[],seen=new Set();let expected=Infinity,downloaded=0;
for(let offset=0;offset<expected;offset+=batch){
  const j=await page(offset);if(expected!==Infinity&&j.numberMatched!==expected)throw Error('Total IBGE mudou durante coleta; snapshot preservado');expected=j.numberMatched;
  if(j.features.length!==Math.min(batch,expected-offset))throw Error('Página incompleta; snapshot preservado');
  for(const feature of j.features){if(seen.has(feature.id))throw Error('ID repetido na paginação IBGE');seen.add(feature.id);const properties=feature.properties;
    if(normalize(properties.operacional)!=='sim'||normalize(properties.situacaofisica)!=='construida')continue;
    const paths=feature.geometry?.type==='LineString'?[feature.geometry.coordinates]:feature.geometry?.type==='MultiLineString'?feature.geometry.coordinates:[];
    for(const [index,coordinates]of paths.entries())if(coordinates.length>1){const points=simplify(coordinates,.00008);if(points.some(([x,y])=>x< -75||x> -30||y< -35||y>7))throw Error('Eixos geográficos IBGE inválidos');
      lines.push({id:`ibge:${feature.id.split('.').at(-1)}:${index}`,br:String(properties.sigla??'').trim(),uf:'',rank:normalize(properties.jurisdicao)==='federal'?0:normalize(properties.jurisdicao)==='estadual'?1:2,points});}
  }
  downloaded+=j.features.length;console.log(`IBGE rodovias ${downloaded}/${expected}, construídas operacionais: ${lines.length}`);await new Promise(resolve=>setTimeout(resolve,250));
}
if(lines.length<50000||seen.size!==expected)throw Error('Malha nacional insuficiente; snapshot preservado');
lines.sort((a,b)=>a.id.localeCompare(b.id));
const revision=createHash('sha256').update(JSON.stringify(lines)).digest('hex').slice(0,12),folder=`public/data/roads-ibge/${revision}`;
mkdirSync(folder,{recursive:true});
const cells=new Map();
for(const line of lines){const xs=line.points.map(p=>p[0]),ys=line.points.map(p=>p[1]);const bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  for(let x=Math.floor(bounds[0]/2);x<=Math.floor(bounds[2]/2);x++)for(let y=Math.floor(bounds[1]/2);y<=Math.floor(bounds[3]/2);y++){const key=`${x}_${y}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(line);}
}
const tiles=[];
for(const [key,rows]of cells){writeFileSync(`${folder}/${key}.json`,JSON.stringify({lines:rows}));const [x,y]=key.split('_').map(Number);tiles.push({key,bounds:[x*2,y*2,x*2+2,y*2+2],url:`/data/roads-ibge/${revision}/${key}.json`,features:rows.length});}
const overview=lines.filter(line=>line.rank===0).map(line=>({...line,points:simplify(line.points,.003)}));
const metadata={source:base,layer,attribution:'IBGE · BC250 2021',retrieved_at:new Date().toISOString(),revision,features:lines.length,source_features:expected,overview_features:overview.length,filter:'operacional=Sim; situacaofisica=Construída',coverage:'Rodovias federais, estaduais e demais trechos rodoviários da BC250; vias locais carregadas por região. Base cartográfica de referência, sem roteamento.',tile_degrees:2};
writeFileSync('public/data/highways.json.tmp',JSON.stringify({metadata,lines:overview,tiles})+'\n');renameSync('public/data/highways.json.tmp','public/data/highways.json');
console.log(JSON.stringify(metadata));
