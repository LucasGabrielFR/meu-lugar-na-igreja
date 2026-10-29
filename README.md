# Meu Lugar na Igreja

Produto da **AcutisTech**, com uma base executável de mapa e administração. Um mapa contínuo ilustrado com cidades em arte isométrica, organizado por municípios e paróquias brasileiras, com participação integrada via comentários no Instagram e criação direta no mapa.

## Pré-carregamento (Boot Loader), Otimização de Rodovias e Hover Municipal — versão 0.24.1

- **Pré-carregamento completo na tela inicial (`MapLoading`):** antes de liberar o mapa, a tela de carregamento pré-projeta em fatias (`requestAnimationFrame`) as 14.270 linhas de `highways.json` no cache (`warmHighwaysCache`) e pré-carrega os layouts e contornos das cidades em destaque/foco, eliminando engasgos ao iniciar a navegação.
- **Fim do travamento ao aproximar cidades:** `MapRoadLayer` agora usa caminhos SVG memoizados (`useMemo`) com `vectorEffect="non-scaling-stroke"` (sem recalcular ou retesselar milhares de segmentos a cada frame de roda/arraste); o nível de detalhe rodoviário filtra micro-segmentos em zoom regional e limita os blocos detalhados (`useRoadData`) às 3 células mais próximas somente em `zoom >= 28`; `TownArt` aplica nível de detalhe progressivo (`blockPixels`) e `loadCity`/`boundaries` aguardam a câmera estabilizar (`settledVisibleCities`).
- **Correção do destaque territorial no hover:** passar o mouse sobre um município ou sobre o terreno não pinta mais o estado inteiro de marrom/dourado (`shapes` não altera `fill` em `onPointerEnter`). Os territórios municipais (`municipality_boundaries`, até 120 por lote a partir de `zoom >= 2.8`) destacam exclusivamente o município sob o cursor.

## Duas Formas de Criar Casa, Desempenho do Mapa e Território Municipal — versão 0.24.0

- **Duas formas de criar casa no mapa:** além da criação automática via comentários em `@meu_lugar_na_igreja`, o visitante pode clicar na barra dourada inferior (**"construa sua casa aqui com seu @"**) ou no botão **"Construir casa"** no topo, informando um `@` válido do Instagram, município e paróquia ativa (`createHouseOnMap`). A casa é criada ou atualizada imediatamente no bairro paroquial e a câmera voa até o lote.
- **Busca rápida por `@` (`achar`) e modo `Passear`:** campo `@ seu @ [achar]` no cabeçalho (`/api/houses?q=...`) para localizar diretamente a casa de qualquer participante, além do botão **Passear** para tour automático pelas comunidades ativas.
- **Pílulas de status e badges estaduais:** barra de status no topo do mapa com indicador `DIA 0 · PRÉ-LANÇAMENTO` (pronto para iniciar a contagem oficial no Dia 1), contadores de casas e paróquias, destaque da última casa criada e pílulas estaduais na visão macro do Brasil.
- **Território municipal IBGE e bairros paroquiais aprimorados:** carregamento em lote dos limites municipais reais (`/api/cities/boundaries`) ao aproximar o mapa (`zoom >= 5`), praças paroquiais com calçamento e caminhos radiais conectados à matriz, e selo `@username` sobre a casa selecionada.
- **Otimização severa de desempenho do mapa:** substituição do cálculo `O(N²)` de escalas municipais (`buildTownScales`, ~8 milhões de iterações) por grade espacial `O(N)`, remoção da máscara SVG de tela cheia nas rodovias (`MapRoadLayer`), consolidação da renderização dos estados e supressão de eventos de hover durante o arraste (`isDragging`).

## Processamento de Comentários Instagram com IA — versão 0.23.0

Os eventos recebidos pelo webhook `/api/webhooks/instagram` são processados automaticamente (e também sob demanda no painel `/admin?view=instagram` ou pelo perfil Docker `instagram-process`). O sistema utiliza um modelo leve via OpenRouter (`OPENROUTER_MODEL`, padrão `openai/gpt-4o-mini`) aliado ao catálogo paroquial PostgreSQL para identificar a **Paróquia, Cidade e Estado (UF)** comentados pelo participante:
- **Correspondência confirmada:** cria ou atualiza automaticamente a casa do autor (`instagram_user_id` / `@username`) na paróquia e município correspondentes, garantindo uma única casa por perfil.
- **Comentário incompleto ou paróquia não localizada/ambígua:** responde automaticamente ao comentário no Instagram (`POST /{comment_id}/replies`) em tom respeitoso, católico e bem-humorado, orientando como informar a paróquia, bairro e cidade/UF.
- **Prevenção de loops e duplicidades:** ignora eventos sintéticos de teste da Meta e comentários feitos pela própria conta conectada, registrando o histórico em `instagram_comment_events` (migration `013`).

## Diagnóstico Instagram — versão 0.22.1

O receptor registra nos logs aceitação, rejeição e falha de persistência sem expor payloads ou credenciais. O perfil Docker `instagram-diagnostics` faz consultas somente de leitura para conferir conta, assinaturas, permissões e acesso amostral aos comentários. Isso permite distinguir falha de entrega de rejeição no servidor; não ativa assinaturas nem cria casas. Veja [roteiro de diagnóstico](docs/DIAGNOSTICO-INSTAGRAM.md). Sem novas dependências ou migrations.

## Conectar Instagram — versão 0.22.0

O admin tem uma seção **Instagram** com OAuth oficial, exibição do perfil, atualização dos dados e desconexão local. Configure APP_URL, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET e INSTAGRAM_TOKEN_ENCRYPTION_KEY; cadastre `/api/instagram/callback` no login da Meta. Tokens ficam cifrados no PostgreSQL, e o callback valida state de uso único ligado à sessão administrativa. Sem novas dependências. Veja [configuração e roteiro de demonstração](docs/INSTAGRAM-OAUTH.md). O webhook existente é preservado; conectar não inicia a criação de casas. Sem credenciais reais configuradas, o botão permanece desabilitado.

## Acesso administrativo — versão 0.21.2

O mapa público não exibe atalho para administração. Os links públicos de privacidade e termos permanecem disponíveis. Acesso direto por /admin, com autenticação obrigatória e proteção de login existentes.

## Recepção Instagram — versão 0.21.0

A rota `/api/webhooks/instagram` responde à verificação da Meta e persiste notificações assinadas na tabela `instagram_webhook_receipts`. Configure `META_WEBHOOK_VERIFY_TOKEN` e `META_APP_SECRET` no servidor e reconstrua o Docker. A rota permanece indisponível enquanto seu respectivo segredo estiver ausente. Esta etapa recebe eventos; processamento de comentários e criação de casas ainda não estão implementados. Veja [configuração, tabela e acesso ao banco por SSH](docs/INSTAGRAM-WEBHOOK.md). Nenhuma dependência nova.

## Planejamento da integração Instagram

O próximo fluxo usará somente **@meu_lugar_na_igreja**: comentário do próprio autor com município/UF e paróquia, sem login do morador, código de comprovação ou documentos. Autoria vem da API oficial, nunca de um @ mencionado no texto. A integração ainda não está implementada; o formulário moderado atual permanece funcionando. Veja [plano e aceites](instagram-identidade-plan.md).

## Dados locais e administração — versão 0.20.0

A lista de cidades já consultava o PostgreSQL, sem busca em tempo real no IBGE. Agora cidades e paróquias têm busca SQL sem distinção de acentos e paginação de 50 cadastros. O formulário de cidade consulta até 15 municípios da base local, em vez de entregar 5.571 opções ao navegador.

Os contornos de 5.570 municípios também passam a ser persistidos no PostgreSQL, com geometria original, projeção preparada, fonte e data. A navegação não consulta mais a API do IBGE. Boa Esperança do Norte (MT) consta no catálogo, mas sua malha não foi disponibilizada pela fonte nesta coleta. Veja [dados locais e atualização](docs/DADOS-LOCAIS.md).

## Conciliação e memória — versão 0.19.0

A revisão dos 378 pares originou 165 conciliações iniciais e 23 adicionais descobertas na correção geográfica e no teste de instalação limpa. Duplicados são arquivados, suas fontes redirecionadas ao cadastro canônico e os nomes completos preservados. Homônimas em localidades diferentes permanecem distintas; quatro casos sem evidência suficiente continuam separados. Decisões, fontes e motivos estão em `db/catalog/parish-resolutions.json`; resultado em [Conciliação paroquial](docs/CONCILIACAO-PAROQUIAS.md). O backup anterior à aplicação está em `backups/`, fora do Git e das imagens.

A importação reaplica o manifesto e respeita os aliases. Fichas novas com possíveis variações de nome ficam retidas na fila **Possíveis variações aguardando revisão**, no Catálogo do admin, antes de criar outro bairro. A semelhança não provoca união automática. Não há novas dependências.

Este projeto passa a usar a skill `obsidian-second-brain`. Visão geral, decisões, backlog e histórico 0.1.0–0.18.2 foram registrados no vault da AcutisTech, em `01_Empresas/Acutis_Tech/Projetos/Meu Lugar na Igreja/`; resultados seguintes são anexados. `AGENTS.md` orienta a recuperação nas próximas sessões. Credenciais e backups não são copiados ao vault.

## Auditoria de nomenclatura — versão 0.18.2

O [relatório de possíveis duplicidades](docs/AUDITORIA-PAROQUIAS.md) lista pares por município, com nomes originais, fontes e IDs de catálogo e mapa. O script `scripts/audit-parish-duplicates.mjs` usa transação PostgreSQL somente de leitura; não altera o catálogo, o importador ou o mapa. Nomes semelhantes e homônimas exigem revisão humana antes de qualquer conciliação. Não há novas dependências. O admin permite editar e arquivar a exibição do bairro; isso não mescla fontes nem remove o registro de catálogo.

## Direção confirmada

- Um único mapa 2D contínuo: igrejas, bairros e casas aparecem ao aproximar, com arte isométrica própria.
- Participações de todo o Brasil desde o início.
- Uma cidade pode ter várias paróquias; cada morador tem uma casa e uma paróquia principal na proposta inicial.
- Cada paróquia tem um pároco e pode ter vários vigários. Cadastros ainda incompletos podem aguardar a identificação do pároco.
- **Somente a função de padre exige verificação humana.** Funções paroquiais e cargos civis são escolhidos no site, com desbloqueios por pontuação configurável.
- Uma pessoa pode acumular funções paroquiais e civis. Esses títulos não concedem acesso administrativo.

## Desempenho do mapa — versão 0.18.1

Geometrias das cidades e das vias são reutilizadas em memória. A projeção das rodovias considera a região visível com margem, e as conexões municipais são calculadas apenas nesse entorno, preservando os vizinhos para ligações alternativas. Os traços das ruas são agrupados em SVG e a máscara rodoviária acompanha o enquadramento. Arraste, pinça e roda acumulam eventos até o próximo quadro do navegador. Sem novas dependências, serviços ou alterações de banco.

Veja [medição reproduzível e limites da validação](docs/DESEMPENHO-MAPA.md).

## Aviões ilustrativos — versão 0.18.0

Os aviões cruzam a área que o usuário está vendo em trajetórias aleatórias, em qualquer zoom. Direção, ponto de entrada, velocidade e intervalo variam localmente; os trajetos acompanham a posição geográfica do mapa e voos que deixam a área visível são descartados. O limite é de dois aviões em telas grandes e um em telas menores. A geração para quando a aba ou o mapa estão ocultos, durante os diálogos e quando o dispositivo pede movimento reduzido. A animação usa SVG nativo; o controle de geração/visibilidade roda a cada 250 ms somente enquanto o mapa está ativo. Não há API de aviação, autenticação ou nova dependência.

## Territórios e navegação — versão 0.17.0

Áreas virtuais vizinhas usam escalas compatíveis com a distância entre as sedes, mantendo as coordenadas oficiais e evitando sobreposição. Passar o ponteiro sobre a cidade destaca seu contorno dourado e mostra nome, UF, macrorregião, paróquias e casas. Clicar no território abre a cidade; clicar na igreja abre somente os detalhes paroquiais. A navegação permite Brasil → região → estado → cidade → paróquia, com totais próprios em cada nível.

O limite municipal real é mostrado em azul tracejado, separado da área ilustrada. Até a versão 0.19, a rota `/api/cities/[code]/boundary` consultava a [API pública de malhas do IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3) sob demanda, com cache de 24 horas, timeout e mensagem de indisponibilidade. Desde a versão 0.20.0, essa camada usa exclusivamente a malha persistida no banco; acesso externo ao IBGE é necessário apenas para atualizar o snapshot. A ilustração, as informações do catálogo e os contornos virtuais continuam funcionando quando essa consulta falha. O botão “Ver limite municipal · IBGE” enquadra a malha administrativa; localizar uma paróquia enquadra seu bairro.

## Cidade em quadras — versão 0.16.0

Na versão 0.16.0, a cidade usa quadras compartilhadas e núcleos paroquiais, mantendo uma única malha por município. Cidades grandes têm setores visuais; as igrejas e seus nomes ganham detalhes conforme a aproximação. Os nomes municipais priorizam a quantidade de paróquias e o espaço disponível na tela, evitando sobreposição. Os setores são ilustrativos, sem limites eclesiásticos reais. Lotes e núcleos têm posições determinísticas, preservadas ao crescer. Não há dependências ou alterações de banco adicionais nesta versão.

## Rodovias — versão 0.13.0

A camada padrão agora usa **IBGE BC250 2021**, com **129.366 trechos construídos e operacionais**, incluindo estradas estaduais e outros acessos. O DNIT deixou de ser a fonte ativa. A base é cartográfica e histórica; não representa trânsito ou roteamento atual.

A abertura carrega uma visão geral (~2 MB sem compressão). Ao aproximar, o mapa busca apenas os arquivos da região entre 200 células locais; o cliente mantém até 24 células em cache. A navegação não depende de API externa, token ou provedor pago.

As entradas são calculadas nos cruzamentos entre as estradas e o desenho da cidade. A rua interna continua para fora na direção correta, com a mesma escala de pavimento. A área verde ficou integrada ao terreno, e saídas sem ligação deixaram de avançar até a borda do gramado.

A auditoria identificou estradas reais acessíveis a 750 dos 751 municípios com bairros ativos avaliados. Fernando de Noronha ficou sem ligação externa; não foi desenhada uma ponte fictícia até o continente. Os quatro municípios apresentados nas imagens têm entradas na malha real. Veja [detalhes e operação](docs/RODOVIAS.md) e [auditoria da malha](docs/road-network-audit.json).

## Catálogo paroquial e estado dos dados

O mapa contém **9.889 paróquias no catálogo ativo, em 4.019 municípios e 27 UFs**: **2.618 institucionais** e **7.271 referências com diocese em aberto**, com **zero casas**. A cobertura continua parcial. Os totais e as lacunas por UF e por diocese estão em [Cobertura paroquial](docs/COBERTURA-PAROQUIAL.md). O contador do mapa inclui também um município real anteriormente cadastrado, sem paróquia ativa, totalizando 4.020 cidades. Os registros apenas de teste foram removidos a pedido do responsável, com backup local em `backups/` (não versionado, não incluído na imagem). Municípios reais que já eram usados em testes permanecem com os seus bairros institucionais.

As **281 circunscrições CNBB foram consultadas individualmente**; só 33 retornaram igrejas na consulta pública. Diretórios oficiais complementares ampliaram a cobertura; atualmente 43 circunscrições têm paróquias vinculadas no projeto. **A cobertura continua parcial**, com lacunas explícitas em AC, AL, AP, CE, MT, MS, PA, PI, SC e SE, além de dioceses ausentes dentro dos estados atendidos. Não inferimos paróquias a partir de capelas ou do simples nome de um templo.

A camada rodoviária pode ser ligada/desligada em **Camadas do mapa**. Entradas e bairros são adaptados à cidade virtual. Veja [rodovias](docs/RODOVIAS.md) e [dados eclesiásticos](docs/DADOS-ECLESIASTICOS.md).

Atualizar dados e aplicar a nova imagem:

```powershell
docker compose --profile tools run --build --rm catalog-national
docker compose --profile tools run --build --rm catalog-regional
docker compose --profile tools run --build --rm catalog-expansion
docker compose --profile tools run --build --rm highways
docker compose up --build -d --wait
```

O inventário CNBB retoma checkpoints recentes e renova fichas com mais de 24 horas. Para forçar nova consulta completa: `docker compose --profile tools run --rm catalog-national node scripts/fetch-cnbb-inventory.mjs --refresh`. As fontes regionais antigas continuam disponíveis pelo serviço `catalog`. Os comandos de atualização não apagam casas nem cadastros: a limpeza solicitada nesta sessão foi uma operação única, separada das migrações.

## Documentação

- [Guia de marca AcutisTech e Meu Lugar na Igreja](docs/BRANDING.md)
- [Proposta e regras do produto](docs/PRODUTO.md)
- [Catálogo de funções e progressão](docs/FUNCOES-E-PROGRESSAO.md)
- [Investigação das referências e fontes](docs/REFERENCIAS.md)
- [Dados eclesiásticos: fontes, acesso e plano de importação](docs/DADOS-ECLESIASTICOS.md)
- [Arquitetura e modelo de dados propostos](docs/ARQUITETURA.md)
- [Etapas e critérios de entrega](docs/ROADMAP.md)
- [Fluxo do sistema em Mermaid](docs/fluxo.mmd)
- [Diagrama exportado em SVG](docs/fluxo.svg)
- [Histórico de alterações](CHANGELOG.md)
- [Auditoria completa e sugestões priorizadas](docs/AUDITORIA-2026-10-24.md)

## Escopo de navegação e participação

Mapa contínuo do Brasil com cidades ilustradas, bairros paroquiais, igrejas, casas selecionáveis e links diretos. Uma aeronave ilustrativa na visão distante não representa tráfego real. O formulário em `/participar` registra município, paróquia, nome público, perfil e consentimento; pedidos permanecem privados até a revisão no painel. Aprovar cria ou reativa os vínculos e publica a casa numa transação. O painel também mantém os cadastros e a trilha de auditoria.

Funções e progressões permanecem documentadas e **adiadas por decisão do responsável**. Não foram implementadas. Verificação de padres, login de moradores e integração com Instagram também não fazem parte desta entrega. O formulário não exige conta; apenas pedidos aprovados e autorizados se tornam públicos. Informar um perfil não comprova controle da conta.

A abertura usa a logo do projeto. O mapa mantém uma única câmera durante a aproximação, sem carregar outra cena. A cidade é ancorada na sede urbana oficial do IBGE; novas casas ampliam a ocupação e o porte do município. Uma praça com fonte, ruas compartilhadas e bairros paroquiais conectados formam a cidade. Lotes em quarteirões curvos permanecem estáveis para o mesmo conjunto de paróquias. A câmera usa zoom de 0,45× a 8.192×; a busca e links diretos apenas enquadram cidades/casas no mesmo mapa. Arrastar, roda, pinça e setas do teclado permitem explorar. Arraste não seleciona textos nem abre cartões ao terminar; as construções continuam clicáveis.

O terreno ilustrado é o padrão. Vias reais do OpenStreetMap podem ser ativadas; tiles são limitados à janela visível. Casas, igrejas e limites dos bairros são cenográficos, sem endereços residenciais ou alegação de limites pastorais reais. O frontend carrega dados de cidades próximas sob demanda e descarta construções fora do enquadramento; o endpoint ainda retorna todos os moradores da cidade, conforme a limitação de escala registrada na auditoria.

As 5.571 sedes vêm de Localidades do Brasil/IBGE (dados 2022, arquivo publicado em novembro de 2025), com fonte e hash. Niquelândia usa longitude −48,460201 e latitude −14,470700. A migração também armazena as coordenadas no PostgreSQL. O catálogo paroquial continua parcial; os totais vigentes estão no início deste README. As igrejas aparecem no mapa mesmo sem casas, respeitando arquivamentos administrativos. Modais nativos têm Escape e foco modal; a busca municipal aceita nomes sem acentos e a participação preserva o município escolhido.

Paróquias são setores da mesma cidade em torno de uma praça compartilhada. A igreja mantém sua natureza e nome; apenas sua construção cresce visualmente em quatro níveis conforme casas ativas: até 7, 8–23, 24–47 e 48 ou mais. Os limites são parâmetros iniciais de produto e não representam status eclesiásticos. Nenhuma progressão de funções ou cargos foi ativada.

Stack atual: Next.js 16, React 19, TypeScript, SVG para o mundo e a arte isométrica, CSS e PostgreSQL 17 com `pg` e a extensão `unaccent`. Three.js, React Three Fiber e Drei foram removidos. A geração das sedes usa SQLite nativo do Node 24 apenas na ferramenta de atualização. Migrações SQL versionadas e verificadas por checksum. Autenticação administrativa local com hash scrypt, sessão aleatória armazenada por digest no banco, cookie HttpOnly e limite de tentativas. Sem cadastro público de administradores.

A identidade web segue a paleta azul-marinho, dourado e marfim da AcutisTech, usa o logo da provedora e o símbolo próprio de Meu Lugar na Igreja. Consulte `docs/BRANDING.md`.

Drizzle, Better Auth e worker/pg-boss eram propostas da arquitetura inicial e foram adiados: não são necessários para este recorte. Dependências e versões resolvidas estão no `package-lock.json`.

## Execução e Docker

Pré-requisitos: Docker Engine/Desktop com Compose. Node 24 é opcional no host, apenas para gerar a configuração; a aplicação roda em containers.

```powershell
node scripts/setup.mjs
docker compose up --build -d
docker compose ps
```

Sem Node no host, gerar a configuração com `docker run --rm -v "${PWD}:/app" -w /app node:24-bookworm-slim node scripts/setup.mjs` no PowerShell. No Linux, usar `"$PWD:/app"` como volume.

O setup cria `.env` com senhas aleatórias e não sobrescreve configuração existente. Acesse [mapa local](http://localhost:3100) e [painel](http://localhost:3100/admin). E-mail e senha iniciais estão em `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`; não compartilhe esse arquivo. O bootstrap preserva a senha de um administrador já criado: editar apenas o `.env` depois não troca a senha existente.

O Compose sobe PostgreSQL sem porta publicada, aguarda saúde, aplica migrações e importa o catálogo IBGE, cria o administrador inicial e inicia o web sem privilégios de root. O banco usa volume persistente. Recriar containers preserva dados; migrar para outro servidor exige transferir/restaurar backup, pois o volume não viaja dentro da imagem.

### Dados de demonstração (opcional)

```powershell
docker compose run --rm migrate node scripts/seed.mjs
```

Cria quatro cidades, cinco cadastros de paróquias/comunidades e 120 casas fictícias, identificadas por `demo_` e “Morador exemplo”. Não confirma existência institucional das paróquias ilustrativas. Não é executado automaticamente no servidor. Rodar novamente preserva os registros existentes, sem duplicá-los. O mapa começa vazio de comunidades até o cadastro pelo painel ou a carga demonstrativa.

### Verificação e desenvolvimento

Após mudanças: `docker compose up --build -d`; conferir banco e web saudáveis antes de testar. Executar checks com `docker compose --profile tools run --build --rm checks` (lint, tipos, testes de lotes/segurança/catálogo e integridade transacional do banco, auditoria de dependências). O build valida também o código TypeScript. Não compartilhar saídas de `docker compose config`, que podem incluir segredos interpolados.

### Dependências externas e servidor

**Dependência externa de mapa:** a vista nacional busca tiles raster do servidor público do OpenStreetMap diretamente no navegador, somente quando a camada está visível. A licença e atribuição ODbL estão ligadas no mapa. O servidor é compartilhado, não oferece SLA e pode bloquear usos intensivos; para produção com tráfego maior, adotar provedor de tiles ou hospedar a infraestrutura. Não foi adicionada biblioteca ou chave de API. O restante (banco, autenticação, geografia municipal e arte) permanece local; pedidos ficam no PostgreSQL, sem e-mail automático nem API Meta.

Para produção, configurar domínio e proxy HTTPS, `COOKIE_SECURE=true` e variáveis próprias do servidor. `APP_BIND=127.0.0.1` mantém a porta acessível apenas localmente; usar proxy na máquina ou uma rede interna de containers. Não publicar PostgreSQL nem reutilizar o `.env` local. Consulte [implantação e backup](docs/OPERACAO.md).

Instagram exigirá conta profissional de campanha, aplicativo Meta e permissões aprovadas conforme o fluxo escolhido. E-mail transacional/armazenamento externo não são necessários neste recorte. Não foram configurados domínio, HTTPS ou deploy remoto.
- [Dados eclesiásticos: fontes, acesso e plano de importação](docs/DADOS-ECLESIASTICOS.md)

### Atualizar o catálogo paroquial

```powershell
docker compose --profile tools run --build --rm catalog
docker compose up --build -d --wait
```

A coleta usa a consulta pública CNBB/CDICBR e as APIs oficiais de São Paulo e Uruaçu, em snapshots versionados. O startup faz a importação transacional sem duplicar registros. As APIs eclesiásticas só são necessárias para atualizar a coleta; o servidor usa os dados locais. Cobertura, exclusões e critérios estão em `docs/DADOS-ECLESIASTICOS.md`.

Na versão 0.15.0, o diretório independente Acervo Católico também alimenta o mapa, conforme autorizado pelo responsável. Foram coletadas 10.302 fichas, das quais 9.930 têm nomenclatura paroquial; 30 destas ainda não têm município resolvido. Só são publicadas referências com município resolvido e sem homonímia ambígua. Novos registros mostram **Fonte de referência · Acervo Católico** e **Diocese em aberto**; correspondências institucionais únicas preservam o cadastro e recebem a fonte adicional. Não há inferência de diocese por proximidade. As exclusões e os totais consolidados estão em `docs/COBERTURA-PAROQUIAL.md`. Não há dependência nova ou serviço pago; a navegação continua usando o PostgreSQL local em Docker.

```powershell
# Atualizar o snapshot de referência; a próxima migração publica as fichas elegíveis
docker compose --profile tools run --build --rm catalog-reference
# Atualizar o mapa e o banco com fontes institucionais e referências elegíveis
docker compose up --build -d --wait
# Regenerar relatório de cobertura e candidatas, sem alterar dados do banco
docker compose run --rm -T --volume "${PWD}/docs:/app/docs" --volume "${PWD}/db/reference:/app/db/reference" migrate node scripts/audit-parish-coverage.mjs
```

Uma minuta para solicitar exportação institucional completa está em `docs/SOLICITACAO-CATALOGO-NACIONAL.md`; não foi enviada.

### Atualizar as sedes municipais

```powershell
docker compose --profile tools run --build --rm geography
docker compose up --build -d --wait
```

A ferramenta baixa o GeoPackage público do IBGE, prioriza capitais, resolve um ponto por código do catálogo e inclui Fernando de Noronha. O snapshot local permite iniciar o servidor sem acessar o IBGE. `scripts/build-municipality-centers.mjs` é uma entrada de compatibilidade para a nova geração de sedes; centroides deixaram de ser usados.



