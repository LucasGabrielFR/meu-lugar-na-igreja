import pg from 'pg';
import {writeFileSync} from 'node:fs';
import {normalizeCatalogName} from './catalog-normalization.mjs';

// Candidate discovery only. These keys must never be used to merge records automatically.
function reviewKey(name){
  return normalizeCatalogName(name.replace(/\([^)]*\)/g,'').replace(/[*]*nova par[oó]quia.*$/i,''))
    .replace(/^paroquia (?:de )?/,'').replace(/\bnossa sra\b|\bn sra\b|\bn s\b|\bns\b/g,'nossa senhora')
    .replace(/\bs\b/g,'sao').replace(/\bsta\b/g,'santa').replace(/\bsto\b/g,'santo').replace(/\bfco\b/g,'francisco')
    .replace(/\bsant ana\b|\bsantana\b/g,'santa ana').replace(/\bd abadia\b/g,'da abadia')
    .replace(/\b(?:de|da|do|das|dos)\b/g,'').replace(/\s+/g,' ').trim();
}
function distance(a,b){
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));previous=next;}return previous[b.length];
}
const client=new pg.Client();await client.connect();
try{
  await client.query('BEGIN READ ONLY');
  const rows=(await client.query(`SELECT pc.id catalog_id,pc.name,pc.source_kind,pc.source_url,pc.municipality_code,m.name city,m.uf,j.name diocese,
    (SELECT coalesce(json_agg(json_build_object('id',p.id,'name',p.name,'houses',(SELECT count(*)::int FROM houses h WHERE h.parish_id=p.id))), '[]') FROM parishes p WHERE p.catalog_id=pc.id AND p.active) neighborhoods,
    (SELECT coalesce(json_agg(json_build_object('key',s.source_key,'url',s.source_url)), '[]') FROM parish_catalog_sources s WHERE s.catalog_id=pc.id) sources
    FROM parish_catalog pc JOIN municipalities m ON m.code=pc.municipality_code LEFT JOIN ecclesiastical_jurisdictions j ON j.id=pc.jurisdiction_id
    WHERE pc.active ORDER BY m.uf,m.name,pc.name,pc.id`)).rows;
  await client.query('COMMIT');
  const byCity=new Map();for(const row of rows){row.review_key=reviewKey(row.name);const list=byCity.get(row.municipality_code)??[];list.push(row);byCity.set(row.municipality_code,list);}
  const candidates=[],annotations=rows.filter(row=>/nova par[oó]quia|\*/i.test(row.name));
  for(const local of byCity.values())for(let i=0;i<local.length;i++)for(let j=i+1;j<local.length;j++){
    const a=local[i],b=local[j],same=a.review_key===b.review_key;
    const short=(a.review_key.length<b.review_key.length?a.review_key:b.review_key).split(' '),long=(a.review_key.length<b.review_key.length?b.review_key:a.review_key).split(' ');
    const incomplete=short.length>=4&&long.length===short.length+1&&long.some((_,index)=>long.filter((_,j)=>j!==index).join(' ')===short.join(' '));
    if(!same&&!incomplete&&(Math.min(a.review_key.length,b.review_key.length)<12||Math.abs(a.review_key.length-b.review_key.length)>3))continue;
    const edits=same?0:distance(a.review_key,b.review_key);
    if(!same&&!incomplete&&(edits>2||edits/Math.max(a.review_key.length,b.review_key.length)>.08))continue;
    const crossSource=a.source_kind!==b.source_kind;
    const reason=same?'Mesmo padroeiro após normalizar abreviações, acentos, preposições e sufixos; pode haver homônimas legítimas.':incomplete?'Uma palavra do título foi omitida; pode ser outra dedicação. Confirmar a ficha antes de decidir.':`Grafia próxima (${edits} alterações); confirmar padroeiro, endereço e comunidade.`;
    candidates.push({priority:same&&crossSource?'1 — cruzamento institucional/referência':same?'2 — homonímia ou duplicidade':incomplete?'4 — título incompleto':'3 — grafia próxima',city:a.city,uf:a.uf,code:a.municipality_code,reason,a,b});
  }
  candidates.sort((a,b)=>a.priority.localeCompare(b.priority)||a.uf.localeCompare(b.uf)||a.city.localeCompare(b.city,'pt-BR'));
  const affected=new Set(candidates.flatMap(p=>[p.a.catalog_id,p.b.catalog_id]));
  const report={generated_at:new Date().toISOString(),read_only:true,scope:'Catálogo ativo; pares dentro do mesmo município. Candidatos, não exclusões aprovadas. Não é uma detecção exaustiva.',summary:{activeRecords:rows.length,candidatePairs:candidates.length,affectedRecords:affected.size,affectedCities:new Set(candidates.map(p=>p.code)).size,byPriority:Object.fromEntries([...new Set(candidates.map(p=>p.priority))].map(priority=>[priority,candidates.filter(p=>p.priority===priority).length])),annotations:annotations.length},palhoca:byCity.get(4211900)??[],candidates,annotations};
  writeFileSync('docs/auditoria-paroquias.json',JSON.stringify(report,null,2)+'\n');
  const cell=value=>String(value??'').replaceAll('|','\\|').replaceAll('\n',' ');
  const record=r=>`catálogo #${r.catalog_id}; mapa ${r.neighborhoods.map(n=>'#'+n.id).join(', ')||'sem bairro ativo'}`;
  const md=['# Revisão de possíveis duplicidades paroquiais — 25/10/2026','',
    'Levantamento somente de leitura. Nenhum registro foi renomeado, arquivado, excluído ou mesclado. As comparações são por município; nomes iguais não provam identidade. As abreviações “S.” são ambíguas, e bairros diferentes podem indicar paróquias homônimas legítimas. Fontes e IDs são preservados para revisão humana. Não constitui inventário exaustivo de erros.',
    '',`Catálogo ativo: **${rows.length} registros**. Encontrados **${candidates.length} pares candidatos**, envolvendo **${affected.size} registros em ${report.summary.affectedCities} municípios**. São pares de revisão, não quantidade de paróquias a excluir.`,
    '',...Object.entries(report.summary.byPriority).map(([key,count])=>`- ${key}: ${count} pares.`),
    '', '## Palhoça — conferência prioritária','',
    'O [diretório oficial de Florianópolis](https://arquifln.org.br/paroquias) lista cinco paróquias para Palhoça. “Nova paróquia” é uma observação editorial da fonte de São Sebastião. Os nomes abreviados adicionais devem ser confrontados com as fichas oficiais antes da decisão.',
    '', 'Conferência manual em 25/10/2026: São Francisco de Assis está no Aririú nas duas fichas, na mesma Rua João José da Silva; a referência informa nº 301 e a ficha oficial nº 326. São Judas e São João Batista aparece na referência em Ponte do Imaruim, mesma localidade do cadastro oficial. São indícios fortes de duplicidade, sem autorizar exclusão automática. São Francisco de Assis e São Judas Tadeu e São João Batista são paróquias distintas entre si.',
    '', '| IDs | Nome no catálogo | Fonte | Diocese |','| --- | --- | --- | --- |',
    ...report.palhoca.map(r=>`| ${record(r)} | ${cell(r.name)} | [${r.source_kind}](${r.source_url}) | ${cell(r.diocese??'Em aberto')} |`),
    '', '## Todos os pares para revisão','',
    '| Prioridade | Município | Registro A | Registro B | Motivo |','| --- | --- | --- | --- | --- |',
    ...candidates.map(p=>`| ${p.priority} | ${cell(p.city)} / ${p.uf} | ${record(p.a)} — [${cell(p.a.name)}](${p.a.source_url}) | ${record(p.b)} — [${cell(p.b.name)}](${p.b.source_url}) | ${p.reason} |`),
    '', '## Observações editoriais incorporadas ao nome','',
    ...annotations.map(r=>`- ${r.city} / ${r.uf}: ${record(r)} — [${r.name}](${r.source_url}). Revisar somente o nome exibido; não implica duplicidade.`),
    '', '## Como decidir','',
    'Confira endereço/localidade, diocese e a ficha oficial. Padroeiros iguais em bairros diferentes devem permanecer separados até evidência em contrário. Priorize pares de fonte institucional e independente. Os IDs de mapa correspondem ao cadastro de paróquias; os IDs de catálogo são diferentes.',
    '', 'No admin atual é possível editar o nome do bairro e desmarcar “Visível no mapa”. Isso arquiva a exibição, sem excluir nem conciliar o catálogo e as fontes. Uma futura conciliação deve preservar as fontes e impedir reimportação do duplicado; não foi implementada nesta auditoria.',
    '', 'Reproduzir: `docker compose run --rm -T --volume "${PWD}/docs:/app/docs" migrate node scripts/audit-parish-duplicates.mjs`. A transação PostgreSQL usa `READ ONLY` e apenas os relatórios locais são gravados.',
  ];
  writeFileSync('docs/AUDITORIA-PAROQUIAS.md',md.join('\n')+'\n');
  console.log(JSON.stringify({summary:report.summary,palhocaPairs:candidates.filter(p=>p.code===4211900).map(p=>({a:p.a.name,b:p.b.name,reason:p.reason}))},null,2));
}finally{await client.end();}
