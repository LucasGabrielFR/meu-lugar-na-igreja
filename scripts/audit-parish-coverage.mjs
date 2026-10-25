import pg from 'pg';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {planReferenceCatalog} from './reference-catalog.mjs';
const municipalities=JSON.parse(readFileSync('public/data/municipios.json','utf8'));
const byCode=new Map(municipalities.map(m=>[m.code,m]));
const client=new pg.Client();await client.connect();
try{
  const catalog=(await client.query('SELECT pc.*,j.name AS jurisdiction_name FROM parish_catalog pc LEFT JOIN ecclesiastical_jurisdictions j ON j.id=pc.jurisdiction_id WHERE pc.active ORDER BY pc.id')).rows;
  const institutional=catalog.filter(p=>p.source_kind==='institutional'),references=catalog.filter(p=>p.source_kind==='reference');
  const jurisdictions=(await client.query(`SELECT j.name,j.website,j.source_churches_count,count(pc.id)::int AS parishes FROM ecclesiastical_jurisdictions j LEFT JOIN parish_catalog pc ON pc.jurisdiction_id=j.id AND pc.active GROUP BY j.id ORDER BY j.name`)).rows;
  const counts=(await client.query(`SELECT (SELECT count(*)::int FROM houses) houses,(SELECT count(*)::int FROM parish_catalog pc WHERE pc.active AND NOT EXISTS(SELECT 1 FROM parishes p WHERE p.catalog_id=pc.id)) unlinked`)).rows[0];
  const states=[...new Set(municipalities.map(m=>m.uf))].sort();
  const ufRows=states.map(uf=>{const rows=catalog.filter(p=>byCode.get(p.municipality_code)?.uf===uf);return {uf,parishes:rows.length,institutional:rows.filter(p=>p.source_kind==='institutional').length,reference:rows.filter(p=>p.source_kind==='reference').length,cities:new Set(rows.map(p=>p.municipality_code)).size};});
  const missing=ufRows.filter(r=>!r.institutional).map(r=>r.uf);
  const report=[`# Cobertura paroquial — ${new Date().toISOString().slice(0,10)}`,`Catálogo parcial publicado: **${catalog.length.toLocaleString('pt-BR')} paróquias ativas**, em **${new Set(catalog.map(p=>p.municipality_code)).size} municípios** e **${ufRows.filter(r=>r.parishes).length} UFs**. São **${institutional.length} institucionais** e **${references.length} de referência, com diocese em aberto**. ${jurisdictions.filter(j=>j.parishes).length} de ${jurisdictions.length} circunscrições têm registros vinculados. Ter registros não comprova completude da diocese.`,
    `A consulta CNBB foi realizada individualmente para as 281 circunscrições: 248 listas vieram vazias. Zero na tabela significa catálogo pendente, não ausência de paróquias.`,
    '## Por UF','| UF | Institucionais | Referência / diocese em aberto | Total | Municípios |','| --- | ---: | ---: | ---: | ---: |',...ufRows.map(r=>`| ${r.uf} | ${r.institutional} | ${r.reference} | ${r.parishes} | ${r.cities} |`),
    '## Por circunscrição','A coluna CNBB conta todas as igrejas retornadas pela fonte, incluindo entidades que não são paróquias.','| Circunscrição | Paróquias importadas | Igrejas CNBB | Diretório |','| --- | ---: | ---: | --- |',...jurisdictions.map(j=>`| ${j.name} | ${j.parishes} | ${j.source_churches_count??'não consultado'} | ${j.website?`[site](${j.website})`:'pendente'} |`),
    '## Lacunas e critérios',`- UFs sem paróquias institucionais importadas: ${missing.join(', ')}.`,
    '- Diretórios complementares: Manaus, Natal, Vitória, Roraima, Florianópolis, Rio Branco, Aracaju e Cuiabá. Snapshots versionados mantêm os registros excluídos e seus motivos.',
    '- Rio Branco atende também municípios fora do Acre. Distritos sem município comprovado não foram convertidos automaticamente; endereços da cúria não são usados como sede paroquial.',
    '- Capelas, áreas missionárias, quase-paróquias, reitorias e santuários sem classificação paroquial explícita ficam separados. Não se atribui jurisdição territorial a paróquias militares por mera proximidade.',
    '- Fortaleza: o endpoint WordPress devolveu uma ficha de teste; não foi importada. O diretório institucional/PDF precisa de outro extrator.',
    '- Macapá: anuário PDF oficial identificado, ainda sem conector validado. Belém: consulta anterior não concluiu; não foi tratada como catálogo vazio.',
    '## Verificação',`- Casas existentes: ${counts.houses}. Paróquias ativas do catálogo sem bairro associado: ${counts.unlinked}.`,
    '- O relatório é regenerado com SQL somente de leitura; não arquiva nem exclui registros.'
  ];
  if(existsSync('db/reference/national-directory.json')){
    const reference=JSON.parse(readFileSync('db/reference/national-directory.json','utf8'));
    const linked=(await client.query(`SELECT source_key,catalog_id FROM parish_catalog_sources WHERE source_kind='reference'`)).rows;
    const plan=planReferenceCatalog(reference,catalog,municipalities,new Set(linked.map(r=>r.source_key)));
    const unresolved=reference.records.filter(r=>r.kind==='parish'&&!r.municipality_code);
    report.push('## Referência nacional para pesquisa',`[Acervo Católico](${reference.source}), coletado em ${reference.fetched_at}: ${reference.records.length} fichas de igrejas, ${reference.records.filter(r=>r.kind==='parish').length} com nomenclatura paroquial; ${unresolved.length} dessas sem município resolvido.`,
      `${linked.length} fichas de referência foram vinculadas/publicadas, incluindo fontes adicionais de registros institucionais já existentes. ${plan.skipped.length} fichas permanecem excluídas ou para revisão: ${plan.skipped.filter(r=>r.reason.startsWith('Homônimas')).length} por homonímia/correspondências múltiplas.`,
      'Publicação de referências autorizada pelo responsável: somente nomenclatura paroquial, município resolvido e correspondência não ambígua. Novos registros mantêm a diocese em aberto. Correspondências institucionais únicas preservam o vínculo existente e recebem apenas a fonte adicional. Não se declara cobertura integral.',
      'Os nomes são comparados com remoção de prefixo paroquial, acentos e sufixos de apresentação (cidade, ano e parênteses); não há associação por semelhança aproximada ou proximidade geográfica.');
    writeFileSync('db/reference/research-candidates.json',JSON.stringify({generated_at:new Date().toISOString(),source_kind:'reference',publication_enabled:true,warning:'Referências publicadas não comprovam estatuto canônico. Homônimas e municípios não resolvidos permanecem em revisão.',linked,skipped:plan.skipped,unresolved},null,2)+'\n');
  }
  writeFileSync('docs/COBERTURA-PAROQUIAL.md',report.join('\n')+'\n');
  console.log(JSON.stringify({parishes:catalog.length,institutional:institutional.length,reference:references.length,cities:new Set(catalog.map(p=>p.municipality_code)).size,states:ufRows.filter(r=>r.parishes).length,jurisdictions:jurisdictions.filter(j=>j.parishes).length,...counts}));
}finally{await client.end();}
