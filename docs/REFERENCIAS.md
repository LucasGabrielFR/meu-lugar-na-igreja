# Investigação das referências

Consulta realizada em 24/10/2026, horário de São Paulo. As conclusões distinguem observação pública, declaração do mantenedor e recomendação para o novo projeto. Não houve acesso a infraestrutura privada.

## Brasil Tijolo a Tijolo

URL: https://tijoloatijolo.com/

Observado no navegador: mapa nacional estilizado, busca por usuário ou cidade, casas, navegação por cidade, controles de câmera, atividade de construção, ranking, eleições e lojas. Isso mostra como ligar participação social a uma presença visual fácil de encontrar.

Inspeção do HTML e dos módulos públicos servidos pelo site:

- Entrada `/assets/site-D2agScHW.js`, com o identificador de bundling `__vite__mapDeps`: evidência de uso de Vite no build observado.
- Módulo `/assets/three-q-XVS2Kq.js`, com classes de renderização e `REVISION: "180"`: evidência de Three.js no frontend observado.
- Normalização de nomes e identificação de municípios por código IBGE nos módulos de busca.
- Resposta HTTP com Cloudflare. Isso não identifica, por si só, o provedor de origem.

Não foi identificado um repositório oficial nesta investigação. Backend, banco, mecanismo de captura de comentários e licença do código/arte não foram confirmados. Não assumir que o site usa React nem que existe autorização de reutilização. Nomes dos bundles podem mudar a cada implantação.

## Git City

URL analisada: https://www.thegitcity.com/town/brasil-town?at=lucasgabrielfr

Observado no navegador: cidade 3D, busca, navegação por Brasil/estado/cidade, perfil do edifício, pontuação e títulos civis. O link abriu o edifício de `lucasgabrielfr` em Niquelândia.

Fontes primárias:

- [Repositório e README](https://github.com/srizzon/git-city)
- [Manifesto de dependências](https://github.com/srizzon/git-city/blob/main/package.json)
- [Licença](https://github.com/srizzon/git-city/blob/main/LICENSE)

O projeto declara Next.js, React, Three.js, React Three Fiber/Drei, Supabase e Tailwind; o README declara hospedagem Vercel. O site também retornou cabeçalhos de Next.js e Vercel. O código público e o site podem estar em revisões diferentes; as dependências consultadas não provam a versão exata em produção.

A licença principal é AGPL-3.0. Uma adaptação exige analisar e cumprir as obrigações aplicáveis, incluindo disponibilização do código correspondente nas condições da licença. Não tratar como código permissivo nem estender automaticamente a licença a toda arte ou marca. Recomendação: implementação própria do produto e dos recursos visuais; decidir conscientemente antes de incorporar código do Git City. A recomendação não é um parecer jurídico.

## OpenStreetMap e dados geográficos

A captura fornecida pelo responsável mostra vias cartográficas e um avião estilizado no mapa nacional do Tijolo a Tijolo; ela não comprova que o avião representa tráfego real nem qual serviço cartográfico o site usa. Para a camada desta aplicação, usamos tiles raster públicos do OpenStreetMap somente enquanto a visão nacional está aberta, com atribuição legível e links para direitos autorais/licença e correção do mapa.

- [OpenStreetMap: direitos autorais, atribuição e ODbL](https://www.openstreetmap.org/copyright)
- [OSMF: política de uso dos tiles raster](https://operations.osmfoundation.org/policies/tiles/)
- [Geofabrik: extrato de dados do Brasil e ODbL](https://download.geofabrik.de/south-america/brazil.html)

O uso de dados OSM é permitido com atribuição e cumprimento da ODbL. O servidor padrão de tiles é um serviço comunitário separado dos dados: é best-effort, não oferece SLA e proíbe pré-carregamento/scraping. Esta implementação não instala uma base cartográfica completa no Docker nem baixa tiles em lote; solicita os tiles do enquadramento nacional ao navegador. A camada implica uma dependência externa em runtime e uma requisição do navegador do visitante à infraestrutura OSM. Para crescimento, trocar para provedor de tiles com capacidade/SLA ou hospedar tiles próprios. Aviões e rastros são ilustrações locais, animadas ocasionalmente apenas na visão nacional, sem consulta a dados de voo nem serviço externo.

O extrato nacional Geofabrik consultado excede 2 GB e não é adequado para empacotar na imagem web; a página o publica sob ODbL e oferece sub-regiões menores. A opção de tiles mantém a imagem pequena e evita instalar GIS no container, mas sacrifica garantia de disponibilidade e controle de estilo.

## Fontes para a stack e integrações

- [Next.js: implantação, incluindo Docker](https://nextjs.org/docs/app/getting-started/deploying)
- [React Three Fiber: desempenho](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [Drizzle e PostgreSQL](https://orm.drizzle.team/docs/get-started/postgresql-new)
- [Better Auth: instalação e integração com banco](https://better-auth.com/docs/installation)
- [pg-boss: fila em PostgreSQL](https://github.com/timgit/pg-boss)
- [IBGE: localidades](https://servicodados.ibge.gov.br/api/docs/localidades)
- [Coleção oficial da Meta: Instagram API](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-3fe78620-2258-44b6-893f-42d76c7200d7)
- [Meta: comentários e permissões com Instagram Login](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-b9dac9f7-5415-4659-bcfd-795298a07e91)

A coleção da Meta documenta gestão de comentários e contas profissionais, além de permissões distintas para Facebook Login e Instagram Login. Isso não concede acesso irrestrito aos perfis dos comentaristas. A conta profissional conectada é a conta que publica a campanha; não impor conta profissional a cada fiel. A viabilidade concreta de webhooks, campos de identidade retornados, permissões, revisão do aplicativo e acesso de produção precisa ser demonstrada com a conta real antes de prometer automação completa.

As páginas diretas de desenvolvedores da Meta tiveram erros/limitação de acesso durante a pesquisa; foi usada também a coleção oficial da Meta no Postman. A página do IBGE não pôde ser carregada pelo leitor de pesquisa; a importação do catálogo ainda precisa ser testada. Nenhuma integração foi executada.

## Fontes para o domínio e privacidade

- [CNBB: pastorais](https://www.cnbb.org.br/pastorais-app/): referência de nomes, sem pretensão de catálogo paroquial universal.
- [Santa Sé: Spiritus Domini](https://www.vatican.va/content/francesco/pt/motu_proprio/documents/papa-francesco-motu-proprio-20210110_spiritus-domini.html): há ministérios instituídos com requisitos próprios. A progressão no site deve ser apresentada como virtual.
- [LGPD, texto legal](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm): convicção religiosa e filiação a organização religiosa estão entre os dados sensíveis. A definição de base legal, transparência, retenção e tratamento de menores requer avaliação adequada ao produto.
