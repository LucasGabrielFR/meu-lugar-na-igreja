# Comentários reais não chegam — diagnóstico 0.22.1

Testes do painel Meta com autor `test` e conta receptora `0` comprovam o caminho do evento sintético, não a assinatura efetiva/visibilidade dos comentários reais. A tabela vazia sozinha não distingue ausência de entrega de rejeição antes da gravação.

## 1. Observar o receptor

Após publicar 0.22.1 e recriar a aplicação, execute no servidor:

```sh
docker compose logs --since 10m --timestamps -f web
```

Faça um novo comentário na publicação da conta conectada e observe:

- `instagram_webhook_received`: a gravação foi confirmada; confira `receipt_id` no mesmo banco de produção.
- `instagram_webhook_rejected` com `invalid_signature`: houve chamada, mas a assinatura não corresponde ao segredo usado pelo receptor ou não foi fornecida. Confira aplicativo de origem/segredo e proxy. Não desabilite a validação.
- `missing_app_secret`: a variável não chegou ao container. Recriar depois de corrigir `.env`.
- `invalid_event_shape`, `invalid_json`, `body_read_failed`, `body_too_large`: a chamada foi rejeitada antes de gravar, com motivo explícito.
- `instagram_webhook_persistence_failed`: chamada validada, falha no banco; a resposta503 permite nova tentativa do provedor.
- Nenhuma linha: o processo não observou chamada nesse intervalo; investigar entrega Meta e logs de acesso do proxy. Não conclua apenas com isso que o app precisa de uma permissão específica.

Os novos logs não incluem texto, perfil, payload, assinatura, código OAuth, tokens ou segredos. Não foi adicionada uma tabela de chamadas não autenticadas: elas continuam sem gravar na caixa de entrada.

## 2. Consultar a API e a assinatura da conta

No servidor, na pasta do projeto com o ambiente em execução:

```sh
docker compose --profile tools run --rm --build --no-deps instagram-diagnostics
```

Se utiliza overrides Compose, informe-os também nesse comando. O serviço não publica portas e usa PostgreSQL em modo somente leitura. Prioriza o token OAuth cifrado no banco; se não houver conexão, pode usar `INSTAGRAM_ACCESS_TOKEN` definido privadamente no `.env`. Nunca use a senha do Instagram nesse campo. A chave de cifra é necessária para ler o token OAuth existente.

O relatório mostra a conta efetivamente autorizada, apps/campos retornados por `subscribed_apps`, permissões quando esse endpoint estiver acessível, link da última publicação retornada e quantidade amostral de comentários consultáveis (até5). Não mostra tokens, mensagens de erro brutas ou conteúdo de comentários, nem segue URLs de paginação contendo credenciais. Não altera subscriptions, permissões, publicações ou banco.

Interpretação:

- `no_access_token`: conectar via admin ou configurar o token manual no servidor. O token do webhook é outra variável.
- `missing_encryption_key`/`cannot_decrypt_token`/`stored_token_expired`: corrigir configuração ou reconectar; não imprimir o token para investigar.
- Conta diferente de `meu_lugar_na_igreja`: verificar qual conta autorizou o app.
- Consulta de subscriptions bem-sucedida e lista sem `comments`: investigar assinatura da conta no aplicativo correto. Os IDs podem distinguir app principal e produto Instagram; compare no painel antes de concluir divergência.
- Erro da API: o relatório exibe apenas status/código/subcódigo. Uma consulta de permissões não suportada ou recusada não prova, sozinha, ausência de permissão. Não confundir um erro de consulta com lista vazia.
- Comentários consultáveis mas sem entregas: investigar assinatura, modo/publicação e restrições de acesso da configuração Meta, além do proxy. Consultar o último post não comprova chegada em outro post.

## Limite da conclusão

A versão0.22.1 melhora observação e coleta evidência; não presume nem corrige automaticamente o motivo externo da ausência de notificações. É necessário executar os comandos em produção e correlacionar com comentário real. O status publicado/acesso avançado deve ser conferido no app concreto, sem alegar que testes locais ou exemplos do dashboard comprovam o fluxo público.

## Validação local

Docker reconstruído/recriado e saudável.61testes aprovados, TypeScript/auditoria aprovados e lint sem erros (dois warnings preexistentes nos componentes legais). POSTlocal sem segredo respondeu503 e registrou missing_app_secret; nenhum recebimento sintético criado. Perfil Docker executado localmente em somenteleitura retornou no_access_token, conforme ausência de credencial local. Resultados da API nos testes são simulados; não comprovam configuração/assinatura da conta em produção. Próximo passo depende da execução dos comandos pelo responsável no servidor.
