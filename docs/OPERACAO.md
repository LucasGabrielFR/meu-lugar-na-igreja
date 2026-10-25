# Operação da versão 0.17.0

## Serviços e escopo

`db`: PostgreSQL 17 no volume `postgres_data`, sem publicação da porta 5432. `migrate`: tarefa que espera o banco, aplica SQL com checksum e importa municípios; termina com código zero. `web`: build de produção Next.js, usuário sem privilégios, saúde HTTP que verifica conexão com o banco. `checks`: perfil opcional para validações, fora da execução normal.

O mapa nacional consulta tiles `tile.openstreetmap.org` diretamente no navegador quando a camada de vias está ativa. Não existe token, container ou pacote de mapas adicional. A atribuição aponta para os colaboradores e a licença ODbL. A disponibilidade é best-effort, não há SLA; não pré-carregar regiões nem contornar cache. Se o volume crescer ou a dependência for inadequada, configure um provedor de tiles ou opere um servidor próprio antes do lançamento em escala. As requisições de tiles são feitas pelo navegador dos visitantes; inclua essa transferência de dados na informação de privacidade do site.

As posições usam sedes urbanas oficiais de Localidades do Brasil/IBGE, com os 5.571 códigos do catálogo (incluindo Boa Esperança do Norte e Fernando de Noronha). `scripts/build-municipality-seats.mjs` extrai pontos do GeoPackage oficial e registra URL, CRS e hash. O perfil Docker `geography` atualiza o snapshot local; a migração importa as coordenadas e a fonte no PostgreSQL. O mapa ilustrado funciona sem buscar cartografia externa; a camada OSM é opcional.

Solicitações públicas ficam no PostgreSQL e são moderadas pelo painel; aprovação publica cidade, paróquia e casa em uma operação transacional. Não há confirmação de posse do perfil, login de morador, integração Instagram/e-mail, cargos, progressão ou verificação de padres. A alternativa em lista é parte da aplicação, não um serviço externo.

## Primeiro acesso e segredos

Gerar `.env` com `node scripts/setup.mjs` e subir `docker compose up --build -d`. Senhas aleatórias são geradas localmente, sem serem exibidas pelo script. Usar os valores do arquivo no primeiro login. Não há senha padrão versionada nem cadastro público de administradores.

Bootstrap é idempotente e não sobrescreve hashes existentes. Para recuperação administrativa, um operador com acesso ao servidor pode configurar um **novo e-mail** e uma nova senha aleatória no ambiente e executar a tarefa de migração, criando outro administrador. Não usar esse procedimento como gestão de usuários final; não há tela de administração de contas nesta versão. Sessões duram oito horas. Expiração não depende de JavaScript do cliente.

Em produção definir `COOKIE_SECURE=true` com HTTPS. O modo local explicitamente permite cookie HTTP via `COOKIE_SECURE=false`; não usar esse modo no domínio público. Next Server Actions aplica proteção de origem; o proxy deve preservar Host e protocolo corretos. Há limite de tentativas por e-mail e global em janelas de 15 minutos; isso é proteção básica, não substitui controles operacionais do proxy.

## Atualização

Copiar código e configuração do ambiente, construir e recriar com `docker compose up --build -d`. Conferir `docker compose ps` e `docker compose logs --tail 60 migrate web`. `migrate` deve terminar com sucesso; `db` e `web` devem estar saudáveis. Check de prontidão: `GET /api/health` retorna 200 quando o banco responde.

Migrações já aplicadas não devem ser editadas: adicionar outro arquivo SQL numerado. A aplicação não possui migração destrutiva nem remoção definitiva pelo painel. Não executar `docker compose down -v` para atualizar: essa opção remove o volume e pode perder dados.

## Persistência e transferência ao servidor

O Compose cria o banco no servidor. A imagem não inclui os dados de um volume local. Se for preciso levar cadastros existentes, exportar backup, transferir por canal privado e restaurar no banco de destino. Recriação de containers no mesmo host e mesmo projeto mantém o volume; mudar nome do projeto pode criar outro volume vazio.

Exemplo de backup binário que evita redirecionamento binário do PowerShell:

```powershell
New-Item -ItemType Directory -Force backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/paroquia.dump'
docker compose cp db:/tmp/paroquia.dump backups/paroquia.dump
```

Antes de restaurar, identificar e conferir banco-alvo, ter cópia anterior e planejar o procedimento para não sobrescrever dados. Validar o arquivo com `pg_restore --list`; um teste completo de restauração deve usar banco separado e vazio. Não publicar backups: incluem dados e hashes administrativos. Definir retenção e armazenamento fora da máquina do aplicativo antes do lançamento público.

## Regras do mapa implementadas

- Município usa código IBGE; UF e nome oficial vêm do catálogo empacotado. Ativar uma cidade não cria automaticamente suas paróquias.
- Casas usam lotes sequenciais por paróquia, reservados em transação. A distribuição usa setores paroquiais, anéis viários e uma praça compartilhada. Inserir casas preserva lotes existentes no mesmo conjunto de bairros. Alterar o conjunto de paróquias pode redistribuir setores; os slots e vínculos persistem.
- Transferir casa para outra paróquia aloca novo lote nessa paróquia; cadastro da casa mantém o ID e o perfil único, ignorando maiúsculas/minúsculas.
- Paróquias de mesmo nome na mesma cidade e perfis repetidos são rejeitados. Há FK composta entre casa, paróquia e município, impedindo vínculos inconsistentes.
- Cidade arquivada oculta seus registros públicos; paróquia arquivada oculta suas casas. Os registros permanecem editáveis no painel. A própria marca de visibilidade do filho não substitui a visibilidade do pai.
- Posições são cenográficas, sem endereços residenciais. A malha nacional mostra estados reais; igrejas e casas no mapa são ilustrativas.
- Público só lê cadastros visíveis; formulário público pode criar pedidos pendentes, que não são retornados por rotas públicas. As ações administrativas exigem sessão verificada no servidor e são auditadas.
- Pedido de participação não é retornado pelo mapa nem por rotas públicas enquanto pendente/arquivado. A aprovação exige consentimento registrado, publica apenas o nome e o perfil escolhidos e cria vínculos territoriais consistentes.
- A camada OSM mantém atribuição visível e solicita tiles apenas para a área observada, com detalhe progressivo e limite de 64 tiles por janela. Não há prefetch de regiões ou uso offline.
- Uma aeronave ilustrativa percorre uma rota simples na vista distante; movimento reduzido oculta a animação. Não há consulta de dados de voo.

## Limites conhecidos

A câmera Brasil/cidade é contínua e não depende de WebGL. Casas e igrejas são desenhadas no mesmo SVG, com carregamento por cidade e descarte de construções fora da área visível. O endpoint municipal ainda entrega todas as casas do município; cidades com milhares de moradores precisarão de carregamento em blocos e orçamento de renderização. Não foram comprovadas metas de FPS nem desempenho em dispositivos físicos.

Ainda não há fusão administrativa de paróquias, aliases revisáveis, transferência de paróquia entre cidades, edição de terrenos ou busca global de todos os moradores. Consulte [auditoria e prioridades](AUDITORIA-2026-10-24.md).

Nenhum vínculo sacerdotal ou função comum é coletado nesta versão. Pedidos podem ser enviados pelo site e aguardam publicação manual; comentário do Instagram não é importado automaticamente e o formulário não comprova que o solicitante controla o perfil informado.

## Origem dos dados

Malhas: `https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF`.

Municípios: `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome`. Consulta em 23/10/2026: 5.571 registros, guardados em formato reduzido (código, nome e UF). Revisar alterações do catálogo por migração/controladamente; atualizar geografia não deve alterar lotes virtuais existentes.

## Atualização nacional de paróquias

Execute `docker compose --profile tools run --build --rm catalog-national` e depois `docker compose up --build -d --wait`. O painel Catálogo oficial mostra cobertura, fontes e datas. A carga é parcial e cria bairros vazios; não cria casas nem valida padres. Arquivamentos são preservados. Veja [dados eclesiásticos](DADOS-ECLESIASTICOS.md).

## Serviços da versão 0.13.0

- catalog-national consulta todas as circunscrições CNBB e retoma checkpoints recentes em .cache/.
- catalog-regional atualiza os diretórios oficiais complementares.
- catalog-expansion atualiza Florianópolis, Rio Branco, Aracaju e Cuiabá, com cache de 24 horas; use `node scripts/fetch-diocesan-expansion.mjs --refresh` como comando do serviço para forçar atualização.
- catalog-reference atualiza o snapshot nacional em `db/reference/`. A próxima migração publica referências paroquiais elegíveis, identificando sua origem e deixando a diocese em aberto. Cache de páginas permite retomar uma coleta interrompida. Homônimas, capelas e municípios não resolvidos ficam para revisão no relatório.
- highways atualiza a malha IBGE BC250 e seus arquivos regionais. Use --refresh no coletor para ignorar checkpoints.
- Após atualizar snapshots, use docker compose up --build -d --wait.

O mapa usa fontes locais para rodovias, municípios e paróquias. Nenhum serviço de rotas ou API paga é necessário. A limpeza das casas foi executada uma única vez com backup; não é repetida por migrações. Não execute scripts/reset-map-to-catalog.mjs em uma base com moradores sem nova autorização expressa.

Na versão 0.17.0, a camada opcional de limite municipal consulta `servicodados.ibge.gov.br` por HTTPS. Liberar acesso de saída para esse host no servidor se quiser essa camada. A rota valida o código contra o catálogo IBGE local, usa timeout de 12 segundos e cache de 24 horas; o navegador também recebe cache público de um dia. Em falha, o contorno virtual permanece e a interface informa a indisponibilidade da malha real. Não é necessário configurar credenciais nem novos containers. O cache pode ser renovado após reconstruções; não é um backup de cartografia.

