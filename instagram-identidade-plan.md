# Participação e identidade pelo Instagram

Planejamento de 25/10/2026. Responsável confirmou @meu_lugar_na_igreja como único perfil de campanha inicialmente e dispensou comprovação adicional: basta comentário do próprio participante com cidade e paróquia. Tipo profissional da conta ainda não confirmado. Não há integração ou cadastro de app realizado nesta etapa.

## Regra central

Uma casa por identidade de perfil Instagram reconhecida pela API no escopo da integração. O comentário identifica a conta autora para a experiência; não é verificação de identidade civil, pessoa única ou vínculo religioso. O autor retornado pela Meta determina a origem; um @ mencionado no texto nunca cria casa para outra pessoa. Sem código de comprovação, login do morador ou coleta de documentos nesta etapa. Manter nome/perfil quando a foto não estiver disponível oficialmente.

## Entregas e aceites, em ordem

1. **Preparar a conta e o app.** Confirmar @ profissional Empresa/Criador, administrador e domínio. Criar app AcutisTech com Instagram API with Instagram Login. Aceite: conta autorizada identificada pelo ID retornado pela Meta, sem senha do Instagram armazenada no produto.
2. **Provar a API antes de definir identidade.** Conectar uma conta controlada, listar uma publicação própria, ler comentários paginados e receber evento real. Aceite: evidência dos campos de autor/escopo, assinatura e permissões, incluindo comentário de conta pessoal fora da equipe quando o acesso permitir. Ausência de identificador estável impede verificação automática; nunca substituir por @ digitado.
3. **Definir participação e publicação.** Campanhas explícitas, município/UF e paróquia obrigatórios; correspondência única com cadastro/aliases. Aceite: repetição não gera outra casa; casos ambíguos vão para correção. Confirmar autorização de exibição e regras na campanha; integrar ao fluxo existente sem mudar a publicação antes dessa definição.
4. **Associar a casa ao autor automaticamente.** Persistir o identificador e escopo retornados pela Meta, username observado, publicação e comentário de origem. Aceite: repetir comentário/evento não cria nova casa, mudança de username não cria nova identidade quando o ID permanece igual e menção a terceiro não troca autoria. Ausência de autoria suficiente fica pendente técnico. Alterações e retirada serão atendidas pela equipe nesta etapa; não liberar edição pública apenas digitando um @.
5. **Implementar conexão, fila e painel em Docker.** Webhook persiste o evento antes de responder; worker usa fila PostgreSQL, retentativas e deduplicação. Aceite: assinatura inválida rejeitada, falha recuperável, token revogado sinalizado, app/campanha desconectados não processam novas ações. Sem Redis obrigatório.
6. **Validar e liberar gradualmente.** Rebuild/recriação Docker antes dos testes. Lint, tipos, testes das jornadas e eventos reais; demonstrar comentários de terceiros e condições de acesso/revisão da Meta. Aceite: uma casa por identidade conhecida, controle verificado sem aceitar menções, falhas observáveis e dados removíveis conforme a regra definida.

## Dependências e limites

- Externas: app/conta/permissões Meta e callback HTTPS público (domínio de homologação ou túnel temporário). Docker continua com web, PostgreSQL e futuro worker. Tokens e secrets somente no backend; nunca no repositório, navegador ou Second Brain.
- Perfil confirmado: @meu_lugar_na_igreja. Conectar perfis de outras paróquias é expansão separada. IDs podem ter escopos distintos: não unir automaticamente IDs de comentário, mensagens e OAuth, nem presumir identidade global entre contas/apps.
- Permissões iniciais propostas: `instagram_business_basic` e `instagram_business_manage_comments`. Mensagens exigem capacidade/permissão própria se essa alternativa for escolhida. Não solicitar publicação de conteúdo apenas para ler comentários.
- Login Instagram é conexão do administrador da campanha, não login genérico para moradores com contas pessoais. Exigências de acesso avançado, revisão e verificação empresarial devem ser confirmadas no app real; não prometer produção com base apenas em testes da equipe.
- Extração determinística por município/UF e aliases antes de IA. IA, se adotada posteriormente, apenas sugere candidatos; nunca decide identidade ou inventa paróquia.

## Fontes e grau de confirmação

- [Workspace oficial da Meta](https://www.postman.com/meta/instagram/overview) e [Instagram Login](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login): confirmam conta profissional, ausência de necessidade de Página Facebook nesse caminho e nomes das permissões.
- [Coleção oficial](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-3fe78620-2258-44b6-893f-42d76c7200d7): distingue login Facebook/Instagram e requisitos de mensagens. Não misturar fluxos.
- Referências para configuração: [criar app](https://developers.facebook.com/docs/instagram-platform/create-an-instagram-app/), [webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks/), [moderação de comentários](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/comment-moderation/). A leitura automatizada dessas páginas foi limitada por HTTP 429/indisponibilidade. Campos precisos do payload, níveis de acesso e telas atuais dependem de confirmação no dashboard e prova real; nenhum endpoint autenticado foi testado nesta pesquisa.

## Entrega parcial 0.21.0

Receptor GET/POST e caixa de entrada PostgreSQL implementados em 25/10/2026. Configuração e banco por SSH em docs/INSTAGRAM-WEBHOOK.md. OAuth, eventos reais de produção e processamento em casas continuam pendentes.
