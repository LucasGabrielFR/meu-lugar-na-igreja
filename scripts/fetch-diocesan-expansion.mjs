import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeDirectory} from './catalog-html.mjs';
import {normalizeCatalogName} from './catalog-normalization.mjs';
import {directoryKey,directoryLinks,parseFlorianopolis,parseAracaju,resolveDirectoryAddress} from './diocesan-expansion-parser.mjs';
const municipalities=JSON.parse(readFileSync('public/data/municipios.json','utf8'));
mkdirSync('.cache/official-expansion',{recursive:true});
async function get(url){
  const file='.cache/official-expansion/'+createHash('sha256').update(url).digest('hex')+'.txt';
  if(existsSync(file)&&Date.now()-statSync(file).mtimeMs<86400000&&!process.argv.includes('--refresh'))return readFileSync(file,'utf8');
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`${url}: HTTP ${response.status}; snapshot preservado`);
  const text=await response.text();writeFileSync(file,text);await new Promise(r=>setTimeout(r,400));return text;
}
const snapshot={fetched_at:new Date().toISOString(),coverage:'Complemento parcial de diretórios institucionais de Florianópolis, Rio Branco, Aracaju e Cuiabá. Não se declara cobertura nacional integral. Registros ambíguos ficam separados para revisão.',jurisdictions:[
  {key:'florianopolis',name:'Arquidiocese de Florianópolis',type:'archdiocese',website:'https://arquifln.org.br/'},
  {key:'riobranco',name:'Diocese de Rio Branco',type:'diocese',website:'https://diocesederiobranco.org.br/'},
  {key:'aracaju',name:'Arquidiocese de Aracaju',type:'archdiocese',website:'https://arquidiocesedearacaju.org/'},
  {key:'cuiaba',name:'Arquidiocese de Cuiabá',type:'archdiocese',website:'https://arquidiocesecuiaba.org.br/'}
],parishes:[],skipped:[]};
const append=result=>{snapshot.parishes.push(...result.parishes);snapshot.skipped.push(...result.skipped);};
append(parseFlorianopolis(await get('https://arquifln.org.br/paroquias'),municipalities));
const rb=await get('https://diocesederiobranco.org.br/nossas-paroquias');
for(const row of directoryLinks(rb,/^\.\/paroquias\//)){
  const url=new URL(row.url.replace(/^\.\//,''),'https://diocesederiobranco.org.br/').href,key=directoryKey('riobranco',url);
  if(/área|quase|catedral/i.test(row.name)){snapshot.skipped.push({key,name:row.name,source_url:url,reason:'Área, quase-paróquia ou catedral sem classificação paroquial explícita'});continue;}
  const html=await get(url),address=decodeDirectory(html.match(/geocode\(\{'address':\s*'([^']+)'/)?.[1]??'');
  const matches=resolveDirectoryAddress(address,municipalities,['AC','RO','AM']);
  // A title with a municipality can corroborate an address lacking its city; it cannot override another city.
  const titleMatches=resolveDirectoryAddress(row.name,municipalities,['AC','RO','AM']);
  const city=matches.length===1?matches[0]:!matches.length&&titleMatches.length===1?titleMatches[0]:null;
  if(!city){snapshot.skipped.push({key,name:row.name,source_url:url,reason:'Distrito/endereço sem município inequívoco; não usar o endereço da cúria como sede paroquial'});continue;}
  snapshot.parishes.push({key,jurisdiction:'riobranco',name:row.name,municipality_code:city.code,source_url:url,source_updated_at:null});
}
const aracaju='https://arquidiocesedearacaju.org/paroquias/';
const first=await get(aracaju);append(parseAracaju(first,municipalities));
const pages=new Set(directoryLinks(first,/^https:\/\/arquidiocesedearacaju\.org\/paroquias\/\?e-page-[a-z0-9]+=\d+$/).map(r=>r.url));
for(const url of pages)append(parseAracaju(await get(url),municipalities));
const cuiabaUrl='https://arquidiocesecuiaba.org.br/wp-json/wp/v2/paroquia?per_page=100';
const cuiaba=JSON.parse(await get(cuiabaUrl));
if(!Array.isArray(cuiaba)||cuiaba.length<25||cuiaba.length===100)throw Error('Revisar paginação/classificação de Cuiabá');
for(const row of cuiaba){
  const name=decodeDirectory(row.title.rendered),key=`cuiaba:${row.id}`;
  if(/santuário|catedral|quase/i.test(name)){snapshot.skipped.push({key,name,source_url:row.link,reason:'Santuário/catedral sem classificação paroquial explícita'});continue;}
  const html=await get(row.link);
  const address=decodeDirectory(html.match(/<iframe\b[^>]*src=["']https:\/\/maps\.google\.com\/maps\?[^>]*title=["']([^"']+)["']/i)?.[1]??'');
  const matches=resolveDirectoryAddress(address,municipalities,['MT']);
  if(matches.length!==1){snapshot.skipped.push({key,name,source_url:row.link,reason:'Endereço institucional sem município MT inequívoco'});continue;}
  snapshot.parishes.push({key,jurisdiction:'cuiaba',name,municipality_code:matches[0].code,source_url:row.link,source_updated_at:row.modified_gmt?row.modified_gmt+'Z':null});
}
snapshot.parishes=[...new Map(snapshot.parishes.map(p=>[p.key,p])).values()];
snapshot.skipped=[...new Map(snapshot.skipped.map(p=>[p.key,p])).values()].filter(p=>!snapshot.parishes.some(other=>other.key===p.key));
for(const jurisdiction of snapshot.jurisdictions){const count=snapshot.parishes.filter(p=>p.jurisdiction===jurisdiction.key).length;if(count<15)throw Error(`${jurisdiction.key}: apenas ${count} fichas reconhecidas; revisar antes de substituir snapshot`);console.log(jurisdiction.name,count);}
if(snapshot.parishes.some(p=>/\bteste\b|demonstra/.test(normalizeCatalogName(p.name))))throw Error('Registro de teste rejeitado');
writeFileSync('db/catalog/diocesan-expansion.json.tmp',JSON.stringify(snapshot,null,2)+'\n');renameSync('db/catalog/diocesan-expansion.json.tmp','db/catalog/diocesan-expansion.json');
console.log(JSON.stringify({parishes:snapshot.parishes.length,skipped:snapshot.skipped.length}));
