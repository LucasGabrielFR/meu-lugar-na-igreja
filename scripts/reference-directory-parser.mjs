import {decodeDirectory} from './catalog-html.mjs';
import {normalizeCatalogName,resolveCatalogMunicipality} from './catalog-normalization.mjs';
export function parseReferencePage(html,municipalities){
  const chunks=html.split(/<div\s+class=['"]posts mb['"]\s*>/i).slice(1);
  const records=[];
  for(const chunk of chunks){
    const heading=chunk.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i),link=chunk.match(/<a\b[^>]*href=["'](https:\/\/acervocatolico\.com\/igreja\/[^"']+)["']/i);
    if(!heading||!link)throw Error('Ficha de referência sem nome ou URL');
    const id=link[1].match(/-(\d+)$/)?.[1];if(!id)throw Error('Identificador de referência inválido');
    const name=decodeDirectory(heading[1]).replace(/\s+/g,' ').trim();
    const paragraphs=[...chunk.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].slice(0,4).map(m=>decodeDirectory(m[1]).replace(/\s+/g,' ').trim());
    const locations=paragraphs.filter(p=>/^.+\s[-–]\s[A-Z]{2}$/.test(p));
    const location=locations.at(-1)??null,municipality=resolveCatalogMunicipality(location,municipalities),normalized=normalizeCatalogName(name);
    records.push({key:`acervo:${id}`,name,municipality_code:municipality?.code??null,location,source_url:link[1],kind:/^paroquia\b/.test(normalized)&&!normalized.includes('quase paroquia')?'parish':'other'});
  }
  const pages=[...html.matchAll(/href=["']\/igrejas\/pagina\/(\d+)["']/g)].map(m=>Number(m[1]));
  return {records,pages:Math.max(1,...pages)};
}
