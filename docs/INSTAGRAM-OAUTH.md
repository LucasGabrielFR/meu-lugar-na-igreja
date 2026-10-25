# Conexão Instagram no admin — 0.22.0

## Configurar no servidor

Use o **ID do aplicativo Instagram** e o **segredo do aplicativo Instagram** mostrados na configuração de Instagram Login. Não use o ID do perfil, nem suponha que sejam iguais ao ID/segredo do aplicativo principal Meta usado no webhook.

```dotenv
APP_URL=https://meulugarnaigreja.acutistech.com.br
INSTAGRAM_APP_ID=ID_DO_APLICATIVO_INSTAGRAM
INSTAGRAM_APP_SECRET=SEGREDO_DO_APLICATIVO_INSTAGRAM
INSTAGRAM_TOKEN_ENCRYPTION_KEY=CHAVE_HEXADECIMAL_DE_64_CARACTERES
INSTAGRAM_API_VERSION=v26.0
```

Gere a chave uma vez com `openssl rand -hex 32`; preserve-a no servidor e no procedimento privado de restauração. Ela cifra os tokens no PostgreSQL com AES-256-GCM. Perder/trocar a chave sem migrar as credenciais exige reconectar a conta. Não usar o token de acesso como chave e não compartilhar os segredos no chat/Git/vault.

No campo **URL de redirecionamento** da configuração de login da empresa no Instagram, cadastre exatamente:

```text
https://meulugarnaigreja.acutistech.com.br/api/instagram/callback
```

Essa URL é diferente do webhook `/api/webhooks/instagram`. `META_WEBHOOK_VERIFY_TOKEN` e `META_APP_SECRET` existentes continuam preservados. O novo fluxo não altera a assinatura do webhook nem usa o antigo `INSTAGRAM_ACCESS_TOKEN` manual.

Recrie o Docker na pasta do projeto, mantendo os arquivos Compose que já utiliza:

```sh
docker compose up --build -d --wait
# Se utiliza o override de acesso ao banco:
docker compose -f compose.yaml -f compose.db-access.yaml up --build -d --wait
```

## Uso e demonstração à Meta

1. Entre por `/admin`, abra **Instagram** e confira a URL de redirecionamento exibida. Se faltarem variáveis, o botão fica desabilitado e mostra orientação.
2. Clique **Conectar Instagram**, autentique uma conta profissional no provedor e conceda as permissões solicitadas: `instagram_business_basic` e `instagram_business_manage_comments`.
3. Após o retorno, a aplicação consulta a API e exibe nome de usuário, identificador, nome/tipo quando disponíveis, validade do acesso e data da consulta. O perfil vem do provedor, não de um @ digitado.
4. **Atualizar dados da conta** consulta o perfil novamente e atualiza seu nome; não renova o token. **Reconectar ou trocar conta** repete OAuth e só substitui a conta existente após concluir o novo fluxo. Uma conta conectada por vez, conforme o escopo inicial do projeto.
5. **Desconectar do painel** apaga a credencial local e invalida autorizações pendentes. Isso não revoga permissões na Meta, não desativa o webhook já configurado e não apaga os recebimentos. Para revogar no provedor, remova o app em Apps e sites no Instagram.

Na gravação para análise, mostre a navegação no admin, autorização real e a conta exibida após o retorno. Use um ambiente de homologação com dados de demonstração e credenciais temporárias da aplicação para o avaliador, nunca senha do Instagram. Permissões/acesso e disponibilidade para contas externas à equipe continuam sujeitos à configuração e análise da Meta. Não declarar fluxo real demonstrado antes de executá-lo com as credenciais do app.

## Persistência e segurança

Migration012: `instagram_oauth_states` guarda hash do state, administrador/sessão, validade de dez minutos e consumo; `instagram_connections` mantém um perfil e seu token cifrado. State aleatório também fica em cookie HttpOnly/SameSite=Lax, vinculado à sessão administrativa. Callback exige sessão e state correto, não expirado e de uso único. Cancelamento não substitui a conexão anterior; URLs de retorno vêm da configuração do servidor. Query strings de callback podem conter código: não registrá-las no proxy/analytics. Respostas não expõem tokens ou erros brutos da Meta.

A troca de código ocorre no servidor, seguida da troca por token de longa duração e leitura do perfil em `/me`. A validade é a retornada pela Meta, sem assumir uma data fixa. O botão de atualização não é um agendador de renovação; renovação automática, revogação remota integrada, assinatura de campanhas e criação de casas continuam fora desta entrega. A expiração é mostrada no admin; tokens revogados são detectados ao atualizar/reconectar.

Os registros de state não contêm códigos ou tokens. Planejar limpeza de estados antigos conforme retenção operacional; não executar exclusões amplas sobre dados de participantes. Backup do banco sozinho não basta para recuperar os tokens sem a chave de cifra.

## Verificação

Após Docker saudável, executar os checks do projeto. Os testes novos usam respostas simuladas da Meta e transações revertidas no PostgreSQL: URL/scopes, criptografia/adulteração, troca de código, sanitização de erros, vínculo à sessão/admin, expiração, repetição e armazenamento de uma conta. Eles não comprovam autorização de uma conta externa ou aprovação da Meta. Testar também o callback sem configuração/sessão, acesso ao painel e preservação dos links legais/ausência de admin público.

Fontes oficiais de configuração: [Business Login for Instagram](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/) e [Instagram Login no workspace Meta](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login). A leitura automatizada da página developers.facebook.com encontrou HTTP429 nesta sessão; o aceite final com o provedor depende da publicação e das credenciais reais. Nenhum segredo do app foi copiado para esta documentação.

### Resultado local em 25/10/2026

Docker reconstruído/recriado e saudável; migration012 aplicada. Os58testes passaram, TypeScript e auditoria aprovados, lint sem erros (dois warnings anteriores dos componentes legais). Interface autenticada conferida no navegador, com botão desabilitado sem configuração. HTTP confirmou páginas legais, ausência de atalho admin público e callback503 sem configuração. Em container isolado com configuração fictícia, callback sem sessão retornou303 para resultado session, apagou cookie state e não consultou a Meta. Nenhuma credencial fictícia foi persistida no servidor principal; testes de banco usam rollback. OAuthreal e gravação de revisão ainda dependem de credenciais/configuração e publicação pelo responsável.
