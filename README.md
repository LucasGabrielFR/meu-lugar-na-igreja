# Meu Lugar na Igreja

Produto da **AcutisTech**, com uma base executável de mapa e administração. Um mapa contínuo ilustrado com cidades em arte isométrica, organizado por municípios e paróquias brasileiras. A integração com comentários do Instagram será uma etapa posterior.

## Direção confirmada

- Um único mapa 2D contínuo: igrejas, bairros e casas aparecem ao aproximar, com arte isométrica própria.
- Participações de todo o Brasil desde o início.
- Uma cidade pode ter várias paróquias; cada morador tem uma casa e uma paróquia principal na proposta inicial.
- Cada paróquia tem um pároco e pode ter vários vigários. Cadastros ainda incompletos podem aguardar a identificação do pároco.
- **Somente a função de padre exige verificação humana.** Funções paroquiais e cargos civis são escolhidos no site, com desbloqueios por pontuação configurável.
- Uma pessoa pode acumular funções paroquiais e civis. Esses títulos não concedem acesso administrativo.

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

## Escopo da versão 0.10.0

Mapa contínuo do Brasil com cidades ilustradas, bairros paroquiais, igrejas, casas selecionáveis e links diretos. Uma aeronave ilustrativa na visão distante não representa tráfego real. O formulário em `/participar` registra município, paróquia, nome público, perfil e consentimento; pedidos permanecem privados até a revisão no painel. Aprovar cria ou reativa os vínculos e publica a casa numa transação. O painel também mantém os cadastros e a trilha de auditoria.

Funções e progressões permanecem documentadas e **adiadas por decisão do responsável**. Não foram implementadas. Verificação de padres, login de moradores e integração com Instagram também não fazem parte desta entrega. O formulário não exige conta; apenas pedidos aprovados e autorizados se tornam públicos. Informar um perfil não comprova controle da conta.

A abertura usa a logo do projeto. O mapa mantém uma única câmera durante a aproximação, sem carregar outra cena. A cidade é ancorada na sede urbana oficial do IBGE; novas casas ampliam a ocupação e o porte do município. Uma praça com fonte, ruas compartilhadas e bairros paroquiais conectados formam a cidade. Lotes em quarteirões curvos permanecem estáveis para o mesmo conjunto de paróquias. A câmera usa zoom de 0,45× a 8.192×; a busca e links diretos apenas enquadram cidades/casas no mesmo mapa. Arrastar, roda, pinça e setas do teclado permitem explorar. Arraste não seleciona textos nem abre cartões ao terminar; as construções continuam clicáveis.

O terreno ilustrado é o padrão. Vias reais do OpenStreetMap podem ser ativadas; tiles são limitados à janela visível. Casas, igrejas e limites dos bairros são cenográficos, sem endereços residenciais ou alegação de limites pastorais reais. O frontend carrega dados de cidades próximas sob demanda e descarta construções fora do enquadramento; o endpoint ainda retorna todos os moradores da cidade, conforme a limitação de escala registrada na auditoria.

As 5.571 sedes vêm de Localidades do Brasil/IBGE (dados 2022, arquivo publicado em novembro de 2025), com fonte e hash. Niquelândia usa longitude −48,460201 e latitude −14,470700. A migração também armazena as coordenadas no PostgreSQL. O catálogo paroquial continua parcial: 346 paróquias em 28 municípios, duas circunscrições. Elas aparecem na participação e no Catálogo oficial do painel. Modais nativos têm Escape e foco modal; a busca municipal aceita nomes sem acentos e a participação preserva o município escolhido.

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

A coleta usa as APIs oficiais de São Paulo e Uruaçu e salva um snapshot versionado. O startup faz a importação transacional sem duplicar registros. As APIs eclesiásticas só são necessárias para atualizar a coleta; o servidor usa os dados locais. Cobertura, exclusões e critérios estão em `docs/DADOS-ECLESIASTICOS.md`.

### Atualizar as sedes municipais

```powershell
docker compose --profile tools run --build --rm geography
docker compose up --build -d --wait
```

A ferramenta baixa o GeoPackage público do IBGE, prioriza capitais, resolve um ponto por código do catálogo e inclui Fernando de Noronha. O snapshot local permite iniciar o servidor sem acessar o IBGE. `scripts/build-municipality-centers.mjs` é uma entrada de compatibilidade para a nova geração de sedes; centroides deixaram de ser usados.
