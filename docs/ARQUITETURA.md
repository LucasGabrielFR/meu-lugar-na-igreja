# Arquitetura proposta

> Direção vigente na versão 0.10.0: `world-map.tsx` mantém a única câmera; `town-art.tsx` desenha construções no próprio mapa, `town-layout.mjs` organiza bairros conectados e `use-city-cache.ts` carrega dados por aproximação. As sedes oficiais substituem centroides; coordenadas são armazenadas no PostgreSQL. Three/Fiber/Drei foram removidos. As notas versionadas abaixo descrevem a evolução histórica.

Status: base Docker executável com mapa contínuo SVG e arte isométrica, painel e solicitações públicas moderadas. Ainda sem infraestrutura remota provisionada.

> Atualização 0.2.0: existe uma primeira implementação local com Compose, PostgreSQL/pg, migrações SQL, Next.js e mapa 3D. A arquitetura abaixo permanece como visão de evolução. Drizzle, Better Auth, worker e domínio de funções/progressão foram adiados; não estão instalados. Consulte [operação](OPERACAO.md) e README para o estado executável e os limites atuais. Não há deploy remoto.

> Atualização 0.4.0: o formulário público grava solicitações pendentes no PostgreSQL. Somente o painel pode aprovar e publicar os dados; cidade e paróquia podem ser criadas na transação da casa. Consentimento e decisão de revisão ficam registrados. Não há login de morador, confirmação de posse do Instagram, e-mail ou integração Meta.

> Atualização 0.5.0: a visão nacional usa vinte tiles OSM z5 para cobrir o Brasil em uma malha estadual IBGE translúcida. Os tiles são solicitados diretamente pelo navegador, com atribuição e link ODbL. A camada depende da disponibilidade do servidor público OSM; tráfego de produção maior exige provedor ou hospedagem própria. A aeronave é arte estática, sem API de voos.

> Atualização 0.6.0: aeronaves ilustrativas atravessam ocasionalmente a cena nacional. A animação só existe enquanto a visão nacional está aberta, pausa com a aba oculta e respeita `prefers-reduced-motion`. Não há API nem dados de voo.

> Atualização 0.7.0: visão nacional superior 2D e pan/zoom; cidade isométrica 3D com câmera fixa e pan/zoom, sem rotação. Paróquias ocupam setores dentro do mesmo município. A igreja tem quatro portes visuais de construção determinados pela quantidade de casas ativas (0–7, 8–23, 24–47, 48+); esses níveis não alteram a designação canônica da comunidade. Os limites são parâmetros iniciais e podem ser refinados.

## Decisão 001: aplicação única com worker

Next.js/React/TypeScript atende site, páginas compartilháveis, painel e API. Three.js com React Three Fiber/Drei atende as cenas. PostgreSQL armazena o domínio; Drizzle gerencia consultas e migrações. Better Auth atende autenticação por e-mail, com confirmação e recuperação; autorização administrativa é explícita no servidor.

Worker Node.js do mesmo projeto processa entradas e pontuação com pg-boss, compartilhando PostgreSQL. Evita adicionar Redis e uma API independente na primeira versão. Não processar tarefas duráveis dentro da renderização de páginas nem depender de um processo web sobreviver após responder ao webhook.

Alternativas: React/Vite com API separada dá liberdade de implantação, mas aumenta a coordenação inicial; uma engine completa de jogo acrescenta tamanho e complexidade sem necessidade para câmera e seleção de casas. Supabase aparece na referência, mas não é dependência obrigatória desta proposta. A recomendação é PostgreSQL com autenticação no projeto para uma composição Docker menor. Reavaliar backend independente e cache externo quando métricas mostrarem necessidade.

Fontes técnicas e distinção entre evidência e recomendação estão em [REFERENCIAS.md](REFERENCIAS.md).

## Decisão 002: Brasil agregado, cidades detalhadas

Uma entrada nacional mostra estados e municípios agregados. Entrar numa cidade carrega sua cena, igrejas e lotes em blocos visíveis. Paróquias são agrupamentos navegáveis dentro da cidade, sem impor limites geográficos canônicos fictícios.

Persistir alocação de lote, coordenadas virtuais e versão de layout. Uma nova casa não pode reposicionar todas as existentes. Reservar terreno para várias igrejas e expansão. Compartilhar geometrias/materiais, instanciar casas repetidas, reduzir detalhes à distância, limitar resolução e sombras no celular e suspender renderização desnecessária. Oferecer lista acessível de cidades/paróquias/casas quando WebGL estiver indisponível.

Isso mantém abrangência nacional sem prometer milhões de casas simultaneamente na GPU. Metas provisórias para a prova técnica: interação a pelo menos 30 FPS no celular de referência com 1.000 casas visíveis e primeira experiência útil em até 5 segundos na conexão de teste acordada. São critérios de avaliação, não resultados medidos. Testar 10.000 casas em uma cidade carregando blocos, sem renderizar tudo de uma vez. Registrar aparelho, navegador, rede e tamanho transferido.

## Decisão 003: integração oficial com alternativa manual

A conta profissional da campanha é conectada à integração Meta. Não depender de scraping. Selecionar Instagram Login ou Facebook Login após validar permissões e configuração reais, sem misturar seus nomes de permissões. A participação de contas pessoais acontece como comentarista, sem exigir que elas autorizem uma API profissional.

Fluxo projetado: endpoint verifica assinatura, valida conta/mídia autorizadas e persiste evento antes de responder; worker interpreta e resolve referências; casos ambíguos aguardam informação, enquanto entradas completas seguem as regras do produto. Paginação/reconciliação de comentários complementa webhooks quando a API e permissões permitirem. Reenvios usam chave única por provedor, conta e evento/comentário; edições são revisões, sem outra casa ou novo bônus.

Polling deve respeitar limites e pausas com backoff. Eventos com erro mantêm tentativas e motivo; token expirado gera alerta operacional e pausa da captura. Guardar tokens no servidor com proteção e acesso restrito; não registrar segredos em logs.

O MVP aceita entrada manual estruturada e formulário no site usando o mesmo processamento. A integração automática só é marcada como pronta após prova com a conta de campanha, comentários reais autorizados, payloads e permissões de produção. Não garantir DMs automáticas nem acesso a perfis privados.

## Modelo conceitual de dados

| Entidade | Relações e informações centrais |
| --- | --- |
| Estado | UF, código e nome oficiais |
| Município | Código IBGE único, UF, nome e posição de apresentação |
| Diocese | Nome e referências institucionais, opcional no cadastro inicial |
| Paróquia | Município-sede, diocese opcional, aliases e estado de publicação |
| Abrangência paroquial | Paróquia e municípios atendidos, se necessários |
| Pessoa/conta | Identificador interno, nome público, estado e preferências |
| Identidade externa | Provedor, ID estável quando fornecido, @ atual, histórico de aliases e prova de controle |
| Adesão à paróquia | Pessoa, paróquia, principal/secundária e datas |
| Casa/lote | Pessoa, município, paróquia, bloco, posição fictícia e layout |
| Padre | Pessoa ou registro ainda não reivindicado, perfil indicado e estado de verificação |
| Vínculo sacerdotal | Padre, paróquia, pároco/vigário, início/fim e decisão vinculada |
| Pedido de verificação | Evidências privadas, analista, motivo, decisão e datas; apenas padres |
| Área/grupo | Área temática, pastoral/serviço/equipe/movimento/conselho, escopo e modelo herdado |
| Definição de função | Nome, grupo, escopo, modalidade de entrada, pontos e regras de acumulação |
| Função da pessoa | Pessoa, definição, território/paróquia, início/fim, escolha ou avanço |
| Trilha/patamar | Funções e requisitos configuráveis, vigência e versão |
| Preferência de progressão | Pessoa, trilha e autorização de avanço automático |
| Lançamento de pontos | Evento único, pessoa, variação, motivo e versão de regra |
| Campanha/comentário/evento | Conta, mídia, ID de origem, revisão e estado do processamento |
| Consentimento/preferência | Finalidade, versão do aviso, manifestação, exposição e revogação |
| Permissão administrativa | Usuário, permissão técnica e escopo; separada dos títulos |
| Auditoria | Operador, ação, entidade, motivo e informações necessárias à rastreabilidade |

Restrições a implementar no banco e nos serviços:

- No máximo um pároco ativo por paróquia, com índice único parcial e transação na troca; vigários permitem múltiplos vínculos.
- Uma casa ativa por pessoa na proposta inicial; lote ativo único por cidade e layout.
- Uma adesão principal ativa por pessoa; consistência entre município da casa e paróquia escolhida.
- ID estável do provedor, quando disponível, é a referência da identidade; @ mutável não é uma chave suficiente. Se o payload não permitir identificação confiável, manter pedido pendente e exigir reivindicação com prova.
- Escopo válido da função (paróquia, município ou estado), sem misturar IDs ou aceitar função arquivada.
- Seleção/avanço e avaliação de pontos feitos no servidor, com transação e idempotência; repetir desbloqueio não duplica participação.
- Perfil de padre confirmado e vínculo válido antes de exibir pároco/vigário confirmado. Nenhuma regra de pontos contorna essa restrição.
- Funções comuns não exigem estado de aprovação; moderação é independente. Nomes e aliases não podem criar equivalentes livres de padre/pároco/vigário.
- Fusão de paróquias migra casas e adesões com auditoria; conflito de párocos aguarda resolução explícita.

## Docker e implantação

Composição planejada: `web`, `worker`, `postgres` e tarefa de migração executada uma vez por implantação. Em produção, proxy HTTPS e armazenamento de objetos para arquivos, quando houver uploads. Web e worker usam imagem versionada do mesmo código, com comandos distintos.

Requisitos: banco sem porta pública em produção, volume persistente, backup com restauração testada, verificações de saúde, secrets fora do repositório, logs sem dados sensíveis desnecessários e conta inicial administrativa criada por procedimento controlado. A migração termina antes de iniciar serviços que dependam dela; não aplicar migrações concorrentes em cada réplica.

Depois de alterações de código: construir, recriar, aguardar saúde dos containers e somente então executar testes. O futuro Compose deve suportar `docker compose up --build -d`; validar imagens e processos recriados e `docker compose ps`. Uma única máquina é opção inicial, com limitação explícita de disponibilidade; separar banco, réplicas e CDN conforme carga e exigência operacional.

## Organização inicial proposta

Um pacote, sem monorepo obrigatório: `src/app` para site/API/admin, `src/domain` para regras, `src/db` para schema, `src/integrations/instagram`, `src/worker`, `src/map`, `public` para arte própria, `drizzle` para migrações e `docs` para decisões. Não criar essas pastas vazias antes de precisar delas.
