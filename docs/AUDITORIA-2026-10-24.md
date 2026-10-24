# Auditoria da aplicação — 24/10/2026

## Escopo e método

Revisão do código de mapa, arte, câmera, banco, migrações, catálogo eclesiástico, participação, fila administrativa, autenticação, sessões, acessibilidade, Docker, testes e documentação. A referência é a implementação local da versão 0.10.0, com as capturas fornecidas pelo responsável. Não é um teste de invasão externo, um ensaio de carga nem uma restauração de backup. Métricas de FPS, capacidade simultânea e compatibilidade com dispositivos físicos ainda exigem medição.

Dados locais observados antes da migração aditiva: 5.571 municípios, 5 cidades cadastradas (4 ativas), 6 comunidades do mapa, 121 casas, 346 paróquias no catálogo institucional e 2 circunscrições. Há registros demonstrativos e de teste. A cobertura paroquial é parcial e não pode ser anunciada como diretório completo do Brasil.

## Problemas corrigidos nesta entrega

| Prioridade | Evidência anterior | Correção |
|---|---|---|
| P1 | `scripts/build-municipality-centers.mjs` calculava centroides dos polígonos municipais. O marcador podia ficar distante da cidade. | Sedes oficiais do IBGE/Localidades do Brasil, 5.571 códigos cobertos. Niquelândia: longitude −48,460201; latitude −14,470700. Snapshot com fonte, CRS e hash; coordenadas também importadas no PostgreSQL. |
| P1 | `brazil-map.tsx` chamava a navegação ao atingir um limiar; `map-scene.tsx` substituía o mapa por um Canvas local. | Uma câmera e um SVG contínuo. Zoom não muda rota nem troca renderizador. Busca e links de casas apenas enquadram a posição no mapa. |
| P1 | Cada paróquia recebia um terreno retangular e casas em linhas paralelas. | Um terreno urbano compartilhado, praça com fonte, anéis viários conectados e bairros paroquiais por setores. Lotes radiais com variação determinística; acréscimos não reposicionam lotes existentes enquanto o conjunto de paróquias permanece o mesmo. |
| P2 | Dados e arte da cidade não faziam parte da cartografia nacional. | Geometria da cidade ancorada na sede, porte proporcional à ocupação, detalhe progressivo e dados reais carregados quando o município aparece de perto. Casas e bairros continuam explicitamente cenográficos. |
| P2 | A tela dependia de Three.js, Fiber e Drei, mesmo para começar no Brasil 2D. | Renderizador SVG com arte isométrica própria; dependências WebGL e renderizador local removidos. Há descarte de cidades e construções fora da área visível. |
| P2 | Modais eram caixas com `aria-modal`, sem foco modal nativo nem Escape garantido. | Elemento `dialog` nativo, foco contido e fechamento por Escape, botão ou clique externo. Lista de bairros/moradores oferece alternativa à seleção de construções pequenas. |
| P2 | Arraste selecionava os nomes de cidades e estados. | Seleção e callout desativados na superfície do mapa; `pointerdown` cancela a seleção nativa. Arrastar continua possível sobre a cidade e não abre um cartão no fim do gesto. |
| P2 | Retângulos invisíveis de clique podiam alcançar uma construção vizinha. | Casas e igrejas recebem cliques no desenho pintado; a lista permanece como alternativa acessível a objetos pequenos ou parcialmente encobertos. |
| P2 | Busca por `Niquelandia` não encontrava `Niquelândia`. | `unaccent` no PostgreSQL, aplicado por migração. A busca diferencia carregamento de resultado vazio. |
| P2 | O formulário perdia o município selecionado no mapa. | Link contextual e preenchimento inicial pelo código IBGE. |
| P2 | Solicitações administrativas eram limitadas às 100 mais recentes sem próxima página. | Paginação por status e ordenação determinística. Pedidos mais antigos continuam acessíveis. |
| P3 | A tela pública de erro orientava o visitante a conferir containers. | Mensagem pública voltada à recuperação da navegação. |

## Pendências priorizadas

### P1 — antes de uma campanha pública ampla

1. **Identidade e abuso na participação.** `src/app/actions.ts::submitParticipation` possui consentimento, validação e honeypot, mas não comprova controle do perfil e não tem limitação robusta por origem. Implementar reivindicação de perfil, limites de envio com expiração e fila de exceções. Não publicar uma associação religiosa apenas porque alguém digitou um `@`. O fluxo de comentários do Instagram e sua política de publicação devem ser definidos antes da automação.
2. **Aliases e conciliação de paróquias.** A vinculação ao catálogo usa correspondência textual exata. A base contém o nome livre “Nossa Senhora da Abadia” e o catálogo oficial “Paróquia Nossa Senhora d’Abadia”. Adicionar aliases revisáveis e uma operação administrativa de vincular/fundir com prévia dos afetados, transação e histórico. Semelhança textual não deve fundir comunidades automaticamente. Evidência: `scripts/import-parish-catalog.mjs`, `src/app/actions.ts`, catálogo da Diocese de Uruaçu.
3. **Dados demonstrativos.** Segregar exemplos de cadastros reais antes de divulgar o mapa. Fazer inventário e backup; arquivar exemplos pelo painel preserva vínculos. Nenhum dado existente foi apagado nesta entrega.
4. **Operação e recuperação.** O Compose preserva o volume e a documentação descreve backup, mas não há evidência de rotina externa de backup e restauração ensaiada. Definir retenção, destino fora do servidor e teste em banco isolado. A pasta não continha `.git` durante a revisão; estabelecer versionamento e revisão de mudanças.
5. **Privacidade e atendimento.** Disponibilizar um fluxo de correção, ocultação e exclusão/reivindicação do perfil, além de informação clara sobre visibilidade. O consentimento registrado não substitui um canal de suporte. Endereços residenciais permanecem fora do produto.

### P2 — para crescer com qualidade

- **Grandes cidades:** a API `src/app/api/cities/[code]/route.ts` ainda retorna todas as casas ativas de um município. O frontend evita renderizar construções fora da janela, mas o download e o cálculo inicial continuam proporcionais ao total. Adotar resumo por nível de zoom, paginação por bairro/bloco, orçamento de construções e descarte de cache distante. Validar em celular físico e com conjuntos de 1.000/10.000 casas antes de prometer escala.
- **Atualização de dados:** o cache do navegador é por sessão; mudanças do painel aparecem em nova consulta/recarregamento. Definir invalidação ou atualização periódica moderada quando houver fluxo real de comentários.
- **Territórios e fontes:** as 346 paróquias vêm de duas fontes oficiais. Expandir por diocese com proveniência e revisão. Os setores do jogo não representam os limites pastorais reais. A sede municipal também não determina a localização real de cada igreja.
- **Cadastros administrativos:** cidades e paróquias são carregadas integralmente no painel. Paginar/filtrar no SQL à medida que o catálogo virtual crescer; reservar um seletor remoto para listas extensas de paróquias/casas.
- **Logs e sessões:** `audit_log` registra entidade, ação e autor; acrescentar antes/depois para conciliações territoriais e registrar importações. Definir limpeza de sessões expiradas, pedidos antigos e buckets de login. O limite global de login protege custo de hash, mas também pode ser usado para bloquear administradores; adotar limitação adicional no proxy/origem.
- **Geografia e estética:** adicionar hidrografia e relevo simplificados de fonte autorizada ao visual ilustrado, sem reintroduzir um mapa raster dominante. Tratar colisões de nomes de municípios próximos. A origem das sedes e a licença de cada camada devem permanecer identificáveis.
- **Acessibilidade e toque:** testar com leitor de tela e aparelhos reais. A lista ajuda a selecionar casas pequenas, mas os alvos desenhados dentro da cidade ficam reduzidos no zoom distante. Refinar rótulos, contraste e movimentos de dois dedos com base em testes de uso.
- **Regra de publicação:** o site ainda usa revisão manual para todas as solicitações, herdada do protótipo. Reconciliar essa implementação com a proposta de criação automática de casas e validação humana somente dos padres. Funções, eleições e pontuação permanecem adiadas.

### P3 — acabamento e manutenção

- Separar CSS legado e remover seletores sem uso após a mudança do renderizador.
- Expandir a arte autoral de casas (telhados, fachadas, jardins), equipamentos comunitários, vegetação regional e quatro portes de igreja; o núcleo atual é vetorial e não precisa de imagens externas para funcionar.
- Melhorar a navegação de uma paróquia nova: ao mudar a quantidade de bairros, os setores do plano urbano podem ser redistribuídos. Os slots persistem, mas coordenadas locais dependem do conjunto de paróquias; versionar planos urbanos antes de implementar edição livre de terrenos.
- Aviões são ilustrativos, com rota simples. A versão atual não equivale a tráfego real nem a uma simulação completa de aparições aleatórias. Avaliar animações contextuais sem consumir recursos com a aba oculta.

## Bases que já estão corretas

- SQL com parâmetros; autenticação verificada nas ações administrativas.
- Senhas com scrypt e salt; sessões por token aleatório com digest no banco, expiração e cookie HttpOnly.
- FKs compostas impedem casa em município diferente da sua paróquia; perfil único sem distinção de maiúsculas; lotes reservados em transação e exclusão lógica por arquivamento.
- Pendências de participação não aparecem nas rotas públicas do mapa. As casas publicadas expõem nome escolhido e perfil, sem endereço residencial.
- Imagem web sem privilégios de root, PostgreSQL sem porta externa, healthcheck, volumes persistentes e migrações por checksum.
- Catálogo eclesiástico separado das comunidades virtuais; importações por chave externa, sem apagar registros ausentes de uma coleta.
- Nenhuma pontuação, cargo ou nomenclatura canônica é alterada pelo porte visual das igrejas.

## Validação desta versão

- Lint e TypeScript executados em container; dez testes passaram, incluindo rollback de integridade no PostgreSQL, distribuição dos lotes, crescimento sem deslocamento, espaçamento em até oito bairros e sedes municipais.
- Build de produção concluído; migração aplicada; banco e web saudáveis. Healthcheck HTTP retornou `ok` e a auditoria de dependências informou zero vulnerabilidades.
- PostgreSQL: 5.571 sedes preenchidas; Niquelândia conferida em −48,460201 / −14,470700. Busca por `Niquelandia` retornou o município e três paróquias no catálogo. Contagens existentes de cidades, comunidades, casas e catálogo foram preservadas.
- Navegador: um único SVG e nenhum Canvas, uma cidade com 48 casas e duas igrejas. Afastar de 3.056× para 119× e aproximar novamente preservou a URL e trouxe os bairros sem trocar de tela.
- Gestos: arraste sobre nome e construção terminou com seleção textual vazia e nenhum modal aberto; o clique em casa abriu o morador correto e Escape fechou o diálogo.
- Revisão visual em ambiente desktop; ensaio em aparelhos físicos, leitor de tela, teste de invasão externo e carga permanecem pendentes. Essa revisão não garante desempenho em carga ou ausência de vulnerabilidades fora dos fluxos examinados.

## Sequência sugerida

1. Revisar visual e uso do mapa contínuo com Niquelândia e outra cidade.
2. Conciliar nomes/aliases e separar demonstração de produção.
3. Definir criação automática, controle do perfil e atendimento de privacidade.
4. Ampliar fontes por diocese e preparar carregamento em blocos.
5. Evoluir o kit artístico autoral, hidrografia e espaços comunitários. Pontos e cargos entram quando as regras forem aprovadas.

## Fontes geográficas

- [IBGE — Localidades do Brasil](https://www.ibge.gov.br/estatisticas/sociais/saude/27385-localidades.html).
- [Arquivo público de Localidades 2022](https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/Localidades_do_Brasil/2022/), publicado em novembro de 2025.
- `public/data/municipio-sedes.meta.json` registra URL, hash do GeoPackage, CRS e contagem. Não confundir sede urbana com centroide municipal.
