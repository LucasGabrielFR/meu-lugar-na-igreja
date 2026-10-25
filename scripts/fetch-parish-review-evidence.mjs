import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {decodeDirectory} from './catalog-html.mjs';
const audit=JSON.parse(readFileSync('docs/auditoria-paroquias.json','utf8'));
const locality=name=>name.match(/\(([^)]+)\)/)?.[1]??'';
const records=new Map();
for(const p of audit.candidates){
  if(locality(p.a.name)&&locality(p.b.name)&&locality(p.a.name)!==locality(p.b.name))continue;
  for(const r of [p.a,p.b])records.set(r.catalog_id,r);
}
mkdirSync('.cache',{recursive:true});
const file='.cache/parish-review-evidence.json',saved=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{};
const queue=[...records.values()].filter(r=>!saved[r.catalog_id]||(r.source_url.includes('acervocatolico')&&!saved[r.catalog_id].structured));let done=0;
async function worker(){while(queue.length){const row=queue.shift(),url=row.source_url;
  try{
    const cnbb=url.includes('portalcdicbr.cnbb.org.br'),endpoint=cnbb?'https://cdic-api.cnbb.org.br/api/v1/portal/church/'+url.split('/').pop():url;
    const response=await fetch(endpoint,{signal:AbortSignal.timeout(18000)});
    if(!response.ok)throw Error('HTTP '+response.status);
    let evidence;
    if(cnbb){const j=await response.json();evidence={title:j.name,addresses:[j.address?.fullAddress,j.address?.street].filter(Boolean),diocese:j.circumscription?.name};}
    else {
      let html=await response.text();
      const schemas=[...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{try{return [JSON.parse(m[1])];}catch{return [];}});
      const church=schemas.find(s=>s['@type']==='Church'&&s.address?.streetAddress);
      html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
      const title=decodeDirectory(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]??html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]??'');
      let text=decodeDirectory(html.replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi,'\n')).replace(/[ \t]+/g,' ');
      if(url.includes('acervocatolico'))text=text.split(/outras igrejas/i)[0];
      const addresses=text.split('\n').map(s=>s.trim()).filter(s=>/^(?:(?:endere[cç]o|localiza[cç][aã]o)\s*[:–-]?\s*)?(?:rua\b|r\.\s|avenida\b|av\.\s|pra[cç]a\b|estrada\b|rodovia\b|travessa\b|largo\b|quadra\b|q[ns]\w?\s)/i.test(s)).map(s=>s.slice(0,350)).slice(0,6);
      evidence=church?{title,addresses:[church.address.streetAddress],city:church.address.addressLocality,structured:true}:{title,addresses:addresses.slice(0,1).map(s=>s.split(/Telefone|E-mail|Secretaria/)[0]),structured:url.includes('acervocatolico')};
    }
    saved[row.catalog_id]={url,fetched_at:new Date().toISOString(),...evidence};
  }catch(error){saved[row.catalog_id]={url,error:error.message};}
  writeFileSync(file,JSON.stringify(saved,null,2)+'\n');done++;if(done%20===0)console.log(`Evidências: ${done}; restantes ${queue.length}`);
  await new Promise(resolve=>setTimeout(resolve,350));
}}
await Promise.all([worker(),worker(),worker()]);console.log(JSON.stringify({requested:records.size,saved:Object.keys(saved).length,failed:Object.values(saved).filter(r=>r.error).length}));
