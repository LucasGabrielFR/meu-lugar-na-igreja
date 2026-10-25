# Changelog

Todas as mudanças relevantes serão registradas neste arquivo, seguindo [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [0.20.0] - 2026-10-25

### Added

- Snapshot oficial comprimido e importação transacional de 5.570 contornos municipais para PostgreSQL, com geometria, projeção, fonte, data e checksum para repetição sem reprocessamento. Lacuna de Boa Esperança do Norte registrada no manifesto.
- Testes de cobertura, idempotência, resposta do contorno local e busca municipal por código/sem acentos.

### Changed

- Admin consulta cidades e paróquias por página de 50 e busca SQL sem acentos. Consultas completas são evitadas nas outras seções; seleção de município usa consulta local limitada a 15 opções.
- Endpoint de limite municipal lê somente o banco, com cache HTTP de 24 horas; removida consulta externa ao IBGE durante a navegação.

## [0.19.0] - 2026-10-25

### Added

- Manifesto de conciliação por fontes e registro persistente de redirecionamentos, preservando proveniência e histórico dos duplicados arquivados. Revisão individual dos 378 pares, com uma descoberta adicional após corrigir o município.
- Fila de possíveis variações de nomes na importação e no Catálogo administrativo; novas fichas suspeitas são retidas antes da criação de bairros.
- Testes de preservação de casas e aliases, repetição da conciliação, bloqueio de municípios/dioceses incompatíveis e retenção de abreviações não revisadas.
- Second Brain ativado por solicitação do responsável: projeto AcutisTech cadastrado no Obsidian com visão, contexto, backlog, histórico de versões e conhecimento transversal. Instrução local de recuperação em `AGENTS.md`; sem segredos no vault.

### Fixed

- 188 duplicados arquivados de forma reversível, com nomes completos no cadastro canônico; homônimas preservadas e quatro casos inconclusivos mantidos separados. Relatório de aplicação registra os totais efetivos.
- Observação editorial “nova paróquia” retirada de São Sebastião em Palhoça.
- Cabeçalhos municipais em `<b>` reconhecidos pelo parser de Florianópolis. Ficha de Leoberto Leal deixa de herdar Itapema; snapshot e cadastro corrigidos.
- Conciliação automática anterior baseada apenas no nome substituída por decisões explícitas de fontes; importação desconsidera registros arquivados ao procurar correspondências novas.

- Build/recriação Docker saudáveis; lint, TypeScript, 48 testes e auditoria sem vulnerabilidades. Instalação vazia e repetição mantiveram 9.889 ativos e todos os aliases revisados, sem perda das 11.210 fontes da base existente.

## [0.18.2] - 2026-10-25

### Added

- Auditoria somente de leitura para possíveis duplicidades paroquiais dentro do mesmo município: abreviações, acentos, preposições, grafias próximas e títulos incompletos. O relatório preserva fontes, localidades e IDs para decisão humana; não altera importação ou registros.
- Listagem nacional com 378 pares candidatos em 110 municípios, envolvendo 553 registros dos 10.077 ativos; homônimas não são tratadas como exclusões aprovadas. Palhoça recebe conferência prioritária e identificação da observação editorial “nova paróquia”.

## [0.18.1] - 2026-10-24

### Fixed

- Projeção rodoviária restrita ao enquadramento com margem e cache por geometria; conexões calculadas por região, mantendo os vizinhos para ligações alternativas.
- Geometrias e contornos municipais reutilizados quando outros municípios carregam; escalas não são recalculadas quando os raios permanecem iguais.
- Eventos de arraste, pinça e roda agrupados por quadro, preservando a âncora do zoom e evitando atualizações intermediárias de hover durante o gesto.
- Ruas e rodovias agrupadas em poucos caminhos SVG; máscara limitada à tela para evitar superfícies desnecessariamente grandes.
- Na amostra local de Jandira, projeção completa de 367,57 ms substituída por 98,19 ms no primeiro enquadramento e 5,61 ms com cache; conexões de 1.007,68 ms para 26,48 ms. Medição de CPU em Node/Docker, sem alegação de FPS.
- Validação: build e serviços Docker saudáveis, lint, TypeScript e 43 testes aprovados; auditoria sem vulnerabilidades; arraste e zoom exercitados no navegador local sem erros de console.

### Added

- Testes de reutilização e invalidação de geometrias, trechos que atravessam a tela e conexões com municípios fora do enquadramento.
- Perfil reproduzível de cálculo do mapa em Docker, sem novas dependências, em `scripts/profile-map.mjs` e `docs/map-performance.json`.

## [0.18.0] - 2026-10-24

### Added

- Aviões ilustrativos gerados na área visível, com direções, entradas, velocidades e intervalos aleatórios em todos os níveis de zoom.
- Limite de dois voos simultâneos em telas grandes e um em telas menores; descarte de trajetos concluídos ou que saíram do enquadramento.
- Controle por visibilidade da aba/mapa, abertura de diálogos e preferência de movimento reduzido, com encerramento de timers/listeners ao desmontar.
- Testes de travessia da área visível, diversidade de direções, culling por movimento da câmera e limite por tamanho de tela.

### Changed

- Rota fixa nacional e repetição infinita substituídas por animação SVG local, sem API de voos ou novas dependências.
- Ícones mantêm tamanho legível durante o zoom, não interceptam cliques e não geram atualizações React por quadro da animação.

### Fixed

- Cada voo inicia sua própria animação SVG ao entrar no DOM, evitando que aviões criados depois herdem o tempo inicial do documento e terminem imediatamente fora da tela.
- Validação: imagens Docker reconstruídas e serviços saudáveis; lint, TypeScript e 40 testes aprovados, auditoria sem vulnerabilidades. Navegador confirmou aviões em zoom municipal, deslocamento real entre capturas DOM, substituição por novos trajetos e zero voos ao abrir um diálogo.

## [0.17.0] - 2026-10-24

### Added

- Contorno da área virtual ao passar o ponteiro e na seleção, com resumo contextual de cidade ou paróquia e contagem de casas.
- Navegação por Brasil, cinco macrorregiões, estado, cidade e paróquia; cada nível mostra seus próprios totais e ações.
- Limite municipal simplificado do IBGE em azul tracejado, consultado sob demanda por rota validada, com cache de 24 horas e fallback para a área ilustrada.
- Enquadramento específico para limite municipal, paróquia e casa; zoom ampliado para detalhes em municípios cuja ilustração foi reduzida.
- Testes de separação entre territórios metropolitanos, conservação das sedes, regiões e geometrias administrativas.

### Fixed

- Escala das cidades ilustradas considera os municípios vizinhos, evitando que São Paulo cubra Guarulhos, São Caetano e outras cidades próximas.
- Nome e contagem ficam junto da sede e da área correspondente, em vez de aparecerem deslocados abaixo da mancha urbana.
- Clique em igreja preserva a seleção paroquial, com ação de localizar seu bairro; clique no território seleciona a cidade.
- Validação: Docker reconstruído com aplicação e banco saudáveis; lint, TypeScript e 38 testes aprovados, auditoria sem vulnerabilidades. Navegador conferiu cartão municipal, limite administrativo, navegação Sudeste → São Paulo e seleção/localização paroquial com resumo persistente. Endpoint municipal retornou 200 para São Paulo e São Caetano (qualidade máxima da malha simplificada), 400 para código inválido e 404 para município inexistente.

## [0.16.0] - 2026-10-24

### Added

- Cidade contínua organizada em quadras com núcleos paroquiais, praças locais, praça compartilhada e setores visuais em municípios grandes.
- Lotes e blocos determinísticos: adicionar moradores e paróquias preserva as posições já ocupadas. Novos blocos residenciais entram na malha compartilhada.
- Seleção de nomes por zoom, quantidade de paróquias, prioridade da cidade em foco e colisão em coordenadas de tela.
- Detalhamento progressivo de igrejas, árvores, casas e nomes paroquiais, com destaque por foco/seleção e passagem do ponteiro.
- Testes para centenas de paróquias, estabilidade de lotes e núcleos, conectividade de ruas e colisão de nomes.

### Changed

- Distribuição circular e vias radiais substituídas por ruas conectadas em quadras. Acessos às rodovias chegam a nós dessa malha.
- Símbolos e nomes municipais aparecem gradualmente; cidades com mais paróquias têm prioridade em escalas distantes.
- Setores são organização visual fictícia, sem inferência de limites paroquiais ou diocesanos.
- Validação: Docker reconstruído com aplicação e banco saudáveis; lint, TypeScript e 35 testes aprovados; auditoria de dependências sem vulnerabilidades. Revisão visual de São Paulo e visão nacional confirmou quadras e nomes progressivos. Auditoria de acessos atualizada para 4.019 municípios.

## [0.15.0] - 2026-10-24

### Added

- Publicação de paróquias do Acervo Católico como fonte de referência, com município IBGE resolvido e diocese em aberto.
- Proveniência institucional/referência persistida no catálogo e em suas fontes, identificada no painel, API e cartão da igreja.
- Reconciliação de correspondências únicas por nome/município; homônimas ambíguas ficam para revisão. Fontes institucionais existentes têm prioridade.
- Restrição de banco exige diocese para registros institucionais, permitindo vínculo desconhecido apenas em referências.

### Changed

- Importação e atualização do mapa usam também o snapshot nacional de referência, conforme autorizado pelo responsável, sem criar casas.
- Catálogo administrativo usa junção opcional de diocese e exibe totais separados por tipo de fonte.
- A confirmação institucional posterior pode aproveitar um registro de referência existente, preservando seu identificador e bairro.
- A conciliação reconhece qualificadores iniciais como “Santuário”, corrigindo a duplicata de São José em Niquelândia e outras 13 referências vazias, arquivadas com suas fontes preservadas no registro institucional.
- Validação: importação repetida manteve 10.077 paróquias ativas (2.624 institucionais e 7.453 referências), em 4.019 municípios e 27 UFs, sem casas e sem bairros faltantes. Docker reconstruído e saudável; lint, TypeScript e 31 testes passaram; auditoria sem vulnerabilidades. Cartão de referência conferido no navegador em Maceió com origem e diocese em aberto; painel protegido por autenticação.

## [0.14.0] - 2026-10-24

### Added

- Coletor institucional complementar com 230 fichas de Florianópolis, Rio Branco, Aracaju e Cuiabá, URLs de origem e exclusões documentadas.
- Coleta nacional independente de referência, separada do catálogo publicado, com cache por página, retomada, classificação por nomenclatura e município IBGE.
- Auditoria reproduzível por UF e circunscrição, relação de candidatas para pesquisa e minuta de solicitação de exportação nacional à instituição responsável.
- Testes de classificação, associação municipal e separação entre referência e catálogo institucional.

### Changed

- Importação transacional inclui o novo snapshot oficial, mantendo a reconciliação de fontes e sem criar casas.
- Serviços Docker específicos para atualização institucional complementar e referência nacional. Nenhuma dependência nova.

- Imagens reconstruídas e aplicação/banco saudáveis. Importação repetida preservou 2.624 paróquias, 830 municípios do catálogo, 21 UFs e zero casas; nenhum registro ativo ficou sem bairro associado.
- Lint, TypeScript e 27 testes passaram; auditoria de dependências sem vulnerabilidades. Quatro municípios das novas fontes responderam pela API pública com seus bairros e zero casas.

## [0.13.0] - 2026-10-24

### Added

- Malha rodoviária IBGE BC250 2021: 129.366 trechos classificados como construídos e operacionais, dentre 133.528 registros consultados. Inclui rodovias estaduais e demais estradas além das federais.
- Visão geral com 14.270 trechos federais e 200 arquivos regionais carregados por aproximação, com cache limitado no cliente.
- Auditoria reproduzível das conexões com a malha real e testes para Campinorte, Niquelândia, Minaçu e Colinas do Sul.

### Changed

- A atualização padrão de rodovias usa o IBGE; o coletor DNIT permanece apenas como referência histórica.
- As entradas seguem a direção da estrada, com asfalto, acostamento visual e faixas na mesma escala das ruas da cidade.
- O terreno da comunidade perdeu a borda circular rígida; vias internas sem acesso externo terminam nos anéis urbanos, sem falsas saídas no gramado.

### Fixed

- Rodovia junto ao núcleo não é mais confundida com acesso existente: as interseções com o perímetro geram entradas explícitas.
- Rodovias cortadas pelo desenho da cidade recebem ligações; a seleção não fica limitada aos dois primeiros cruzamentos.
- Ruas internas e estradas externas deixam de usar espessuras incompatíveis ao aproximar.

## [0.12.0] - 2026-10-24

### Added

- Inventário público das 281 circunscrições CNBB, com classificação canônica das igrejas, data da consulta e indicação de diretório vazio.
- Conectores oficiais de Manaus, dos sete vicariatos de Natal, Vitória e Roraima. Catálogo ampliado para 2.394 paróquias ativas em 752 municípios, 17 UFs e 39 circunscrições com registros.
- Malha real DNIT/IBAMA: 5.251 trechos existentes da versão SNV 202201B, excluindo trechos planejados e travessias, carregada de snapshot local.
- Acessos ilustrativos até a rodovia próxima e conexões limitadas entre municípios até 100 km, com saídas encaixadas no perímetro da cidade.
- Camada rodoviária configurável, atribuição das fontes, descarte de geometrias fora do enquadramento e testes de proximidade/encaixe.

### Changed

- Importação mantém paróquias homônimas com IDs distintos da mesma fonte; concilia somente correspondências inequívocas entre provedores diferentes.
- Atualização nacional consulta cada circunscrição, com checkpoint factual, sem persistir fotos, biografias ou contatos pessoais da resposta.
- Painel exibe a data de consulta CNBB e distingue diretório vazio de ausência real de paróquias. A cobertura permanece parcial.

### Removed

- Por solicitação do responsável, removidas as 121 casas, cinco bairros sem fonte, um bairro duplicado e duas cidades apenas de teste. Backup factual local antes da limpeza.
- Mapas de demonstração deixam de aparecer; os municípios e paróquias reais importados permanecem sem moradores.

## [0.11.0] - 2026-10-24

### Added

- Coletor público CNBB/CDICBR: 281 circunscrições e 1.844 fichas paroquiais resolvidas em 641 municípios e 13 UFs, entre 1.883 resultados. Cobertura parcial.
- Snapshot nacional, 39 exclusões documentadas e trilha de fontes múltiplas por paróquia.
- Cobertura por circunscrição, municípios/UFs e histórico das coletas no painel.
- Testes de resolução município/UF e integridade do catálogo nacional.

### Changed

- Paróquias importadas geram bairros no mapa mesmo sem casas. A importação não valida padres.
- Conciliação conservadora entre fontes por município, circunscrição e nome. Arquivamentos e casas são preservados.
- Busca enquadra também cidades com igrejas e nenhuma casa. Cartões mostram circunscrição e fonte oficial.

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



