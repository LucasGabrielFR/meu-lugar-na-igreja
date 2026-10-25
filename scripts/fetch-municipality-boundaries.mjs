import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const directory='db/geography',cache='.cache/municipal-boundaries.geojson';
mkdirSync(directory,{recursive:true});mkdirSync('.cache',{recursive:true});
const url='https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=municipio&formato=application/vnd.geo%2Bjson&qualidade=maxima';
let collection,metadata;
if(existsSync(cache)&&!process.argv.includes('--refresh')){
  collection=JSON.parse(readFileSync(cache,'utf8'));metadata=JSON.parse(readFileSync('.cache/municipal-boundaries.source.json','utf8'));
}else{
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('IBGE HTTP '+response.status);
  collection=await response.json();metadata={url,retrieved_at:new Date().toISOString()};
}
if(!Array.isArray(collection.features)||collection.features.length<5000)throw Error('Coleção nacional incompleta');
const municipalities=JSON.parse(readFileSync('public/data/municipios.json','utf8')),codes=new Set(collection.features.map(f=>Number(f.properties?.codarea)));
const missing=[];
for(const municipality of municipalities.filter(m=>!codes.has(m.code))){
  try{
    const endpoint=`https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${municipality.code}?formato=application/vnd.geo%2Bjson&qualidade=maxima`;
    const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);
    const result=await response.json(),feature=result.features?.find(f=>Number(f.properties?.codarea)===municipality.code);
    if(!feature)throw Error('Geometria municipal ausente');collection.features.push(feature);
  }catch(error){missing.push({...municipality,reason:error.message});}
}
writeFileSync(directory+'/municipality-boundaries.geojson.gz',gzipSync(JSON.stringify(collection),{level:9}));
const report={source_url:url,retrieved_at:metadata.retrieved_at,features:collection.features.length,missing};
writeFileSync(directory+'/municipality-boundaries.source.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
