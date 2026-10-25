import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizeCatalogName} from './catalog-normalization.mjs';
const municipalities=JSON.parse(readFileSync('public/data/municipios.json','utf8'));
import {decodeDirectory} from './catalog-html.mjs';
const facts={fetched_at:new Date().toISOString(),coverage:'Complemento parcial dos diretórios oficiais de Manaus, Natal, Vitória e Roraima. Só entram fichas identificadas como paróquias com município inequívoco.',jurisdictions:[{key:'manaus',name:'Arquidiocese de Manaus',type:'archdiocese',website:'https://arquidiocesedemanaus.org.br/'},{key:'natal',name:'Arquidiocese de Natal',type:'archdiocese',website:'https://www.arquidiocesedenatal.org.br/'},{key:'vitoria',name:'Arquidiocese de Vitória do Espírito Santo',type:'archdiocese',website:'https://www.aves.org.br/'},{key:'roraima',name:'Diocese de Roraima',type:'diocese',website:'https://diocesederoraima.org.br/'}],parishes:[],skipped:[]};
async function fetchSource(url){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return r.text();}
const add=(key,jurisdiction,name,municipality_code,source_url)=>{if(/\bteste\b|demonstra/i.test(name))throw Error('Ficha de teste na fonte institucional');if(!facts.parishes.some(p=>p.key===key))facts.parishes.push({key,jurisdiction,name,municipality_code,source_url,source_updated_at:null});};
const manaus=JSON.parse(await fetchSource('https://arquidiocesedemanaus.org.br/wp-json/arquidiocese/v1/paroquias'));
if(!Array.isArray(manaus)||manaus.length<50)throw Error('Diretório Manaus incompleto');
for(const row of manaus.filter(r=>normalizeCatalogName(r.tipo)==='paroquia')){
  const context=normalizeCatalogName(row.endereco+' '+row.nome),matches=municipalities.filter(m=>m.uf==='AM'&&new RegExp(`\\b${normalizeCatalogName(m.name)}\\b`).test(context));
  for(let i=matches.length-1;i>=0;i--)if(matches.some(other=>other!==matches[i]&&normalizeCatalogName(other.name).includes(normalizeCatalogName(matches[i].name)+' ')))matches.splice(i,1);
  if(!matches.length&&/\b690\d{2}\b/.test(context))matches.push(municipalities.find(m=>m.code===1302603));
  if(!matches.length&&context.includes('careiro castanho'))matches.push(municipalities.find(m=>m.code===1301100));
  if(matches.length!==1){facts.skipped.push({key:`manaus:${row.id}`,name:row.nome,reason:'Município não inequívoco no endereço oficial'});continue;}
  add(`manaus:${row.id}`,'manaus',row.nome,matches[0].code,row.url);
}
const natalPages=['vicariato-urbano','cópia-vicariato-urbano','vicariato-norte','cópia-vicariato-norte','vicariato-sul','cópia-vicariato-sul','cópia-vicariato-sul-01'];
for(const page of natalPages){
  const source='https://www.arquidiocesedenatal.org.br/'+encodeURI(page),html=await fetchSource(source);
  const blocks=[...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].flatMap(m=>decodeDirectory(m[1]).split('\n').map(s=>s.trim())).filter(Boolean);
  let seen=0;
  for(let i=0;i<blocks.length;i++){
    const title=blocks[i];if(!/^Paróquia\b/i.test(title))continue;seen++;
    const tail=title.split(/\s+[–—-]\s+/).at(-1),byTail=tail!==title?municipalities.filter(m=>m.uf==='RN'&&normalizeCatalogName(m.name)===normalizeCatalogName(tail)):[];
    const address=[];for(let n=i+1;n<Math.min(blocks.length,i+6)&&!/^Paróquia\b/i.test(blocks[n]);n++)address.push(blocks[n]);
    const normalized=normalizeCatalogName(address.join(' '));
    const matches=byTail.length?byTail:municipalities.filter(m=>m.uf==='RN'&&normalized.includes(normalizeCatalogName(m.name)+' rn'));
    const key='natal:'+createHash('sha256').update(title).digest('hex').slice(0,16);
    if(matches.length!==1){facts.skipped.push({key,name:title,reason:'Município RN sem correspondência inequívoca',source_url:source});continue;}
    add(key,'natal',title,matches[0].code,source);
  }
  if(!seen)throw Error('Layout de Natal alterado; snapshot preservado');
  console.log(`Natal ${page}: ${seen} fichas`);
  await new Promise(resolve=>setTimeout(resolve,350));
}
const vitoriaUrl='https://www.aves.org.br/vitoria-paroquias/',vitoria=await fetchSource(vitoriaUrl);
for(const match of vitoria.matchAll(/<article\b[^>]*id="post-(\d+)"[^>]*>([\s\S]*?)<\/article>/gi)){
  const heading=match[2].match(/<h1\b[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);if(!heading)continue;
  const name=decodeDirectory(heading[2]);if(/área|capela|reitoria/i.test(name))continue;
  add(`vitoria:${match[1]}`,'vitoria',name,3205309,heading[1]);
}
if(facts.parishes.filter(p=>p.jurisdiction==='manaus').length<40||facts.parishes.filter(p=>p.jurisdiction==='natal').length<70||!facts.parishes.some(p=>p.jurisdiction==='vitoria'))throw Error('Cobertura diocesana insuficiente; snapshot preservado');
const roraimaIndex=await fetchSource('https://diocesederoraima.org.br/paroquias-e-areas/');
facts.withdrawn_keys=[];
const roraimaLinks=new Map([...roraimaIndex.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>[m[1],decodeDirectory(m[2])]).filter(([,name])=>/^Paróquia\b/i.test(name)));
for(const [url,name] of roraimaLinks){
  const slug=new URL(url).pathname.split('/').filter(Boolean).at(-1);
  const pages=JSON.parse(await fetchSource('https://diocesederoraima.org.br/wp-json/wp/v2/pages?'+new URLSearchParams({slug,_fields:'id,link,content'})));
  if(pages.length!==1){facts.skipped.push({name,reason:'Ficha individual não localizada',source_url:url});continue;}
  if(slug.includes('-e-')){facts.withdrawn_keys.push(`roraima:${pages[0].id}`);facts.skipped.push({name,reason:'Página conjunta não identifica uma única paróquia/sede; exige revisão',source_url:url});continue;}
  const content=normalizeCatalogName(name+' '+decodeDirectory(pages[0].content.rendered));
  const tail=name.split(/\s+[–—-]\s+/).at(-1),tailMatches=tail!==name?municipalities.filter(m=>m.uf==='RR'&&normalizeCatalogName(m.name)===normalizeCatalogName(tail)):[];
  const matches=tailMatches.length?tailMatches:municipalities.filter(m=>m.uf==='RR'&&new RegExp(`\\b${normalizeCatalogName(m.name)}\\b`).test(content));
  if(matches.length!==1){facts.skipped.push({name,reason:'Página agrupa municípios ou não identifica sede inequívoca',source_url:url});continue;}
  add(`roraima:${pages[0].id}`,'roraima',name,matches[0].code,url);
  await new Promise(resolve=>setTimeout(resolve,300));
}
writeFileSync('db/catalog/diocesan-directories.json.tmp',JSON.stringify(facts,null,2)+'\n');renameSync('db/catalog/diocesan-directories.json.tmp','db/catalog/diocesan-directories.json');
console.log(JSON.stringify({parishes:facts.parishes.length,byDiocese:Object.fromEntries(facts.jurisdictions.map(j=>[j.key,facts.parishes.filter(p=>p.jurisdiction===j.key).length])),skipped:facts.skipped.length}));
