# Changelog

Todas as mudanças relevantes serão registradas neste arquivo, seguindo [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [0.10.0] - 2026-10-24

### Added

- Sedes oficiais do IBGE para os 5.571 municípios, metadados de origem/hash e importação de coordenadas no PostgreSQL.
- Arte vetorial isométrica, praça com fonte, jardins, bairros paroquiais e ruas conectadas em uma única cidade.
- Carregamento de cidades por aproximação e descarte de construções fora do enquadramento.
- Navegação por pinça e teclado, modais nativos com foco contido e relatório de auditoria com prioridades.

### Changed

- Uma câmera contínua substitui a troca entre mapa nacional e cena local. A busca e os links diretos apenas enquadram o município ou a casa.
- Terreno ilustrado por padrão, cartografia OSM opcional e porte da cidade ligado à ocupação. Zoom chega a 8.192×.
- Participação recebe o município selecionado no mapa; busca ignora acentos e informa quando está carregando.

### Fixed

- Posição de Niquelândia e das demais cidades corrigida: sede municipal substitui centroide territorial.
- Casas distribuídas em quarteirões curvos sem sobrepor lotes; novas casas preservam posições dos lotes existentes no mesmo conjunto de bairros.
- Fila administrativa permite acessar pedidos além dos 100 mais recentes.
- Mensagens públicas de erro não expõem orientações sobre containers.
- Arrastar o mapa não seleciona textos ou rótulos; cliques em construções continuam disponíveis e o arraste não abre cartões ao terminar.

### Removed

- Renderizador WebGL separado, dependências Three/Fiber/Drei e arquivo de centroides obsoleto.

## [0.9.1] - 2026-10-24

### Fixed

- Zoom nacional ampliado de 3,5× para 512×, com foco no cursor e botões de aproximação proporcionais.
- Pontos grandes substituídos por casas e prévias com igreja e moradias; marcadores e nomes mantêm tamanho estável em pixels.
- Aproximação revela a cidade e abre sua cena isométrica automaticamente ao alcançar 48× próximo de um município ativo.
- Vias usam tiles com detalhe progressivo limitados à área visível; rótulos estaduais dão lugar aos nomes das cidades na aproximação.

## [0.9.0] - 2026-10-24

### Added

- Tela de carregamento com logo do projeto para consultas iniciais, componente de mapa e tiles cartográficos; progresso medido pelos tiles concluídos e fallback vetorial após 10 segundos.
- Catálogo factual de 346 paróquias de 28 municípios, obtido nas APIs oficiais da Arquidiocese de São Paulo e Diocese de Uruaçu, com duas circunscrições e proveniência no PostgreSQL.
- Coleta reexecutável em Docker, snapshot local e importação transacional por chave externa, sem exclusões automáticas.
- Consulta do catálogo no painel e opções de paróquias no formulário de participação.

### Fixed

- Tiles limitados ao contorno brasileiro; países vizinhos ficam ocultos sob a água ilustrada.
- Removidos estilos duplicados da vista nacional.
- Busca municipal limpa sugestões no evento de digitação; restauração do mapa reinicia seu estado sem atualizações síncronas em efeitos. Arraste usa a escala correta também em telas verticais.

## [0.7.0] - 2026-10-24

### Changed

- Visão nacional usa câmera superior com pan e zoom; cidades mantêm câmera isométrica fixa, sem rotação.
- Paróquias são distribuídas em setores de uma única cidade, com casas posicionadas em torno de cada igreja.
- Construção da igreja cresce visualmente em quatro níveis conforme casas ativas, sem alterar nome, natureza ou status canônico da paróquia.

## [0.8.0] - 2026-10-24

### Changed

- Mapa nacional usa projeção SVG geográfica com enquadramento consistente; pan e zoom deixam de depender da escala da cena 3D e rótulos surgem conforme aproximação.
- Interface pública simplificada para mapa em tela cheia, busca municipal superior, lista em modal e modal de camadas.
- Card “Como funciona” apresenta somente princípios já acordados e deixa explícito que as regras completas seguem em elaboração.
- Busca permite localizar municípios do catálogo IBGE sem paróquia cadastrada e mostra que ainda falta cadastrar a comunidade.

### Documentation

- Registrado que os cadastros paroquiais atuais são manuais/demonstrativos; o CDICBR da CNBB é a fonte preferida, mas requer acesso/condições de uso para importação em massa.
- Descrito modelo futuro com circunscrições eclesiásticas, proveniência, revisão e sincronização segura.

## [0.6.0] - 2026-10-24

### Changed

- Aviões ilustrativos agora surgem em intervalos aleatórios e atravessam a visão nacional; a animação pausa quando a página fica oculta ou o navegador solicita movimento reduzido.

## [0.5.0] - 2026-10-24

### Added

- Base cartográfica nacional com vias do OpenStreetMap, controle para exibir/ocultar e crédito visível com links de atribuição ODbL e correção de dados.
- Aeronave estilizada e trilha visual identificadas como elementos ilustrativos, sem alegação de rastreamento real.

### Changed

- Polígonos estaduais usam projeção compatível com o mosaico de tiles para alinhar vias e limites.
- Documentação registra o serviço externo de tiles, seus limites operacionais e o caminho para hospedagem/provedor próprio.

## [0.4.0] - 2026-10-24

### Added

- Formulário público de participação com município brasileiro, paróquia, nome público, perfil do Instagram e consentimento para publicação após aprovação.
- Fila privada de solicitações no painel, com filtros, aprovação/publicação e arquivamento.
- Aprovação transacional cria ou reativa cidade e paróquia quando necessário, publica a casa e registra auditoria.
- Migração PostgreSQL para pedidos, consentimento e histórico da revisão.

### Changed

- Mapa e painel apresentam o caminho de participação e revisão; pedidos pendentes aparecem na navegação administrativa.
- README, documentação do produto e versão atualizados para a entrada pública moderada.

### Security

- Nome e perfil não aparecem no mapa enquanto o pedido estiver pendente ou arquivado; a publicação exige consentimento registrado.

## [0.3.1] - 2026-10-23

### Changed

- Detalhes da paróquia ou casa ficam no painel lateral, liberando a área do mapa.
- Câmera inicial da cidade enquadra o conjunto de paróquias, com aproximação progressiva conforme o número de comunidades.
- Rótulos 3D quebram linhas e controles e navegação têm alvos maiores para toque.
- Painel administrativo respeita limites mínimos dos grids em telas estreitas.
- Coluna da cidade compactada para manter a lista de paróquias visível junto aos detalhes selecionados.

## [0.3.0] - 2026-10-23

### Added

- Nome aprovado **Meu Lugar na Igreja**, assinatura de provedora AcutisTech e símbolo de marca próprio em PNG transparente.
- Ícone de navegador com a marca do produto.

### Changed

- Mapa, painel administrativo e acesso adotam o nome, símbolo, paleta e hierarquia tipográfica do produto.
- Ações primárias do painel usam dourado com texto azul-marinho, alinhadas à identidade AcutisTech.
- README e guia de marca atualizados para a identidade aprovada.
- Símbolo refinado para mostrar claramente a igreja católica e as pessoas da comunidade paroquial.

## [0.2.1] - 2026-10-23

### Added

- Guia de marca da AcutisTech e do produto, com cores observadas, arquivo de logo, hierarquia de marcas e nome sugerido aguardando aprovação.
- Logo oficial da AcutisTech incluída como ativo local para a interface.

### Changed

- Interface atual alinhada à paleta azul-marinho, dourado e marfim da AcutisTech.

## [0.2.0] - 2026-10-23

Primeira implementação funcional do mapa e painel; não há quebra de versão pública anterior.

### Added

- Compose com PostgreSQL persistente, migração SQL automática e aplicação em build de produção.
- Setup com senhas aleatórias, login administrativo, sessões no banco, limite de tentativas e auditoria.
- Mapa nacional 3D com malhas das 27 UFs e catálogo local de 5.571 municípios do IBGE.
- Cenas por cidade, várias paróquias, igrejas ilustradas, casas selecionáveis e lotes estáveis.
- Painel para criar, editar e arquivar cidades, paróquias e casas; busca e paginação de casas.
- Alternativa pública em lista, link de casa e carga opcional de demonstração.
- Testes de layout, senhas, catálogo e integridade do banco, além de orientação de operação/backup.

### Changed

- Funções e progressões adiadas por decisão do responsável; seu planejamento foi preservado.
- Stack inicial reduzida a Next.js, React Three Fiber, PostgreSQL/pg e CSS; ORM, autenticação de moradores e worker ficam para etapas que precisem deles.
- Instagram e verificação de padres permanecem como etapas futuras, sem serviços externos em runtime nesta entrega.

## [0.1.0] - 2026-10-23

Versão inicial de planejamento; não representa lançamento de software executável.

### Added

- Visão do produto da AcutisTech, com cidades em 3D e participação nacional.
- Investigação técnica das duas referências, fontes e limites de reaproveitamento.
- Proposta de arquitetura Docker-first, modelo de dados, administração e integração com Instagram.
- Catálogo extensível de áreas e funções, escolha direta e progressão configurável por pontos.
- Regras de verificação humana exclusivas para padres, sem validação dos demais títulos.
- Roadmap com critérios de aceite e fluxo documentado em Mermaid.
