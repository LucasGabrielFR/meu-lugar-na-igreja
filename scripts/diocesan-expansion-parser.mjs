import {createHash} from 'node:crypto';
import {decodeDirectory} from './catalog-html.mjs';
import {normalizeCatalogName} from './catalog-normalization.mjs';

export const directoryKey=(provider,url)=>`${provider}:${createHash('sha256').update(url).digest('hex').slice(0,16)}`;
export function directoryLinks(html,pattern){
  return [...html.matchAll(/<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map(m=>({url:decodeDirectory(m[2]),name:decodeDirectory(m[4]).replace(/\s+/g,' ').trim(),attributes:decodeDirectory(m[1]+' '+m[3])}))
    .filter(row=>pattern.test(row.url));
}
export function parseFlorianopolis(html,municipalities){
  const parishes=[],skipped=[];let city=null;
  for(const paragraph of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)){
    const links=directoryLinks(paragraph[1],/^https:\/\/arquifln\.org\.br\/igrejas\//);
    if(!links.length){
      // Every municipality heading resets the scope, even if its spelling cannot be resolved.
      if(/<strong\b/i.test(paragraph[1])&&/#800000/i.test(paragraph[1])){
        const label=normalizeCatalogName(decodeDirectory(paragraph[1]));
        city=municipalities.find(m=>m.uf==='SC'&&normalizeCatalogName(m.name)===label)??null;
      }
      continue;
    }
    for(const row of links){
      const key=directoryKey('florianopolis',row.url);
      if(!/^par[oó]quia\b/i.test(row.name)||/militar|reitoria|capelania|quase.par[oó]quia/i.test(row.name+' '+row.url+' '+row.attributes)){
        skipped.push({key,name:row.name,source_url:row.url,reason:'Capelania, reitoria ou registro sem classificação paroquial inequívoca'});continue;
      }
      if(!city){skipped.push({key,name:row.name,source_url:row.url,reason:'Grupo municipal não reconhecido'});continue;}
      parishes.push({key,jurisdiction:'florianopolis',name:row.name,municipality_code:city.code,source_url:row.url,source_updated_at:null});
    }
  }
  return {parishes:[...new Map(parishes.map(p=>[p.key,p])).values()],skipped};
}

export function resolveDirectoryAddress(address,municipalities,ufs){
  const text=' '+normalizeCatalogName(address)+' ';
  const matches=municipalities.filter(m=>ufs.includes(m.uf)&&text.includes(' '+normalizeCatalogName(m.name)+' '));
  // A shorter municipal name can be contained in another (e.g. Rio Branco / Rio Branco do Sul).
  return matches.filter(m=>!matches.some(other=>other!==m&&normalizeCatalogName(other.name).includes(normalizeCatalogName(m.name)+' ')));
}

export function parseAracaju(html,municipalities){
  const parishes=[],skipped=[];
  for(const row of directoryLinks(html,/^https:\/\/arquidiocesedearacaju\.org\/paroquias\/[^/?]+\/?$/)){
    const key=directoryKey('aracaju',row.url);
    if(!/^par[oó]quia\b/i.test(row.name)||/quase.par[oó]quia/i.test(row.name))continue;
    // Only the terminal city/UF in the directory label is geographic evidence; patron names are not.
    const tail=row.name.split(/\s+[–—-]\s+|,\s*/).at(-1).replace(/[\/-]\s*SE\s*$/i,'');
    const city=municipalities.find(m=>m.uf==='SE'&&normalizeCatalogName(m.name)===normalizeCatalogName(tail));
    if(!city){skipped.push({key,name:row.name,source_url:row.url,reason:'Município no título sem correspondência exata'});continue;}
    parishes.push({key,jurisdiction:'aracaju',name:row.name,municipality_code:city.code,source_url:row.url,source_updated_at:null});
  }
  return {parishes:[...new Map(parishes.map(p=>[p.key,p])).values()],skipped};
}
