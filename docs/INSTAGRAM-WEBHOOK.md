# Webhook Instagram — versão 0.21.0

Callback a cadastrar na Meta após publicar esta versão:

`https://meulugarnaigreja.acutistech.com.br/api/webhooks/instagram`

## Configuração no servidor

Na pasta do projeto, configure no `.env` (nunca versionar):

```dotenv
META_WEBHOOK_VERIFY_TOKEN=SEU_VALOR_ALEATORIO
META_APP_SECRET=SEGREDO_DO_APLICATIVO_META
```

Gere o primeiro valor com `openssl rand -hex 32` no servidor e copie exatamente o mesmo para o campo **Verificar token** da Meta. O segundo é o **App Secret** do aplicativo, obtido nas configurações da Meta. Nenhum deles é o token de acesso do Instagram. Não compartilhe o App Secret no chat. O acesso à API de comentários e sua conexão OAuth serão configurados na etapa seguinte.

```sh
docker compose up --build -d --wait
docker compose ps
```

Mantenha a rota HTTPS acessível à Meta, sem login administrativo ou cache do proxy. O GET valida `hub.mode=subscribe` e o verify token, retornando `hub.challenge` em texto. POST verifica HMAC SHA-256 do corpo original com `X-Hub-Signature-256`. Configuração ausente retorna 503; token/assinatura incorretos retornam 403. Limite do corpo: 1 MiB. JSON inválido ou evento de outro objeto retorna 400.

## Registro persistente

A migration `010_instagram_webhook.sql` cria `instagram_webhook_receipts`:

- `id`, `payload_sha256`, `payload` JSONB integral;
- `received_at`, `last_received_at`, `delivery_count`;
- `status` inicial `received`, `processed_at`, `error_code` reservados ao processamento futuro.

Só são armazenados recebimentos com assinatura válida e estrutura mínima Instagram. Segredos, assinatura e headers não são armazenados. A resposta 200 é enviada após confirmar a gravação; falha de banco retorna 503, permitindo reenvio pelo provedor. Um corpo byte a byte idêntico atualiza contador/data, sem recriar a linha ou reiniciar o status. Isso é deduplicação de entrega, não de comentário lógico: o worker futuro precisará identificar comentários repetidos entre payloads diferentes.

Esta versão é uma caixa de entrada persistente. Ainda não cria casas, interpreta cidade/paróquia, conecta OAuth, renova tokens ou processa automaticamente os registros. Não registra autoria de payload sem assinatura como legítima. O recebimento real da Meta só estará demonstrado após configurar o segredo real, publicar o servidor e enviar um evento real. Definir retenção dos payloads e acesso administrativo antes de ampliar o uso; o conteúdo inclui dados de participantes.

Para consultar sem mostrar o conteúdo pessoal completo:

```sh
docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT id,received_at,last_received_at,delivery_count,status FROM instagram_webhook_receipts ORDER BY id DESC LIMIT 20;"'
```

Referência: [Meta Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/). A consulta automatizada à documentação retornou HTTP 429 nesta sessão; o protocolo implementado será validado com o desafio e evento da conta real.

## Banco de produção por SSH

Servidor informado: `129.121.47.3`, usuário SSH `root`, porta SSH `22022`. A chave disponível na máquina de desenvolvimento foi recusada em 25/10/2026; credenciais reais do PostgreSQL e pasta de produção não foram verificadas. Não confundir senha SSH com senha PostgreSQL. O Compose padrão não publica o PostgreSQL.

Após autenticar no servidor e entrar na pasta do projeto, o acesso por terminal não exige expor porta:

```sh
ssh -p 22022 root@129.121.47.3
# cd PASTA_REAL_DO_PROJETO
docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Para DBeaver/pgAdmin, habilite opcionalmente o arquivo adicional, que publica **somente no loopback do servidor**:

```sh
docker compose -f compose.yaml -f compose.db-access.yaml up --build -d --wait
```

Depois, no computador local, mantenha aberto:

```sh
ssh -p 22022 -N -L 15433:127.0.0.1:5433 root@129.121.47.3
```

No cliente PostgreSQL use host `127.0.0.1`, porta `15433`, banco `POSTGRES_DB`, usuário `POSTGRES_USER` e senha `POSTGRES_PASSWORD` da configuração **de produção**. O modelo do projeto usa banco/usuário `paroquia`; isso não confirma os valores do servidor. Os valores podem ser consultados privadamente no `.env` de produção. A senha efetiva do volume não muda automaticamente ao editar `.env`; não redefinir credenciais de um volume existente sem planejar a alteração.

Não use `129.121.47.3:5432` como conexão direta. Se habilitar o arquivo adicional, mantenha-o nos comandos Compose seguintes. A autenticação SSH depende da chave ou senha já cadastrada no servidor; não houve alteração de credenciais nesta tarefa.

## Verificação local

Build e recriação Docker concluídos com db/web saudáveis. Lint, TypeScript, 53 testes e auditoria de dependências aprovados. A persistência e os reenvios foram testados no PostgreSQL dentro de transação revertida; não foram deixados recebimentos sintéticos. Sem os segredos locais, GET/POST responderam 503 como previsto. Não houve autenticação SSH ou implantação em produção, nem teste real da Meta.
