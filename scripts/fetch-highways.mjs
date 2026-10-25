import {writeFileSync,renameSync} from 'node:fs';
const layer='https://pamgia.ibama.gov.br/server/rest/services/01_Publicacoes_Bases/tra_trecho_rodoviario_principal_l/MapServer/23';
async function query(parameters){const r=await fetch(layer+'/query?'+new URLSearchParams(parameters),{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`DNIT HTTP ${r.status}`);const j=await r.json();if(j.error)throw Error(JSON.stringify(j.error));return j;}
const where="superficie IN ('PAV','DUP','IMP','LEN')";
const ids=(await query({where,returnIdsOnly:'true',f:'json'})).objectIds;
if(!Array.isArray(ids)||ids.length<3000)throw Error('Malha DNIT incompleta');
const lines=[],versions=new Set();let features=0;
for(let start=0;start<ids.length;start+=300){
  const chunk=ids.slice(start,start+300);
  const j=await query({objectIds:chunk.join(','),outFields:'objectid,codigo_br,unidade_fe,superficie,versao_snv',returnGeometry:'true',outSR:'4326',geometryPrecision:'5',maxAllowableOffset:'0.0005',f:'geojson'});
  if(!Array.isArray(j.features)||j.features.length!==chunk.length)throw Error('Página DNIT incompleta; snapshot preservado');
  features+=j.features.length;
  for(const feature of j.features){versions.add(feature.properties.versao_snv);const paths=feature.geometry?.type==='MultiLineString'?feature.geometry.coordinates:feature.geometry?.type==='LineString'?[feature.geometry.coordinates]:[];
    for(const [index,points] of paths.entries())if(points.length>1)lines.push({id:`${feature.properties.objectid}:${index}`,br:feature.properties.codigo_br,uf:feature.properties.unidade_fe,points});
  }
  console.log(`DNIT ${features}/${ids.length}`);await new Promise(resolve=>setTimeout(resolve,300));
}
if(features!==ids.length||!lines.length)throw Error('Malha inválida');
const metadata={retrieved_at:new Date().toISOString(),source:layer,attribution:'DNIT · distribuição IBAMA/PAMGIA',coverage:'Rodovias primárias da base pública DNIT. Não é toda a malha estadual/municipal e não serve para navegação.',dataset_versions:[...versions],filter:where,features,lines:lines.length,generalization_degrees:0.0005};
writeFileSync('public/data/highways.json.tmp',JSON.stringify({metadata,lines})+'\n');renameSync('public/data/highways.json.tmp','public/data/highways.json');
console.log(JSON.stringify(metadata));
