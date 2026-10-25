import pg from 'pg';
import {writeFileSync} from 'node:fs';
import {loadParishResolutions} from './parish-reconciliation.mjs';
const plan=loadParishResolutions(),client=new pg.Client();await client.connect();
try{
  await client.query('BEGIN READ ONLY');
  const counts=(await client.query(`SELECT (SELECT count(*)::int FROM parish_catalog WHERE active) active_catalog,(SELECT count(*)::int FROM parishes WHERE active) active_neighborhoods,(SELECT count(*)::int FROM houses) houses,(SELECT count(*)::int FROM parish_catalog_redirects) redirects,(SELECT count(*)::int FROM parish_catalog_sources) sources,(SELECT count(*)::int FROM parish_catalog_review_queue WHERE resolved_at IS NULL) pending_imports`)).rows[0];
  const checks=(await client.query(`SELECT (SELECT count(*)::int FROM parish_catalog_redirects r JOIN parish_catalog d ON d.id=r.duplicate_id WHERE d.active) active_duplicates,
    (SELECT count(*)::int FROM parish_catalog_sources s JOIN parish_catalog_redirects r ON r.duplicate_id=s.catalog_id) sources_on_duplicates,
    (SELECT count(*)::int FROM parishes p JOIN parish_catalog_redirects r ON r.duplicate_id=p.catalog_id WHERE p.active) duplicate_neighborhoods,
    (SELECT count(*)::int FROM houses h JOIN parishes p ON p.id=h.parish_id JOIN parish_catalog_redirects r ON r.duplicate_id=p.catalog_id) houses_on_duplicates`)).rows[0];
  const palhoca=(await client.query('SELECT id,name FROM parishes WHERE city_code=4211900 AND active ORDER BY name')).rows;
  checks.unresolved_aliases=(await client.query(`SELECT count(*)::int n FROM jsonb_to_recordset($1::jsonb) m(canonical_key text,duplicate_key text)
    LEFT JOIN parish_catalog p ON p.source_key=m.canonical_key LEFT JOIN parish_catalog_sources s ON s.source_key=m.duplicate_key
    WHERE p.id IS NULL OR NOT p.active OR s.catalog_id IS DISTINCT FROM p.id`,[JSON.stringify(plan.merges)])).rows[0].n;
  await client.query('COMMIT');
  if(Object.values(checks).some(n=>n!==0))throw Error('Falha nas invariantes da conciliação: '+JSON.stringify({counts,checks}));
  const summary={generated_at:new Date().toISOString(),merges:plan.merges.length,reviewed_pairs:plan.reviews.length,additional_findings:plan.additional_findings.length,dispositions:Object.fromEntries([...new Set(plan.reviews.map(r=>r.status))].map(status=>[status,plan.reviews.filter(r=>r.status===status).length])),counts,checks,palhoca};
  writeFileSync('docs/resultado-conciliacao-paroquias.json',JSON.stringify(summary,null,2)+'\n');
  const cell=s=>String(s??'').replaceAll('|','\\|').replaceAll('\n',' '),source=r=>`[${cell(r.name)}](${r.url})`;
  const lines=['# Conciliação paroquial — 25/10/2026','',
    `Revisados individualmente os ${plan.reviews.length} pares da auditoria, comparando nomes, localidades e fichas públicas. **${plan.merges.length} duplicados arquivados e redirecionados**, incluindo ${plan.additional_findings.length} casos adicionais encontrados na correção geográfica e no teste de instalação limpa. Sem exclusão física. Fontes e bairros arquivados permanecem rastreáveis.`,
    '',`Base após aplicação: **${counts.active_catalog} paróquias ativas**, ${counts.active_neighborhoods} bairros ativos e ${counts.houses} casas. Fontes: ${counts.sources}. Novas fichas retidas por semelhança: ${counts.pending_imports}. Cobertura nacional ainda parcial.`,
    '', '## Critério e limites','',
    'Nomes completos com padroeiros por extenso são mantidos; nomes institucionais prevalecem na identificação, com revisão de abreviações e observações editoriais. Numeração antiga, endereço de secretaria e endereço da matriz podem divergir. Quando as fontes mostram bairros ou comunidades diferentes, os registros são preservados. Correspondência aproximada isolada não provoca união automática.',
    '', 'Quatro casos permanecem sem prova suficiente para unir: Menino Jesus de Praga em Araraquara; Nossa Senhora do Perpétuo Socorro em Aracaju; Santo Antônio em Jundiaí; Nossa Senhora do Perpétuo Socorro em Presidente Figueiredo. Preservados, sem declarar duplicidade confirmada. O nome e o endereço incompleto da CNBB não resolvem todas essas identidades.',
    '', '## Palhoça','',...palhoca.map(r=>`- Mapa #${r.id}: ${r.name}.`),
    '', '## Prevenção de recorrência','',
    '- Manifesto versionado por chaves de origem em `db/catalog/parish-resolutions.json`, com decisões e evidência de cada par.',
    '- Redirecionamentos persistentes; todas as fontes do duplicado apontam ao registro mantido. O importador respeita as decisões antes e depois da carga.',
    '- Fichas novas sem correspondência exata, mas com possível variação de nome, ficam na fila do admin, antes de criar outro bairro. A fila não une homônimas automaticamente.',
    '- Reconhecimento de cabeçalhos municipais em `<b>` e `<strong>` evita que Leoberto Leal herde a cidade anterior. Snapshot corrigido.',
    '- Backup prévio local em `backups/pre-parish-dedup-2026-10-25.sql`. Transferências preservam casas e pedidos, com novas posições livres no bairro canônico. Zero casas no conjunto atual; o cenário com moradores é coberto por teste transacional.',
    '', '## Todos os pares revisados','',
    '| Município | Par / IDs catálogo | Decisão | Endereços/localidades consultados | Motivo / complementos |','| --- | --- | --- | --- | --- |',
    ...plan.reviews.map(r=>`| ${cell(r.city)} / ${r.uf} | #${r.a.id} ${source(r.a)} × #${r.b.id} ${source(r.b)} | ${r.status} | ${cell(r.a.addresses.join('; '))} × ${cell(r.b.addresses.join('; '))} | ${cell(r.reason)} ${(r.additional_sources??[]).map((u,i)=>`[Complemento ${i+1}](${u})`).join(' ')} |`),
    '', '## Conciliação adicional','',...plan.additional_findings.map(r=>`- ${r.city}: ${r.reason} Origem ${r.duplicate_key} → ${r.canonical_key}.`),
    '', '## Registros mantidos e aliases arquivados','',
    '| Nome canônico | Fonte mantida | Alias arquivado |','| --- | --- | --- |',...plan.merges.map(r=>`| ${cell(r.name)} | ${r.canonical_key} | ${r.duplicate_key} |`),
    '', '## Conferência no banco','',`Invariantes: ${JSON.stringify(checks)}. Todos os contadores devem ser zero. Reproduzir somente a conferência: \`docker compose run --rm -T --volume "\${PWD}/docs:/app/docs" migrate node scripts/report-parish-reconciliation.mjs\`.`,
  ];
  writeFileSync('docs/CONCILIACAO-PAROQUIAS.md',lines.join('\n')+'\n');console.log(JSON.stringify(summary));
}finally{await client.end();}
