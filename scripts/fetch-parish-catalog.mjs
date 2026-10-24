import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const decode = value => String(value).replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/<[^>]*>/g, '').trim();
const normalize = value => decode(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
async function collection(endpoint) {
  const result = [];
  let pages = 1;
  for (let page = 1; page <= pages; page++) {
    const response = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
    pages = Number(response.headers.get('x-wp-totalpages') ?? 1);
    if (!Number.isInteger(pages) || pages < 1 || pages > 30) throw new Error('Unexpected pagination');
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Expected an array from official source');
    result.push(...rows);
    if (page < pages) await new Promise(resolve => setTimeout(resolve, 300));
  }
  return result;
}
const municipalities = JSON.parse(readFileSync('public/data/municipios.json', 'utf8'));
const jurisdictions = [
  { key: 'arquisp', name: 'Arquidiocese de São Paulo', type: 'archdiocese', website: 'https://arquisp.org.br/' },
  { key: 'uruacu', name: 'Diocese de Uruaçu', type: 'diocese', website: 'https://diocesedeuruacu.com.br/' },
];
const parishes = [], skipped = [];
const sp = await collection('https://arquisp.org.br/wp-json/wp/v2/parish');
for (const row of sp) {
  const name = decode(row.title.rendered);
  if (!/^Paróquia\b/u.test(name)) { skipped.push({ key: `arquisp:${row.id}`, reason: 'Ficha não identificada explicitamente como paróquia', name }); continue; }
  parishes.push({ key: `arquisp:${row.id}`, jurisdiction: 'arquisp', name, municipality_code: 3550308, source_url: row.link, source_updated_at: `${row.modified_gmt}Z` });
}
const go = await collection('https://diocesedeuruacu.com.br/wp-json/wp/v2/posts?categories=15');
const tags = new Map((await collection('https://diocesedeuruacu.com.br/wp-json/wp/v2/tags')).map(tag => [tag.id, normalize(tag.name)]));
const goMunicipalities = municipalities.filter(m => m.uf === 'GO');
for (const row of go) {
  const tagged = (row.tags ?? []).map(id => tags.get(id));
  const matches = goMunicipalities.filter(m => tagged.includes(normalize(m.name)));
  if (matches.length !== 1) { skipped.push({ key: `uruacu:${row.id}`, reason: 'Município sem correspondência inequívoca nas tags oficiais', name: decode(row.title.rendered) }); continue; }
  parishes.push({ key: `uruacu:${row.id}`, jurisdiction: 'uruacu', name: decode(row.title.rendered), municipality_code: matches[0].code, source_url: row.link, source_updated_at: `${row.modified_gmt}Z` });
}
if (parishes.length < 250 || !parishes.some(p => p.municipality_code === 5214606)) throw new Error('Source coverage check failed; snapshot was not replaced');
const snapshot = { fetched_at: new Date().toISOString(), coverage: 'Catálogo parcial: fontes oficiais da Arquidiocese de São Paulo e Diocese de Uruaçu. Não representa todas as paróquias do Brasil.', jurisdictions, parishes, skipped };
mkdirSync('db/catalog', { recursive: true });
writeFileSync('db/catalog/parishes.json', JSON.stringify(snapshot, null, 2) + '\n');
console.log(JSON.stringify({ parishes: parishes.length, jurisdictions: jurisdictions.length, municipalities: new Set(parishes.map(p => p.municipality_code)).size, skipped }, null, 2));
