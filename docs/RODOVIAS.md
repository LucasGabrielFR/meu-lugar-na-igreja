# Rodovias — versão 0.13.0

## Fonte e cobertura

A fonte ativa é o serviço oficial [IBGE BC250](https://www.ibge.gov.br/geociencias/todos-os-produtos-geociencias/15759-brasil.html), camada `CCAR:BC250_2021_Trecho_Rodoviario_L` no [WFS do IBGE](https://geoservicos.ibge.gov.br/geoserver/ows). Foram consultados os 133.528 registros, validando paginação e IDs únicos. Entram 129.366 trechos com `operacional=Sim` e `situacaofisica=Construída`. Não são promovidas estradas planejadas a vias existentes.

A base inclui rodovias federais, estaduais e outros trechos rodoviários, ampliando a cobertura da antiga camada DNIT. Continua sendo cartografia de referência em escala 1:250.000, versão 2021: não contém todas as ruas urbanas, não informa trânsito e não é um serviço de navegação. As entradas da cidade virtual são adaptações artísticas, não projetos de engenharia.

O GeoJSON é solicitado em EPSG:4326; o coletor valida limites e ordem longitude/latitude. A coleta não usa filtros BBOX ambíguos quanto à ordem dos eixos; as células são calculadas localmente após baixar o país. A simplificação preserva extremidades e usa tolerância de 0,00008 grau nos detalhes e 0,003 grau na visão geral federal.

## Carregamento

`public/data/highways.json` contém metadados, 14.270 trechos federais generalizados e o índice de 200 células de dois graus. O conteúdo detalhado fica em `public/data/roads-ibge/<revisão>/`.

A visão geral tem cerca de 2 MB sem compressão; os detalhes somam cerca de 68 MB no servidor. O navegador busca detalhes apenas ao aproximar e somente da região visível com margem, até 16 células por enquadramento. O cache mantém até 24 células; IDs duplicados nas fronteiras das células são conciliados antes do desenho. Geometrias fora da tela não são renderizadas. Nenhuma API externa é chamada pelo navegador para esta camada; OSM opcional continua independente.

O coletor usa lotes de 2.000, pausa entre páginas, timeout e até três tentativas. Checkpoints em `.cache/ibge-road-pages/` permitem retomar e expiram em 24 horas. A publicação só troca o índice após validar a coleta inteira e escrever os arquivos da nova revisão. Falhas preservam o índice anterior.

## Encaixe das cidades

1. As estradas são indexadas espacialmente, projetadas no mesmo sistema do mapa e comparadas ao perímetro visual de cada cidade.
2. Cruzamentos reais com esse perímetro recebem entradas. Uma estrada que passa pelo núcleo deixa de ser ignorada só por estar perto do centro. Cruzamentos próximos são agrupados somente dentro da largura visual de uma rua.
3. A direção da entrada vem do traçado; não é fixada no sul nem limitada às divisões paroquiais. O asfalto externo, a faixa central e a borda usam a mesma escala das ruas internas.
4. O desenho urbano oculta o trecho real que passa por baixo da cidade virtual, e as entradas recompõem a ligação com seus anéis. Todas as direções distintas que seriam cortadas recebem ligação.
5. Quando a estrada fica fora do núcleo, um acesso curto liga a saída ao ponto mais próximo até cerca de 25 km. Se realmente não houver via próxima, permanece uma alternativa ilustrativa limitada a vizinhos até 100 km. Essa alternativa não é uma rota real.

O terreno urbano perdeu a borda circular rígida. Os anéis de ruas continuam sendo parte do desenho da cidade; saídas adicionais só avançam até o exterior quando há conexão correspondente.

## Verificação

A auditoria nacional usa os bairros ativos e todas as células do snapshot. Na versão 0.16.0, após ampliar o catálogo, foram avaliados 4.019 municípios: 4.008 têm acesso à malha real, com 10.549 entradas; há cinco ligações locais ilustrativas e cinco municípios sem conexão. O resultado detalhado está em [road-network-audit.json](road-network-audit.json). A ausência de conexão nessa base cartográfica não comprova ausência de acesso local; Fernando de Noronha continua sem ligação rodoviária fictícia com o continente.

O traçado urbano da versão 0.16.0 usa quadras e ruas compartilhadas. Os acessos externos chegam ao nó mais próximo dessa malha, mantendo direção e largura compatíveis com a rodovia. O raio envolvente ainda serve para interseções e máscara cartográfica; ele não desenha um disco urbano nem determina a posição das igrejas.

Campinorte, Niquelândia, Minaçu e Colinas do Sul têm testes com a malha real. Outros testes verificam rodovia atravessando o núcleo, rua orientada para a estrada e ausência de cortes sem entrada no perímetro.

## Operação Docker

```powershell
docker compose --profile tools run --build --rm highways
docker compose up --build -d --wait
```

Para refazer toda a coleta sem reutilizar checkpoints:

```powershell
docker compose --profile tools run --rm highways node scripts/fetch-ibge-roads.mjs --refresh
```

Para repetir a auditoria, usando os dados e a configuração de PostgreSQL do projeto:

```powershell
docker compose run --rm -T --volume "${PWD}/src:/app/src:ro" --volume "${PWD}/docs:/app/docs" migrate node --max-old-space-size=1536 scripts/audit-roads.mjs
```

O coletor `fetch-highways.mjs` conserva a investigação DNIT anterior, mas não é mais o comando padrão. Não foram acrescentadas bibliotecas ou dependências pagas.

## Validação da entrega de 24/10/2026

Build Docker concluído, containers saudáveis, lint/TypeScript aprovados e 23 testes passando. A revisão no navegador confirmou três entradas em Campinorte, entrada real em Niquelândia e duas entradas em Minaçu, com estradas estaduais/regionais carregadas. O enquadramento regional entre Minaçu e Colinas do Sul mostrou a malha contínua. A auditoria nacional final registrou 1.606 entradas e 750 municípios com acesso à malha real; não precisou usar ligações intermunicipais fictícias nessa avaliação. Isso verifica acesso à cartografia, não roteamento viário ou tempos de viagem. Não foi feito ensaio de FPS em dispositivos móveis.
