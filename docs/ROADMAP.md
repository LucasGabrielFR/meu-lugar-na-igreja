> Atualização 0.10.0: o mapa agora é contínuo e ilustrado, com arte isométrica SVG, sedes oficiais e bairros conectados. A cena 3D separada foi substituída. Próximas prioridades e achados atuais estão em [Auditoria de 24/10/2026](AUDITORIA-2026-10-24.md).

# Entregas e critérios de aceite

Planejamento de produto; não há implementação concluída. A abertura é nacional. Dados de teste podem se concentrar em Niquelândia sem limitar o lançamento a essa cidade.

> Revisão de escopo 0.4.0: mapa, painel e entrada pública moderada já existem no Docker local. Funções e progressões foram adiadas pelo responsável e devem ser retomadas posteriormente, sem bloquear o mapa. O roteiro abaixo representa a visão completa, não uma lista de funcionalidades já entregues. O estado atual está descrito no README e em OPERACAO.md.

## 0. Provas técnicas e definições

- Validar conta profissional de campanha, fluxo de acesso Meta, comentários disponíveis, identidade retornada, webhooks, limites e necessidade de revisão/permissões para produção.
- Medir cena 3D própria em celular e desktop, com blocos de casas e mais de uma igreja.
- Importar catálogo oficial de municípios e testar homônimos por UF, incluindo Brasília/DF.
- Fechar visibilidade e adesão, política para menores, regra de uma casa principal, primeiro catálogo e origem dos pontos.
- Confirmar orçamento, equipe, hospedagem e estratégia de licença antes de estimar calendário ou custo de produção.

Aceite: evidências registradas e stack com versões compatíveis escolhidas; limitações Meta documentadas. Se Meta não estiver disponível, entrega seguinte continua por entrada manual/formulário, sem anunciar captura automática pronta.

## 1. Fundação Docker, cadastro e painel

Aplicação, worker, PostgreSQL, migrações, autenticação e acesso administrativo. Cadastro nacional, paróquias/aliases, pessoas/casas, catálogo de grupos/funções e registro de pontos. Entrada manual com a mesma lógica prevista para a integração.

Aceite parcial implementado: imagens reconstruídas e containers saudáveis; pedido autorizado fica pendente e privado; administrador aprova ou arquiva; aprovação publica a casa e cria cidade/paróquia quando necessário. Persistência usa volume PostgreSQL. Ainda faltam conta do morador e comprovação de posse do perfil.

## 2. Experiência pública 3D nacional

Brasil → estado → município → paróquia/casa; busca, lote persistente, várias igrejas, visual próprio e link direto da casa. Lista acessível como alternativa ao 3D. Confirmação de participação/visibilidade integrada à publicação.

Aceite: dados nacionais pesquisáveis, casa aberta por link, novas casas não deslocam antigas, retirada some das consultas públicas e blocos carregam conforme navegação. Medir a meta provisória de 30 FPS no aparelho e cenário definidos; não validar apenas em desktop potente.

Revisão visual 0.7.0: mapa nacional 2D superior e cidade isométrica com câmera fixa; cada município permanece uma única cidade e divide suas comunidades em setores. Porte da igreja é apenas construção visual, em quatro níveis derivados das casas ativas.

## 3. Padres e funções configuráveis

Fila de padres com evidência/decisão, um pároco ativo e múltiplos vigários. Trilhas, seleção de funções desbloqueadas, avanço automático opcional, títulos civis e histórico de pontuação. Catálogo editável sem deploy.

Aceite: padre indicado não aparece confirmado; prova de controle do perfil sozinha não conclui análise sacerdotal; pontos nunca concedem padre; troca de pároco preserva histórico e impede dois atuais. Pessoa escolhe função comum imediatamente, acumula cargo civil e função paroquial, atinge patamar e recebe opção/avanço segundo sua preferência. Uma missão repetida pontua uma única vez. Alterar regra permite simular efeito antes de publicá-la.

## 4. Automação Instagram

Conectar campanha, persistir eventos, validar assinatura, processar em fila, corrigir ambiguidades, reconciliar quando permitido, tratar expiração de tokens e reprocessar falhas. A confirmação de publicação e de identidade permanece conforme o fluxo definido.

Aceite: comentário real autorizado percorre a integração; reenvio do mesmo evento não cria outra casa/ponto; comentário editado não troca vínculo silenciosamente; cidade ambígua não é escolhida ao acaso; evento inválido não altera dados; falha de token aparece no painel. Credenciais e permissões de produção demonstradas antes da liberação pública automatizada.

## 5. Preparação do lançamento

Testes de carga, uso em celular, autorização, abuso, remoção, restauração de backup e acompanhamento da fila. Métricas mínimas: tempo até a casa aparecer, erros de ingestão, backlog de padres, duplicidades e desempenho por cena. Não registrar religião identificável em analytics de terceiros por padrão.

Aceite: reconstrução/recriação e saúde Docker, testes das jornadas críticas, restauração demonstrada, procedimentos de suporte e capacidade de atendimento definidos. Lançamento aceita o Brasil inteiro; cenas são carregadas por cidade e o processamento segue a capacidade observada.

## Fora da primeira versão

Direção de veículos, chat, multiplayer sincronizado, marketplace, moeda paga, eleições exclusivas e geração individual de arte por IA. Casas e igrejas começam com conjunto pequeno de modelos reutilizáveis. Esses itens não são necessários para validar a comunidade, o mapa e a progressão.

## Decisões ainda abertas

- Definir domínio público e revisar a aplicação da identidade da AcutisTech nos canais de lançamento.
- Pontuações e patamares finais; valores documentados são propostas.
- Quais funções são livres e quais dependem de pontos; padrão de avanço opcional proposto.
- Títulos civis exclusivos ou compartilhados; proposta inicial compartilhada.
- Conta de campanha, experiência da equipe, orçamento e infraestrutura disponível.
- Fluxo exato de prova de controle dos perfis pessoais e política para menores.

Essas decisões não impedem o planejamento, mas devem ser fechadas antes das partes de implementação que dependem delas.
