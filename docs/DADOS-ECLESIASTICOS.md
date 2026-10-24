# Dados eclesiásticos: paróquias e circunscrições

## Situação do projeto

O catálogo municipal do IBGE está no PostgreSQL. A versão 0.9.0 acrescenta uma base parcial de **346 paróquias em 28 municípios**, obtida diretamente de fontes oficiais: 311 da Arquidiocese de São Paulo e 35 da Diocese de Uruaçu. Essas duas circunscrições ficam na tabela `ecclesiastical_jurisdictions`; os registros de origem ficam em `parish_catalog`, com identificador externo, município IBGE, URL oficial, revisão da fonte e data da coleta. Isso ainda não representa o catálogo nacional.

O catálogo institucional é distinto das comunidades virtuais em `parishes`, que incluem dados de demonstração/teste. Nomes importados aparecem na participação e na tela **Catálogo oficial** do painel. O setor virtual é criado ao aprovar a primeira casa, vinculando a paróquia ao catálogo quando existe correspondência exata e única. Importar não cria casas, não valida padres e não estabelece limites territoriais. Nenhum registro anterior é apagado ou renomeado.

## Fontes já importadas e atualização

- Arquidiocese de São Paulo: [API pública do próprio site](https://arquisp.org.br/wp-json/wp/v2/parish), paginada. Entram as fichas intituladas explicitamente “Paróquia”, vinculadas ao município de São Paulo. A ficha isolada “Catedral da Sé”, classificada pelo site entre outras igrejas, fica fora desta carga conservadora.
- Diocese de Uruaçu: [API pública de posts da categoria Paróquias](https://diocesedeuruacu.com.br/wp-json/wp/v2/posts?categories=15). O município é resolvido por correspondência exata entre tags oficiais e nomes do catálogo IBGE em Goiás. O registro do Santuário de Muquém, sem município inequívoco nas tags, fica pendente; não é promovido automaticamente a paróquia.

O snapshot em `db/catalog/parishes.json` guarda apenas fatos institucionais necessários (nome, município e fonte), sem biografias, fotos, contatos pessoais ou textos editoriais. O arquivo registra as exclusões. A coleta usa paginação e pausa entre páginas. A disponibilização da API não foi tratada como autorização para reutilizar fotos ou textos do site.

Para atualizar as fontes em Docker:

```powershell
docker compose --profile tools run --build --rm catalog
docker compose up --build -d --wait
```

A primeira etapa atualiza o snapshot apenas após validar a coleta; a segunda aplica migrações e faz upsert transacional por chave da fonte. Repetir a carga não duplica registros. A ausência de um registro numa nova coleta não o apaga nem o arquiva automaticamente; divergências exigem revisão. O servidor inicia a partir do snapshot local, sem depender de disponibilidade das APIs eclesiásticas.

## Fontes e acesso

A fonte mais promissora é o Centro de Dados da Igreja Católica no Brasil (CDICBR), da CNBB. A CNBB informa que o repositório reúne dados coletados e validados junto às dioceses, que a gestão central ficará sob a CNBB e que a implantação passou por dioceses piloto. O portal público de consultas atualmente apresenta área de assinante; não foi encontrada API ou exportação aberta e licenciada para importar em massa.

O Anuário Católico/CERIS é uma referência histórica de dados nacionais. As páginas públicas consultadas descrevem edições e conteúdo, mas não disponibilizam uma base atual em formato de carga para este projeto. Diretórios regionais e páginas diocesanas podem ajudar a verificar registros individuais, mas variam em atualização, abrangência e estrutura. OpenStreetMap pode ajudar com pontos geográficos, mas sua cobertura não é um catálogo canônico completo de paróquias.

## Decisão de ingestão

Ampliar a cobertura com APIs e diretórios oficiais identificáveis, registrando a proveniência. Não inferir a diocese pela UF: municípios podem ter várias paróquias e a abrangência pastoral precisa de fonte própria. Para uma carga nacional centralizada, solicitar à CNBB/CDICBR condições de acesso, formato, frequência de atualização e licença de uso. As duas APIs públicas acima já permitem uma primeira carga factual verificável, sem aguardar a fonte nacional.

O modelo já distingue circunscrição de paróquia e conserva IDs internos e proveniência na importação. A relação município–paróquia representa localização/sede. Aliases, revisão de divergências, abrangência pastoral e sincronização agendada ficam para etapas posteriores.

Dioceses e arquidioceses importadas são úteis desde o início para organizar filtros, validação de padres e administração regional. Recomenda-se modelar tipos de circunscrição, em vez de presumir que todo território é juridicamente uma diocese. Até obter acesso ou uma licença clara, não preencher esse cadastro a partir de listas secundárias.

## Fontes consultadas

- CNBB, [aprovação e implantação do CDICBR](https://www.cnbb.org.br/bispos-aprovam-projeto-para-criacao-de-centro-de-dados-da-igreja-catolica-no-brasil/).
- CDICBR, [Portal de consultas](https://portalcdicbr.cnbb.org.br/), atualmente identificado como área do assinante.
- CNBB/CERIS, [informações sobre o Anuário Católico](https://www.cnbb.org.br/ceris-e-a-cnbb-finalizam-edicao-2018-do-anuario-catolico/).
- CNBB, [retrato estatístico de paróquias e igrejas particulares](https://www.cnbb.org.br/igreja-catolica-instituicao-com-maior-confianca-capilaridade/). Os números publicados são estatística agregada, não arquivo de importação.
