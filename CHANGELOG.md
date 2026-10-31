# Changelog

Todas as mudanças relevantes serão registradas neste arquivo, seguindo [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

## [0.29.2] - 2026-10-29

### Fixed
- **Rigging Unificado da Cabeça (Fim das Deformações Faciais)**:
  - Unificação de todos os componentes faciais (olhos, pupilas, brilhos, sobrancelhas, bochechas, nariz e boca), além de cabelos e coroa, como filhos diretos da hierarquia `head`.
  - Elimina completamente o deslocamento das feições em relação ao crânio quando o personagem reverencia ou olha para o céu.
- **Cinemática de Braços Anti-Colisão (Gestos Frontais sem Penetração na Cabeça)**:
  - Reconfiguração da física de movimentação dos braços para agir no espaço livre **à frente do corpo** (`rotation.x` negativo para o ar livre):
    - **Comemoração (`cheer`)**: Braços projetados para a frente e erguidos em "V" triunfante no espaço aberto, com os ombros afastados lateralmente (`x = ±2.38`), evitando qualquer invasão na cabeça.
    - **Louvor (`praise`)**: Mãos estendidas à frente na altura do peito/ombros, ondulando juntas suavemente em louvor ritmado sem colidir com as têmporas ou bochechas.
- **Postura de Oração Ajoelhada Autêntica e Ereta (Ajoelhado sem Sentar)**:
  - Segmentação anatômica das pernas em duas juntas: articulação do quadril (coxa) e articulação do joelho (canela e sapato).
  - Ao orar (`pray`), os joelhos descem ao solo, as coxas permanecem verticais e eretas e apenas as canelas dobram 90° para trás rente ao chão, com as vestes caindo solenemente sobre as pernas, mantendo o fiel de joelhos diante do altar com postura nobre e sem parecer sentado nos calcanhares.

### Added
- **Governança de Desenvolvimento EGM (Elephant-Goldfish Model com Consulta Prévia)**:
  - Criação da regra de desenvolvimento `.agents/rules/egm-development-flow.md` e atualização do `AGENTS.md` definindo o protocolo de consulta prévia ao desenvolvedor.
  - O agente avalia a complexidade: diante de uma funcionalidade de médio/grande porte ou alteração arquitetural, pergunta expressamente ao usuário se deseja utilizar o ciclo EGM (Elephant & Goldfish) ou o processo de desenvolvimento direto tradicional.
  - Trilho EGM acionado sob demanda com ciclo estruturado (`/egm-brainstorm` -> `/egm-draft` -> `/egm-review` multi-lente com subagentes Goldfish de contexto zero -> aprovação).
  - Trilho direto ágil preservado para correções pontuais de bugs, fixes cosméticos, ou quando o usuário optar por não utilizar o Elefante.


## [0.29.1] - 2026-10-29

### Added
- **Sobrepeliz do Cerimoniário de Alta Paramentaria (Estilo São Pedro Paramentaria)**:
  - Modelagem fiel baseada na referência de alfaiataria sacra: sobrepeliz em linho branco luminoso com pregas clássicas verticais (frente e verso).
  - Remoção completa do círculo/medalhão do peito, deixando o torso limpo e solene conforme a paramentaria autêntica.
  - Barrado inferior de renda branca barroca rica com acantos e flores, trazendo o **Monograma Mariano Coroado em Ouro Litúrgico** repetido em intervalos simétricos, finalizado por bainha branca dobrada com debrum dourado.
  - Mangas amplas em sino com a mesma faixa bordada e bainha contrastante.
- **Cinemática Estável e Indestrutível dos Emotes**:
  - **Orar de Joelhos (`pray` / Atalho `E`)**: O fiel ajoelha-se com solenidade no solo (`playerGroup.position.y = -2.2`), pernas repousadas ao longo do solo para trás, tronco ereto e mãos postas no peito em oração sem qualquer torção de juntas.
  - **Comemorar (`cheer` / Atalho `C`)**: Salto jubiloso com os dois braços estendidos retos para cima em "V" de glória e vitória (eliminando qualquer dobra para trás da cabeça).
  - **Louvor (`praise` / Atalho `G`)**: Mãos erguidas ao alto balançando suavemente em uníssono de um lado para o outro acompanhando o louvor comunitário.

## [0.29.0] - 2026-10-29

### Added
- **Integração de IA Generativa de Vídeo (Image-to-Video via fal.ai)**:
  - Adicionado módulo `@fal-ai/client` e motor de animação generativa (`src/lib/fal-video.mjs`), permitindo à IA receber qualquer imagem (print do mapa, foto de igreja ou render do personagem) e imaginar movimentação viva, cinematográfica e orgânica.
  - Suporte aos principais modelos de ponta do mercado com seletor no painel:
    - **Kling 1.6 Standard** (Kuaishou via fal.ai - US$ 0,042/segundo, ~US$ 0,21 por cena): excelente retenção da arte 3D/voxel sem hiper-realismo distorcido e física corporal perfeita de caminhada e gestos.
    - **Kling 1.6 Pro** (US$ 0,07/segundo, ~US$ 0,35 por cena): resolução de cinema 1080p.
    - **MiniMax Hailuo Video-01** (~US$ 0,28 por clipe de 6s): dinamismo e câmera acelerada.
    - **Wan 2.1 I2V** (Alibaba - ~US$ 0,15 por clipe): modelo open-source leve e altamente estilizado.
  - Novo endpoint `POST /api/generate-ai-video`: realiza o upload do asset para a CDN de alta velocidade do Fal, processa a fila de inferência em nuvem, baixa automaticamente o arquivo MP4 para `out/clips/fal-*.mp4` e injeta diretamente na cena correspondente da timeline.
  - Interface do painel de estúdio aprimorada: cada cena agora possui um bloco dourado dedicado para animação por IA, permitindo ajustar o modelo, a duração (5s a 6s) e o prompt de imaginação visual com prompts sugeridos automaticamente pela IA.
  - **Painel de Controle e Histórico de Gastos em Dólar (USD Ledger)**:
    - Implementado ledger persistente em `out/costs-ledger.json` com rotas `GET /api/costs`, `POST /api/costs/add` e `POST /api/costs/reset`.
    - Badge em tempo real no cabeçalho superior do estúdio exibindo o total gasto em dólares, conversão estimada em reais (`R$`) e contador de gerações.
    - Modal interativo de transparência financeira permitindo conferir o detalhamento histórico por modelo/cena, registrar recargas ou despesas manuais e zerar o saldo.
    - Contabilização automática do custo por inferência (Kling 1.6 Standard US$ 0,042/s, Pro US$ 0,070/s, MiniMax US$ 0,28 e Wan 2.1 US$ 0,030/s).

### Fixed
- **Correção da Troca de Abas e Eliminação de SyntaxError (`switchTab`)**:
  - Corrigida a quebra de linha dentro da string de alerta no template do servidor que impedia o JavaScript do cliente de compilar no navegador, restabelecendo a alternância instantânea entre as abas *Assistente IA & Banco* e *Meu Roteiro Personalizado*.

## [0.28.9] - 2026-10-29

### Added
- **Redefinição Completa dos Trajes e Vestimentas por Papel em 3D (`walk-3d-scene.tsx`)**:
  - **Leigo**: Colarinho clerical removido completamente. Traje social elegante com camisa, gola refinada, calça e cinto de couro escuro com fivela metálica.
  - **Coroinha**: Túnica vermelha litúrgica até os pés e sobrepeliz rendada branca em camadas cobrindo o corpo até a altura das pernas com gola quadrada.
  - **Acólito**: Túnica branca pura e cíngulo cinza amarrado na cintura com laço e franjas pendentes à esquerda.
  - **Cerimoniário**: Túnica preta tradicional com sobrepeliz rendada branca sobreposta.
  - **Ministro da Eucaristia**: Jaleco branco com botões pretos em destaque e logotipo bordado da Santa Eucaristia no peito esquerdo (cálice dourado e hóstia sagrada com cruz dourada).
  - **Sacristão**: Traje executivo escuro com cinto de serviço e molho de chaves litúrgicas douradas penduradas na cintura.
  - **Prefeito, Governador e Presidente**: Terno executivo e gravata sob a faixa solene oficial (eliminada qualquer clérgima ou gola de padre).
  - **Padre**: Batina preta completa até os pés com abotoamento central tradicional visível, clérgima branca no pescoço e estola sacerdotal branca de duas pontas com cruzes douradas bordadas.
- **Novas Mecânicas e Físicas de Animação de Emote**:
  - **Oração (`pray`)**: Palmas unidas à frente do peito com rotações anatômicas precisas dos braços, cabeça curvada reverentemente e respiração suave de contemplação.
  - **Comemoração (`cheer`)**: O personagem pula alegremente com física de elevação nos eixos Y, braços erguidos em louvor e ação de graças, e cabeça voltada para o céu e para a torre da Igreja Matriz.
  - Movimentação suave das vestes e batinas (tecido balançando com a física do passo).
- **Botão `Passear` e Enquadramento da Cidade Atual no Mapa**:
  - Renomeado o botão de navegação principal da barra superior de `Bonequinho` para `Passear`, com ícone de pegadas (`Footprints`).
  - O modo de caminhada 3D agora abre diretamente nas ruas e paróquias da cidade que o fiel estiver visualizando no mapa (seja selecionada, focada na busca/breadcrumb, ou centralizada pelo zoom/pan da câmera).
- **Sistema de Viagem Espacial e Terrestre (`✈️ viajar`) entre Municípios**:
  - Adicionado botão `✈️ viajar` no HUD superior direito (e atalho de teclado `V`), permitindo ao usuário navegar e selecionar qualquer um dos 5.570 municípios brasileiros para caminhar em 3D.
  - Modal com busca instantânea por município ou estado (IBGE), grade de atalhos para santuários e capitais religiosas (Aparecida/SP, Niquelândia/GO, Rio de Janeiro/RJ, Salvador/BA, Brasília/DF, etc.), transição cinematográfica de voo e aterrissagem em frente à Igreja Matriz.
- **Gravação Automática de Animação 3D do Boneco Andando (`/api/record-walk`)**:
  - Implementado sistema de captura sequencial em 30 FPS diretamente do canvas WebGL do Three.js em modo passear (`Walk3DScene`).
  - O personagem caminha pelas ruas da paróquia movimentando alternadamente pernas e braços com física fluida, enquanto a câmera de terceira pessoa realiza órbitas panorâmicas suaves ao redor do fiel revelando a Igreja Matriz, calçadas coloniais e casas do bairro.
  - O motor codifica o clipe em MP4 nativo (H.264/yuv420p) e integra na timeline da cena (`scene.videoClipUrl`), permitindo pré-visualização instantânea no painel local.
- **Suporte a Fundos em Vídeo Animado no Remotion (`<OffthreadVideo />`)**:
  - A composição audiovisual (`video-composition.tsx`) agora suporta tanto imagens estáticas com efeitos de câmera quanto clipes de vídeo dinâmicos em alta taxa de quadros via `OffthreadVideo`.
  - Gradientes cinematográficos superiores e inferiores sobrepostos para garantir contraste perfeito das legendas dinâmicas estilo CapCut e do badge de topo.
- **Modo Vídeo Limpo & Parâmetros de URL Cinematográficos (`clean=1`, `walk=1`, `autowalk=1`)**:
  - `clean=1`: oculta automaticamente qualquer barra, botão, drawer de chat ou HUD sobreposto, entregando uma gravação 100% limpa e com enquadramento de cinema.
  - `walk=1`: inicializa diretamente a cena 3D do município desejado.
- **Captura do Mapa em Resolução Retina 4K (`deviceScaleFactor: 2`)**:
  - Resolução das capturas do mapa do Brasil ampliada para 2160x3840 pixels, eliminando qualquer pixelização ou borrão durante zooms e pans de câmera.
- **Vídeo Oficial de Lançamento da Plataforma**:
  - Produzido vídeo de 4 cenas pronto para postagem no Instagram Reels e TikTok: Gancho do mapa vazio, chamada para ser o Fundador da cidade com clipe do boneco andando em 3D, exploração do bairro e gamificação com novo clipe 3D dinâmico, e CTA vibrante com a marca `@meulugarnaigreja`.



### Removed
- **Opção de Sobrevoo na Barra Superior**:
  - Removido o botão de sobrevoo automático da topbar, simplificando a navegação e eliminando a confusão de movimentação involuntária de câmera no mapa.

### Fixed
- **Continuidade do Modo 3D ao Viajar entre Cidades**:
  - Corrigido o fluxo de viagem em `explorer.tsx`: a chamada para `focusCity` foi desacoplada de `onTravel` (evitando fechar o modal com `setModal(null)`).
  - Ao selecionar Brasília ou qualquer cidade, o usuário agora permanece 100% no modo Passear 3D, com o Three.js recriando o cenário e a praça matriz no novo destino imediatamente.
- **Quadro de Missões Lateral Colapsável (Drawer)**:
  - O quadro foi acoplado à lateral esquerda da tela com deslizamento suave (`drawer-open` e `drawer-collapsed`).
  - Adicionada uma alça lateral suspensa persistente (`missions-drawer-tab`), visível na margem esquerda mesmo quando o quadro está recolhido, permitindo expandir e recolher instantaneamente com 1 clique.
  - Eliminação definitiva das linhas de varredura/zebra no texto `10 MISSÕES DO DIA`: substituídas as camadas sobrepostas de `text-shadow` por `-webkit-text-stroke: 1.5px #102738` e `paint-order: stroke fill`, resultando em tipografia de jogo nítida e cristalina.
  - Centralização absoluta do botão de fechar (`X`) no canto superior direito do cabeçalho.
  - Resolução do problema de rolagem (scroll): definidos `min-height: 0`, `flex: 1 1 auto` e `touch-action: pan-y` na área de rolagem, além de isolamento do evento `onWheel` para permitir rolar todas as missões suavemente sem disparar o zoom do mapa ao fundo.

### Changed
- **Validação Automática de Missões pelo Sistema (Sem Checkboxes Manuais)**:
  - As missões agora são verificadas e homologadas exclusivamente pelo sistema através de eventos reais, impedindo marcação manual pelo usuário.
  - Identificação automática do morador ativo: ao pesquisar seu `@` na barra superior ou clicar em sua residência, o sistema carrega o perfil, calcula as missões concluídas e realiza o **Check-in Diário de Oração automaticamente** (creditando +10 XP e atualizando o streak de oração).
  - Consulta assíncrona ao banco (`getUserMissionsStatusAction`): checagem de check-in no dia, intenções cadastradas, voto presidencial na semana, amigos indicados com casa construída, indicação de padre e paróquia com pároco confirmado.
  - Indicadores de status visuais: `✓ Concluído` para missões validadas pelo sistema e botões de atalho/ação direta (`Passear em 3D`, `Ver Matriz`, etc.) para tarefas pendentes.

## [0.28.7] - 2026-10-29

### Added
- **Roteiro Livre com Divisão Inteligente em Cenas pela IA (`/api/custom-script`)**:
  - Nova aba no estúdio permitindo escrever ou colar qualquer texto ou roteiro autoral de divulgação.
  - A IA analisa o conteúdo, preserva integralmente a fala e intenção do usuário, e divide em 3 a 5 cenas harmoniosas atribuindo efeitos de câmera (`zoom-in`, `zoom-out`, `pan-left`, etc.) e títulos de alto impacto.
- **Personalização Visual Completa por Cena (Fotos Locais e Efeitos de Câmera)**:
  - Suporte a upload direto de fotos e imagens do computador (`/api/upload-image`) para qualquer cena, permitindo mesclar fotos de paróquias, santuários e eventos com as capturas automáticas do mapa.
  - Controle individual de efeito de câmera por cena: *Zoom In (Aproximação)*, *Zoom Out (Revelação)*, *Pan Esquerda*, *Pan Direita*, *Pulso Suave* e *Estático*.
- **Configuração Completa de Identidade da Marca (Branding & Instagram)**:
  - Campo customizável para `@` do Instagram (ex: `@meulugarnaigreja`), exibido no badge superior do vídeo e na chamada final.
  - Botão de ação (CTA) e subtexto totalmente editáveis no painel.
- **Timeline Interativa de Cenas & Re-síntese Instantânea de Voz**:
  - Cada cena possui card próprio para edição de títulos, narração, troca de fotos e exclusão/adição de novas cenas.
  - Botão *"🎙️ Atualizar Voz Neural"* (`/api/resynthesize-voice`): permite alterar as falas e regerar a locução e legendas em poucos segundos sem recriar todo o projeto.

### Fixed
- **Sincronia Exata das Legendas (Eliminação Definitiva do Atraso)**:
  - Identificada e corrigida a causa raiz da latência: as legendas eram distribuídas sobre a duração inflada da cena (`sceneDurationMs` com pausas de respiro) em vez do tempo de fala real.
  - O cálculo métrico agora restringe o tempo disponível (`availableMs`) estritamente à duração medida pelo `ffprobe` da voz gerada (`actualVoiceDuration`), iniciando em 45ms.
  - Implementado slider interativo de ajuste fino de sincronia (`-400ms` a `+400ms`), permitindo calibrar o acendimento das palavras em tempo real.
- **Correção no Upload de Fotos e Prevenção de Falha de Header no Node 24**:
  - Corrigido o erro `ERR_HTTP_INVALID_HEADER_VALUE` causado pelo cabeçalho `Content-Disposition: undefined` no Node.js 24 ao servir arquivos estáticos de upload (`/out/uploads/*`).
  - Atualizado o fluxo no cliente para exibir imediatamente o Data URI em memória, garantindo pré-visualização instantânea e renderização no Remotion sem falhas de rede.

## [0.28.6] - 2026-10-29

### Added
- **Sistema Completo de Gamificação, Hierarquia Eclesiástica e Governança Cívica**:
  - **Progressão de Níveis e Papéis Litúrgicos**:
    - Níveis 1–4: Leigo da Paróquia.
    - Níveis 5–9: Coroinha (vestes vermelhas e sobrepeliz branca).
    - Níveis 10–19: Acólito (túnica e círio).
    - Níveis 20–24: Cerimoniário (túnica preta com sobrepeliz e missal).
    - Níveis 25–29: Ministro Extraordinário da Sagrada Comunhão (fita dourada/medalhão).
    - Níveis 30+: Sacristão da Igreja (reservado aos 5 maiores pontuadores da cidade com nível 30+, guardião das chaves da matriz).
  - **Mecânicas de Fé e Ganho de XP Balanceadas**:
    - Check-in diário com bônus de consistência: +10 XP diário e bônus semanal de 7 dias consecutivos (+35 XP).
    - Intenção de oração paroquial: +10 XP diário e registro no mural da paróquia.
    - Voto democrático semanal para Presidente da República: +25 XP durante a janela eleitoral (sexta a domingo).
    - Indicação de amigos (@amigo): +15 XP no comentário do Instagram e +100 XP quando o amigo cria sua residência no mapa.
    - Indicação e Homologação de Párocos (@padre): +15 XP ao citar o pároco e +500 XP de bonificação sagrada quando a cúria aprova o padre.
  - **Progressão Visual de Casas e Sobreposição por Mandato Cívico**:
    - 5 Estágios Residenciais: *Casinha da Vila* (Níveis 1–4), *Casa Colonial* (Níveis 5–14), *Sobrado Paroquial* (Níveis 15–24), *Solar da Fé* (Níveis 25–29) e *Palacete do Sacristão* (Níveis 30+).
    - Sobreposição de Cargos Cívicos:
      - **Prefeito**: Palacete Municipal com colunas, frontão cívico e bandeira municipal.
      - **Governador**: Palácio dos Governadores com pórtico nobre duplo e bandeira estadual.
      - **Presidente da República**: Palácio Presidencial da República com cúpula palaciana, espelho d'água e bandeira do Brasil hasteada.
      - **Criador**: Castelo do Criador com muralha de pedra, torres duplas com telhado cônico de ouro puro e Grande Coroa Real.
  - **Presença Canônica do Pároco e Matriz Iluminada**:
    - O Padre não ocupa lote residencial civil; ele reside e preside a Matriz/Igreja.
    - A Paróquia com pároco aprovado ganha upgrade visual eclesiástico: Cruz Dourada Reluzente com aura celestial, estola pastoral, sinos solenes e bônus passivo de +10% XP a todos os moradores da paróquia.
  - **Governança Democrática Semanal em Cascata**:
    - Presidente da República eleito democraticamente pelo voto popular semanal;
    - Presidente nomeia os Governadores Estaduais; Governador nomeia os Prefeitos Municipais.
    - Poderes dos Cargos: Prefeito define mensagem acolhedora e ativa a Festa do Padroeiro (ruas enfeitadas com bandeirolas); Governador elege a cidade turística/religiosa do estado e emite decretos; Presidente submete propostas oficiais de novas funcionalidades e expansões para o jogo.
  - **Interface Interativa do Fiel e Painel Administrativo**:
    - `ResidentGamificationCard`: menu expansível integrado ao painel do morador com abas de Nível/XP, Ações de Fé, Gabinete Governamental e Indicação de Pároco.
    - Novas visões administrativas no `/admin`: Gestão de Propostas Presidenciais (`view=proposals`), Verificação da Cúria / Aprovação de Padres (`view=priests`) e botão de Apuração Eleitoral Semanal em cascata.

## [0.28.5] - 2026-10-29

### Fixed
- **Eliminação Definitiva de Palavras Coladas e Sobreposição nas Legendas CapCut**:
  - **Prevenção de Colisão por Escala Horizontal**: Substituído o alargamento excessivo (`scale(1.16)` horizontal) por salto vertical dinâmico (`translateY(-6px) scale(1.08)`), mantendo o impacto do pop/bounce estilo Alex Hormozi sem que a caixa visual da palavra extrapole e invada o espaço da palavra vizinha.
  - **Espaçamento e Margens Flexbox Ampliados**: Implementado `columnGap: 26px` (e `32px` em formato horizontal) associado a `whiteSpace: 'nowrap'` e `padding: '0 4px'`, garantindo um canal livre e nítido de separação entre todas as palavras da sentença.
  - **Agrupamento Inteligente de Palavras em Vertical**: Ajustada a lógica de blocos para limitar estritamente a 1 ou 2 palavras caso haja termos longos (acima de 11 caracteres somados), permitindo 3 palavras apenas quando forem conectivos ultra-curtos (ex: `NO MAPA DA`).
  - **Sanitização de Pontuação e Números no Backend**: Adicionada separação forçada com espaço via regex para pontuações coladas em letras (`[.!?…,:;]`) e numerais adjacentes a palavras (`5paróquias` -> `5 paróquias`), além de eliminação de parênteses residuais.

## [0.28.4] - 2026-10-29

### Added
- **Legendas Dinâmicas Estilo CapCut / Viral sem Palavras Coladas**:
  - Novo sistema de blocos curtos e estáveis (2 a 3 palavras por tela) em vez de janela deslizante contínua, eliminando palavras coladas e saltos visuais incômodos.
  - Sanitização de texto e nomes eclesiásticos: remoção automática de parênteses vindos do cadastro de bairros (ex: `Paróquia São Francisco de Assis`), separação de vírgulas e normalização de traços.
  - Ponderação métrica de tempo por quantidade de letras de cada palavra: palavras curtas duram proporcionalmente menos e palavras longas têm tempo estendido para sincronização perfeita com a locução.
  - Tipografia de alto impacto: fonte em caixa alta ultra-bold, contorno preto duplo pesado e salto elástico em amarelo dourado vibrante (`#FFE600`) na palavra ativa.
- **Multiplexação Garantida de Áudio via FFmpeg no MP4 Final**:
  - Pós-processamento automático do MP4 com multiplexação direta da faixa de áudio neural gerada, assegurando áudio nítido a 192 kbps sem dependência de dispositivos virtuais de som do Chromium headless.
  - Implementação de `calculateMetadata` no `<Composition>` do Remotion, estendendo a duração em frames de forma 100% dinâmica conforme o tempo real do áudio sintetizado.
  - Retentativas com backoff exponencial no Edge-TTS para prevenir e contornar erros 429 de forma transparente.
  - Unmute explícito com volume a 100% no reprodutor de vídeo do painel web.

## [0.28.3] - 2026-10-29

### Fixed
- **Eliminação do Reset do Bonequinho ao Interagir com Chat ou Ações**:
  - Desacoplado integralmente o ciclo de vida da cena Three.js das mudanças de estado da interface React (`chatOpen`, digitação no campo de mensagem `inputMessage`, lista de mensagens e ações de emote `pray`/`cheer`).
  - Utilização de `useRef` para ações e saída, `useMemo` para configurações do personagem e efeito reativo leve para troca de vestimenta *in-place* sem desmontar o canvas nem reiniciar a posição do jogador.
  - Blindagem do listener de teclado para não capturar `WASD` quando o jogador estiver digitando em caixas de entrada ou textarea do chat.
- **Desobstrução do Caminho e Visão da Igreja**:
  - A placa da paróquia foi reposicionada na lateral do adro (`x = 16, z = 32`), inclinada elegantemente em direção ao caminho de pedras.
  - O ponto de spawn foi ajustado para a entrada do adro (`z = targetDistrict.y + 44`), eliminando o bug em que o bonequinho nascia colado dentro da placa e com a visão da igreja bloqueada.

### Changed
- **Harmonização Fidedigna dos Elementos 3D com o Mapa 2D (`town-art.tsx`)**:
  - **Igrejas e Santuários**: Paredes em estuque creme colonial (`#f8edce`), telhado cerâmico colonial em terracota pura (`#ae7452`), adro escalonado em pedra arenito (`#dfd4b2` e `#eae1bf`), torre sineira com campanário (`#b38d4e`) e cruz de bronze (`#765a30`), portal em ardósia/madeira (`#687f83`) e óculo dourado (`#d2b057`). O Santuário do Criador e todas as matrizes agora compartilham com precisão essa arquitetura canônica e colonial.
  - **Castelo do Criador 3D**: Pátio nobre de pedra (`#dfcea7`), paredes em pedra nobre clara (`#fdfbf7`), torres circulares duplas com telhados cônicos de ouro puro (`#ffd700`) e cruzes douradas, portal em arco gótico escuro e a Grande Coroa Real encimada por pedras preciosas.
  - **Casas dos Moradores**: Base de jardim verde (`#8eae78`), corpo na cor do fiel, telhados cerâmicos coloniais (`#ad7054`, `#6e8392`, `#bb975e`, `#806d83`), porta colonial e janelas iluminadas (`#fff1b4`).
  - **Praça Central**: Calçadão de pedra arenito (`#ece1be`), chafariz em pedra (`#d0b98a`), piscina azul-turquesa (`#70aaa8`), jato d'água cristalino (`#c5dfe1`) e bancos coloniais (`#97774f`).
  - **Ruas e Calçadas**: Asfalto ardósia (`#89948b`), meio-fio/calçada (`#d9d8bd`) e faixa tracejada (`#eee7d2`).
  - **Ilha do Criador**: Praia de areia dourada (`#f6d585`) e oceano azul (`#2d6a8f`).


### Added
- **Design Expressivo e Rosto Voxel no Modo 3D (`Walk3DScene`)**:
  - Modelagem facial completa com olhos estilizados (esclera branca, íris escura e brilho especular), sobrancelhas, nariz, sorriso alegre e bochechas coradas (blush).
  - Adicionadas mãos com tom de pele nas pontas dos braços e sapatos escuros nos pés.
  - Cabelos estruturados com volume tridimensional frontal, superior e posterior para ambos os gêneros.
- **Renderização de Todas as Igrejas e Paróquias do Município em 3D**:
  - O modo 3D agora renderiza **todas as paróquias da cidade** (`layout.districts`) em suas posições oficiais do plano diretor (`d.x`, `d.y`), com adro pavimentado, nave, telhado cerâmico, torre sineira, cruz dourada iluminada e placa frontal com o nome oficial da paróquia.
- **Praça Central com Chafariz Monumental em 3D**:
  - Para municípios com múltiplos distritos, a praça central (`layout.plaza`) é renderizada com piso circular de pedra, chafariz de mármore de 3 níveis com água azul-turquesa cristalina, jato d'água central, bancos de parque de madeira/ferro e placa comemorativa da praça.
- **Castelo do Criador em 3D**:
  - No lote do criador, em vez de uma casa simples, é construído o Castelo do Criador com muralhas, torres cilíndricas duplas, espirais douradas e a grande coroa real.
- **Controle de Câmera por Teclado e Spawn Focalizado**:
  - Teclas de seta (`ArrowLeft` / `ArrowRight` / `ArrowUp` / `ArrowDown`) giram a câmera e ajustam o ângulo vertical, complementando o arraste do mouse.
  - O bonequinho surge posicionado em frente à paróquia que estava selecionada no mapa (`targetParishId`).

### Fixed
- **Orientação de Movimento do Personagem**:
  - Corrigido o cálculo trigonométrico da direção de marcha: ao pressionar `W`, o personagem agora vira e caminha para a frente na direção do movimento (não mais de costas para onde vai). Ao recuar (`S`), vira para a frente da câmera, exibindo o rosto.


### Added
- **Voz Neural Integrada via Microsoft Edge-TTS em `pt-BR`**:
  - Adicionada geração de voz realista e de alta fidelidade sem necessidade de chave de API paga (`node-edge-tts`).
  - Suporte a 3 perfis de locução: *AcutisTech Institucional* (`pt-BR-AntonioNeural`), *Francisca Calorosa* (`pt-BR-FranciscaNeural`) e *Jovem Dinâmica* (`pt-BR-ThalitaNeural`).
  - Cálculo dinâmico da duração de locução com `ffprobe`, estendendo automaticamente a duração das cenas para acomodar a fala com folga de 0.9s.
  - Mixagem e concatenação do áudio em MP3 via FFmpeg, incorporado diretamente na composição do Remotion como URI `data:audio/mp3;base64,...` para renderização 100% offline e sem falhas de carregamento HTTP.
- **Roteiro Eclesiástico Hiperlocal com Dados Reais**:
  - Consulta profunda ao PostgreSQL extraindo Diocese/Arquidiocese canônica (`ecclesiastical_jurisdictions`) e amostragem dos nomes reais das paróquias locais ativas da cidade.
  - Reformulação completa do prompt de IA e fallback em 4 atos emocionais católicos (Gancho -> Zoom/Diocese -> Paróquias e Comunidade -> Chamada Devocional).
- **Efeitos Visuais e Dinâmica de Câmera no Remotion**:
  - Aumento da luminosidade e vivacidade da captura do mapa de 0.38 para 0.86 (1.15 saturação) com gradientes suaves superior (24%) e inferior (42%).
  - Zoom e transição cinemática progressiva do mapa (escala de 1.15 até 1.62 com deslocamento vertical focado na cidade).
  - Marcador de Igreja (`ChurchPinMarker`) com gradiente dourado, ícone ⛪, sombra projetada e ondas concêntricas de radar expandindo sobre a cidade.
  - Carrossel de paróquias (`ParishPillsList`) com badges em glassmorphism translúcido entrando com animação staggered de mola elástica (`spring`).
- **Isolamento de Dependências Nativas no Docker**:
  - Configuração de volume nomeado `video_studio_node_modules` no `compose.yaml` e arquivo `.dockerignore` dedicado em `video-studio/`, garantindo preservação integral dos binários Linux (`@rspack/binding-linux-x64-gnu`) sem conflito com o host Windows.

## [0.28.0] - 2026-10-29

### Added
- **Ilha do Criador no Oceano Atlântico Sul (Código 4399999)**:
  - Território insular privativo situado nas águas do oceano ao sul do Rio Grande do Sul (`lat -35.2, lon -51.8`).
  - Totalmente desvinculado de rankings paroquiais ou de contagem municipal para não competir com fiéis nem constar como fundador de municípios.
  - A casa de Lucas (@lucasgfr26) foi movida para a Ilha com o Santuário do Criador, liberando Niquelândia-GO com 0 casas.
- **Castelo do Criador e Base Insular em Arte SVG (`town-art.tsx`)**:
  - Base insular no oceano com ondas concêntricas, praia com areia dourada e relevo verdejante.
  - O antigo modelo de casa simples para o criador foi substituído pelo **Castelo do Criador**: construção de pedra nobre com escadaria, duas torres laterais com telhados cônicos de ouro puro encimados por cruzes, pórtico em arco gótico, vitrais iluminados e a Grande Coroa Real com rubi e safiras no pináculo central.
- **Emblema da Ilha no Mapa Macro (`world-map.tsx`)**:
  - Ícone especial de ilha dourada com coroa visível no oceano mesmo em zooms distantes.

### Fixed
- **Desbloqueio do Modo Passeio 3D (`WalkMode`)**:
  - Corrigida a condição de abertura de diálogos em `explorer.tsx`: a tag `<MapDialog>` estava abrindo por cima da cena 3D com o cabeçalho vazio *"A comunidade"*, bloqueando a tela e fechando o passeio ao clicar em qualquer ponto. Corrigido para ignorar o modal quando `modal === 'walk'`.
  - Migration `015_creator_and_levels.sql`: adicionadas as colunas `level` (default 1) e `role` (default 'leigo') às tabelas `houses` e `participant_profiles`.
  - Cadastro e vinculação oficial do perfil do criador `@lucasgfr26` com **Nível 99**, papel `'criador'`, cor dourada `#ffd700`, pontuação máxima (99.999 XP e Pontos) e casa estabelecida na **Paróquia Nossa Senhora da Abadia** em **Niquelândia - GO** (código IBGE `5214606`).
  - **Papel e Visual 3D no Modo Passeio (`WalkMode`)**:
    - Adicionado o papel `'criador'` na lista de papéis (`ROLES`) com o rótulo *"Criador · Nível 99"* 👑 e descrição de prestígio.
    - Modelagem 3D customizada com coroa real dourada com gema de rubi sobre a cabeça e vestes imperiais (manto azul royal com estola e colarinho dourados).
    - Seleção automática e padrão do papel de Criador ao entrar no modo 3D com a conta `@lucasgfr26`.
  - **Identidade e Destaque Visual no Mapa 2D e Painéis**:
    - Renderização customizada da casa do criador em SVG (`HouseArt` em `town-art.tsx`), com coroa dourada suspensa sobre a construção e telhado de ouro.
    - Tag de nome no mapa destacada com coroa dourada: `👑 @lucasgfr26`.
    - Painel lateral de detalhes com kicker dourado *"👑 CRIADOR DA PLATAFORMA · NÍVEL 99"*, insígnia especial e link direto para o Instagram do criador.
    - Preservação perpétua das permissões e do papel de criador no processador assíncrono de comentários do Instagram (`instagram-comment-processor.mjs`).

## [0.27.2] - 2026-10-29

### Added
- **Captura Automática de Tela do Mapa Apontando para o Docker (`video-studio/src/lib/capture-map.mjs`)**:
  - Resolução automática do frontend do mapa na rede Docker interna (`http://web:3000/?cidade=<código>`) ou no host local (`http://127.0.0.1:3100`).
  - Captura headless via Puppeteer em resolução nativa (1080x1920 para Reels ou 1920x1080 para YouTube), aguardando renderização completa da malha vetorial SVG.
  - Inserção da imagem capturada em base64 como plano de fundo animado (efeito Ken Burns) nas cenas de destaque e estatísticas.
- **Exportação Direta em MP4 via Remotion CLI e FFmpeg**:
  - Endpoint `POST /api/render` para compilação e codificação direta de arquivos `.mp4` em H.264.
  - Pré-visualização com player de vídeo HTML5 e link direto de download no painel local (`http://localhost:3200`).
- **Dockerfile e Suporte a Chromium/FFmpeg no Container (`video-studio/Dockerfile`)**:
  - Configuração de build conteinerizado com Chromium, FFmpeg e pacote nativo `@rspack/binding-linux-x64-gnu`.
  - Flags seguras de execução headless (`--no-sandbox`, `--disable-dev-shm-usage`).

## [0.27.1] - 2026-10-29

### Fixed
- **Garantia de slots únicos ao migrar fiéis**: Ajustada a atualização em lote de moradores durante a unificação para gerar novos slots sequenciais sem conflito de chave única (`houses_parish_id_slot_key`).

### Changed
- **Curadoria Instantânea de Duplicações (`view=duplicates`)**:
  - Implementada atualização otimista na interface: ao clicar em manter uma paróquia, a outra é apagada na hora e o card desaparece imediatamente da tela, sem recarregamento ou espera.
  - Se a paróquia apagada constava em outros pares da mesma cidade (triplicatas ou múltiplas variações), esses registros são automaticamente descartados da lista em tempo real.
  - Novos rótulos claros nos botões: *"Manter esta (Apagar Opção B)"* e *"Manter esta (Apagar Opção A)"*, indicando expressamente a exclusão permanente do ID descartado.
  - Barra de progresso visual exibindo a quantidade acumulada de paróquias já eliminadas permanentemente do banco e a porcentagem total de higienização concluída.
  - Filtro em tempo real por UF (pills de estados) e busca instantânea sem requisição de página inteira.

## [0.27.0] - 2026-10-29

### Added

- **Estúdio Local Independente de Vídeos e Narração (`video-studio/`)**:
  - Ferramenta local baseada em Remotion e VoiceStudio (`debpalash/VoiceStudio`) para criação, edição e renderização de vídeos de divulgação (Reels 9:16 e YouTube 16:9).
  - Painel web visual independente e sem login servido localmente em `http://localhost:3200`.
  - Serviço Docker isolado sob perfil `studio` no `compose.yaml` (`video-studio` mapeado em `127.0.0.1:3200`), garantindo que não suba nem seja exposto em produção.
  - Isolada da aplicação web e adicionada ao `.gitignore`, `.dockerignore`, `tsconfig.json` e `eslint.config.mjs`, garantindo que o servidor de produção e a imagem Docker permaneçam ultraleves, sem consumo desnecessário de CPU, memória ou pacotes pesados de renderização.
  - Suporte ao Remotion Studio local (`npm run preview`) para edição visual frame a frame e exportação direta de MP4 via CLI (`npm run render`).
  - Roteirizador por IA via script CLI (`node scripts/generate.mjs`), legendas dinâmicas em karaokê (`@remotion/captions`) e cliente de voz com perfis e fallback sincronizado.


### Added

- **Curadoria Ativa de Duplicações de Paróquias no Painel Admin (`view=duplicates`)**:
  - Detecção automática de paróquias com nomes similares ou grafias variantes dentro do mesmo município via similaridade trigram (`pg_trgm`) e normalização eclesial (remoção de prefixos litúrgicos e sufixos de fontes divergentes).
  - Alerta em destaque na Visão Geral do Admin (`view=overview`) indicando a quantidade de possíveis duplicações detectadas para revisão imediata.
  - Tela de curadoria comparativa (`AdminDuplicates`) permitindo unificar em 1 clique: *"Manter Paróquia A e Mesclar B"* ou *"Manter Paróquia B e Mesclar A"*, transferindo automaticamente todos os moradores, casas e solicitações e excluindo a duplicata sem deixar orfãos.
  - Ação de descarte *"São paróquias diferentes (Ignorar alerta)"*, persistida na tabela `parish_duplicate_ignores` (migration `014_parish_curation.sql`).
- **Gestão Avançada de Paróquias (`view=parishes` / `AdminParishes`)**:
  - Filtro por **Estado (UF)** (todas as 27 UFs do Brasil) e por **Município**.
  - Campo de busca textual por nome da paróquia.
  - Cadastro de nova paróquia com busca em tempo real entre todos os 5.570 municípios do IBGE (`MunicipalityInput name="city_code"`).
- **Exclusão Segura com Salvaguarda Inteligente de Moradores**:
  - Se a paróquia **não possui casas**, a exclusão é imediata com confirmação.
  - Se a paróquia **possui moradores cadastrados**, o sistema bloqueia a exclusão direta e exibe aviso inteligente solicitando a escolha da paróquia de destino no mesmo município para onde os fiéis devem ser migrados atomicamente antes de concluir a remoção.
- **Cache Otimizado em Memória (`src/lib/admin-curation.ts`)**:
  - Consulta de duplicações memoizada com TTL de 60s e invalidação reativa em qualquer alteração, criação, exclusão ou mesclagem (`invalidateDuplicateCache()`).

### Changed

- Reestruturado o módulo de paróquias do painel administrativo para acomodar filtros combinados por UF e Cidade.
- Adicionada migration `014_parish_curation.sql` com a extensão `pg_trgm` e a tabela `parish_duplicate_ignores`.
- Atualizado `MunicipalityInput` para suportar propriedade customizável `name` (padrão `'code'`, aceitando `'city_code'`).

## [0.25.0] - 2026-10-29

### Added

- **Modo Passear no Mapa em 3D ("Bonequinho")**: navegação em terceira pessoa pelas ruas, praças, casas e Igreja Matriz do bairro paroquial utilizando Three.js (`src/components/walk-3d-scene.tsx` e `src/components/walk-mode.tsx`).
- **Personagens Masculino e Feminino** com trajes comportados e dignos, adaptados a cada papel eclesial e civil da comunidade:
  - *Leigo* (traje cotidiano composto masculino e feminino);
  - *Coroinha* (túnica vermelha e sobrepeliz branca);
  - *Acólito* (túnica branca pura e cruz peitoral);
  - *Cerimoniário* (veste litúrgica com faixa dourada);
  - *Ministro da Eucaristia* (veste branca e fita ministerial);
  - *Sacristão* (veste sóbria e chave paroquial dourada);
  - *Prefeito* (terno institucional e faixa municipal);
  - *Governador* (terno institucional e faixa estadual);
  - *Presidente* (terno escuro e faixa presidencial verde e amarela do Brasil);
  - *Pároco / Padre* (batina preta e colarinho clerical romano).
- **Controles e HUD em 3D** inspirados no estilo *Domine com seu time*:
  - Movimentação com `W A S D` ou setas do teclado;
  - Rotação da câmera em terceira pessoa via arraste do mouse ou teclado;
  - Corrida com `Shift`;
  - Ações e gestos devocionais / louvor: `🙏 Orar (E)`, `🎉 Comemorar (C)`, `📣 Louvor (G)`;
  - Barra superior de navegação com botão de saída (`✕ Sair` ou tecla `Esc`), identificação da cidade/UF e paróquia, e contador de fiéis presentes no bairro;
  - Seletor rápido de gênero e menu com os 10 papéis da comunidade;
  - Painel de chat local do bairro ("Chat da Paróquia") preparado para expansão em chat global multi-usuário.
- **Botões de acesso no mapa**: botão `🧍 Bonequinho` adicionado na barra de navegação superior e botão `Passear pelas ruas em 3D (Bonequinho)` no modal de detalhes da cidade (`modal === 'details'`).
- **Pré-aquecimento do motor 3D**: `warmWalkAssets()` executado em segundo plano durante tempo ocioso (`requestIdleCallback`) para garantir abertura imediata do modo 3D sem qualquer congelamento na tela.

### Changed

- Renomeado o botão de passeio de câmera automática para `🧭 Sobrevoo` para distinguir com clareza da nova experiência de caminhar com o personagem pelas ruas.
- Atualizada a suíte de tipos e dependências (`package.json`) incluindo Three.js (`three` e `@types/three`).


### Fixed

- **Adequação de cidades litorâneas ao território em terra:** as paróquias, igrejas, ruas e o contorno virtual de cidades costeiras (como Recife, Olinda, Jaboatão dos Guararapes, Rio de Janeiro, Salvador, Natal, Santos, Fortaleza, etc.) não ficam mais sobre a água ou no mar.
- Introduzido deslocamento terrestre (`public/data/municipio-coastal-drags.json` gerado por `scripts/build-coastal-drags.mjs`) que arrasta o centro urbano da cidade na direção do interior do território municipal (centroide territorial), garantindo que as paróquias obedeçam à margem do município e fiquem inteiramente em terra firme.
- Implementada função de confinamento dinâmico `clampTownToBoundary` e `computeTownAnchor` em `src/lib/map-territories.mjs` que restringe o perímetro do loteamento paroquial aos limites municipais oficiais do IBGE com margem de segurança.
- As conexões rodoviárias (`roadNetwork`), rótulos urbanos (`cityLabels`), enquadramento de câmera ao inspecionar paróquias/cidades e o contorno virtual acompanham o novo ponto âncora terrestre, preservando as coordenadas oficiais da sede IBGE nos atributos de dados (`data-seat-longitude`, `data-seat-latitude`).


### Fixed

- Corrigido o comportamento em que passar o mouse sobre o território de um município ou sobre o mapa marcava o estado inteiro em dourado/marrom (`src/components/world-map.tsx`). Agora o hover destaca exclusivamente o território municipal sob o cursor (`visibleBoundaries`), carregando até 120 limites municipais por lote a partir de `zoom >= 2.8`.
- Eliminado o travamento severo ao aproximar uma cidade com a camada de rodovias ativa: `MapRoadLayer` não reconstrói nem retessela strings SVG gigantes a cada frame de pan/zoom (`useMemo` + `vectorEffect="non-scaling-stroke"`), `roadsForView` filtra vias secundárias curtas na visão macro/regional, `useRoadData` limita tiles detalhados às 3 células mais próximas em `zoom >= 28`, `townScales`/`roadNetwork` foram desacoplados do carregamento de `worlds` e `TownArt` aplica nível de detalhe progressivo (`blockPixels`).

### Added

- Pré-carregamento real durante a tela inicial `MapLoading` (`warmHighwaysCache` em `src/lib/map-rendering.mjs`, `src/components/use-road-data.ts` e `src/components/world-map.tsx`), pré-projetando a malha rodoviária e os layouts das cidades prioritárias com barra de progresso antes de exibir o mapa.

## [0.24.0] - 2026-10-28

### Added

- Criação direta de casa pelo mapa (`createHouseOnMap` em `src/app/actions.ts` e modal interativo no mapa) permitindo ao participante informar seu `@` válido do Instagram, selecionar município e paróquia ativa e voar imediatamente para sua casa recém-construída, coexistindo com a criação via comentários em `@meu_lugar_na_igreja`.
- Busca rápida `@ seu @ [achar]` no cabeçalho (`GET /api/houses`) para localizar casas por `@username` ou nome público, botão **Passear** (auto-tour pelas cidades ativas), barra superior de pílulas de status (`DIA 0 · PRÉ-LANÇAMENTO`, contadores e última casa construída) e pílula dourada inferior de chamada para ação.
- Endpoint em lote `GET /api/cities/boundaries` e renderização automática do território municipal real do IBGE (`municipality_boundaries`) ao aproximar o mapa (`zoom >= 5`), além de pílulas de resumo por UF na visão macro e melhorias visuais nas praças dos bairros paroquiais (`src/components/town-art.tsx`).

### Changed

- Desempenho do mapa otimizado (`src/lib/map-territories.mjs`, `src/lib/map-roads.mjs`, `src/components/map-road-layer.tsx`, `src/components/world-map.tsx`): `buildTownScales` migrado de `O(N²)` para spatial hash `O(N)` (<150 ms para 5.570 municípios), remoção de `<mask>` SVG de tela inteira na camada rodoviária, consolidação de polígonos estaduais, limite de emblemas detalhados por quadro e bloqueio de eventos de ponteiro internos durante arraste (`isDragging`).

## [0.23.0] - 2026-10-28

### Added

- Processamento automático e sob demanda de comentários do Instagram (`scripts/instagram-comment-processor.mjs` e perfil Docker `instagram-process`) integrado ao receptor de webhook `/api/webhooks/instagram` e ao painel `/admin?view=instagram`.
- Interpretação de Paróquia, Cidade e Estado (UF) via OpenRouter (`OPENROUTER_API_KEY` e `OPENROUTER_MODEL`, padrão `openai/gpt-4o-mini`) com validação estrita contra os municípios e paróquias ativas no PostgreSQL e fallback determinístico.
- Criação e atualização transacional de casas (`houses`) vinculadas ao identificador oficial do autor (`instagram_user_id`, `instagram_comment_id`, `instagram_media_id`), garantindo uma única casa por perfil.
- Resposta automática no comentário do Instagram (`POST /{comment_id}/replies`) com linguagem respeitosa, católica e divertida quando o comentário não contém dados suficientes ou quando a paróquia/cidade não é localizada sem ambiguidade no mapa.
- Migration `013_instagram_comment_processing.sql` adicionando `instagram_comment_events` e colunas de vínculo nas casas, além de histórico e botão de processamento na aba Instagram do painel administrativo.

## [0.22.1] - 2026-10-25

### Fixed

- Rejeições de webhook antes da gravação deixam motivo/status observáveis nos logs. Aceitação informa ID da linha e contador; falha de persistência permanece503. Logs não expõem textos, perfis ou credenciais; validação de assinatura preservada.

### Added

- Diagnóstico Docker somente de leitura da conta autorizada, apps/campos assinados, permissões e comentários amostrais da última publicação. Relatório sanitizado com códigos de erro; sem autoassinatura ou alterações remotas.
- Testes de logs sem dados sensíveis e consultas diagnósticas sem mutações. A causa da ausência de eventos reais em produção ainda exige correlacionar esses resultados com o teste do usuário.

## [0.22.0] - 2026-10-25

### Added

- Seção Instagram no admin: conectar via Instagram Login, exibir perfil real retornado pela API, atualizar dados, reconectar/trocar conta e desconectar localmente.
- Callback OAuth separado do webhook, state aleatório/temporário ligado a administrador e sessão, consumo único e erros sem exposição de credenciais.
- Migration012 para autorizações e conta única; tokens cifrados com AES-256-GCM e registro de conexão/desconexão em auditoria. Troca por token de longa duração com validade retornada pelo provedor.
- Configuração Docker e roteiro de App Review; testes de criptografia, protocolo OAuth, erros, expiração, sessão e repetição no PostgreSQL. Sem novas dependências; webhook e páginas legais preservados. Desconexão local não revoga permissões Meta nem desativa o webhook.

## [0.21.2] - 2026-10-25

### Fixed

- Removido novamente o atalho admin reintroduzido no cabeçalho do mapa durante a inclusão das páginas legais. Links e conteúdo de privacidade/termos preservados; acesso administrativo direto e autenticação mantidos.

## [0.21.1] - 2026-10-25

### Removed

- Atalho de administração do cabeçalho público do mapa. Acesso direto a /admin e autenticação preservados.

## [0.21.0] - 2026-10-25

### Added

- GET/POST `/api/webhooks/instagram`: desafio Meta, comparação segura do token, assinatura HMAC sobre corpo original, limite de 1 MiB, validação mínima e resposta somente após persistir.
- Migration 010 com caixa de entrada JSONB, hash único, contador de entregas, datas e status. Reenvios byte a byte idênticos preservam a identidade/status; falha de banco retorna 503. Ainda sem worker ou criação de casas.
- Variáveis de configuração Docker e documentação do callback em produção. Override opcional de PostgreSQL no loopback para túnel SSH, sem abertura pública do banco.
- Testes do desafio, assinatura, corpo inválido/excessivo, falha de persistência e repetição transacional no PostgreSQL.

### Fixed

- Metadados de versão de duas dependências do lockfile alinhados aos tarballs e hashes já fixados, sem atualização dos pacotes.

## [0.20.0] - 2026-10-25

### Added

- Snapshot oficial comprimido e importação transacional de 5.570 contornos municipais para PostgreSQL, com geometria, projeção, fonte, data e checksum para repetição sem reprocessamento. Lacuna de Boa Esperança do Norte registrada no manifesto.
- Testes de cobertura, idempotência, resposta do contorno local e busca municipal por código/sem acentos.

### Changed

- Admin consulta cidades e paróquias por página de 50 e busca SQL sem acentos. Consultas completas são evitadas nas outras seções; seleção de município usa consulta local limitada a 15 opções.
- Endpoint de limite municipal lê somente o banco, com cache HTTP de 24 horas; removida consulta externa ao IBGE durante a navegação.

## [0.19.0] - 2026-10-25

### Added

- Manifesto de conciliação por fontes e registro persistente de redirecionamentos, preservando proveniência e histórico dos duplicados arquivados. Revisão individual dos 378 pares, com uma descoberta adicional após corrigir o município.
- Fila de possíveis variações de nomes na importação e no Catálogo administrativo; novas fichas suspeitas são retidas antes da criação de bairros.
- Testes de preservação de casas e aliases, repetição da conciliação, bloqueio de municípios/dioceses incompatíveis e retenção de abreviações não revisadas.
- Second Brain ativado por solicitação do responsável: projeto AcutisTech cadastrado no Obsidian com visão, contexto, backlog, histórico de versões e conhecimento transversal. Instrução local de recuperação em `AGENTS.md`; sem segredos no vault.

### Fixed

- 188 duplicados arquivados de forma reversível, com nomes completos no cadastro canônico; homônimas preservadas e quatro casos inconclusivos mantidos separados. Relatório de aplicação registra os totais efetivos.
- Observação editorial “nova paróquia” retirada de São Sebastião em Palhoça.
- Cabeçalhos municipais em `<b>` reconhecidos pelo parser de Florianópolis. Ficha de Leoberto Leal deixa de herdar Itapema; snapshot e cadastro corrigidos.
- Conciliação automática anterior baseada apenas no nome substituída por decisões explícitas de fontes; importação desconsidera registros arquivados ao procurar correspondências novas.

- Build/recriação Docker saudáveis; lint, TypeScript, 48 testes e auditoria sem vulnerabilidades. Instalação vazia e repetição mantiveram 9.889 ativos e todos os aliases revisados, sem perda das 11.210 fontes da base existente.

## [0.18.2] - 2026-10-25

### Added

- Auditoria somente de leitura para possíveis duplicidades paroquiais dentro do mesmo município: abreviações, acentos, preposições, grafias próximas e títulos incompletos. O relatório preserva fontes, localidades e IDs para decisão humana; não altera importação ou registros.
- Listagem nacional com 378 pares candidatos em 110 municípios, envolvendo 553 registros dos 10.077 ativos; homônimas não são tratadas como exclusões aprovadas. Palhoça recebe conferência prioritária e identificação da observação editorial “nova paróquia”.

## [0.18.1] - 2026-10-24

### Fixed

- Projeção rodoviária restrita ao enquadramento com margem e cache por geometria; conexões calculadas por região, mantendo os vizinhos para ligações alternativas.
- Geometrias e contornos municipais reutilizados quando outros municípios carregam; escalas não são recalculadas quando os raios permanecem iguais.
- Eventos de arraste, pinça e roda agrupados por quadro, preservando a âncora do zoom e evitando atualizações intermediárias de hover durante o gesto.
- Ruas e rodovias agrupadas em poucos caminhos SVG; máscara limitada à tela para evitar superfícies desnecessariamente grandes.
- Na amostra local de Jandira, projeção completa de 367,57 ms substituída por 98,19 ms no primeiro enquadramento e 5,61 ms com cache; conexões de 1.007,68 ms para 26,48 ms. Medição de CPU em Node/Docker, sem alegação de FPS.
- Validação: build e serviços Docker saudáveis, lint, TypeScript e 43 testes aprovados; auditoria sem vulnerabilidades; arraste e zoom exercitados no navegador local sem erros de console.

### Added

- Testes de reutilização e invalidação de geometrias, trechos que atravessam a tela e conexões com municípios fora do enquadramento.
- Perfil reproduzível de cálculo do mapa em Docker, sem novas dependências, em `scripts/profile-map.mjs` e `docs/map-performance.json`.

## [0.18.0] - 2026-10-24

### Added

- Aviões ilustrativos gerados na área visível, com direções, entradas, velocidades e intervalos aleatórios em todos os níveis de zoom.
- Limite de dois voos simultâneos em telas grandes e um em telas menores; descarte de trajetos concluídos ou que saíram do enquadramento.
- Controle por visibilidade da aba/mapa, abertura de diálogos e preferência de movimento reduzido, com encerramento de timers/listeners ao desmontar.
- Testes de travessia da área visível, diversidade de direções, culling por movimento da câmera e limite por tamanho de tela.

### Changed

- Rota fixa nacional e repetição infinita substituídas por animação SVG local, sem API de voos ou novas dependências.
- Ícones mantêm tamanho legível durante o zoom, não interceptam cliques e não geram atualizações React por quadro da animação.

### Fixed

- Cada voo inicia sua própria animação SVG ao entrar no DOM, evitando que aviões criados depois herdem o tempo inicial do documento e terminem imediatamente fora da tela.
- Validação: imagens Docker reconstruídas e serviços saudáveis; lint, TypeScript e 40 testes aprovados, auditoria sem vulnerabilidades. Navegador confirmou aviões em zoom municipal, deslocamento real entre capturas DOM, substituição por novos trajetos e zero voos ao abrir um diálogo.

## [0.17.0] - 2026-10-24

### Added

- Contorno da área virtual ao passar o ponteiro e na seleção, com resumo contextual de cidade ou paróquia e contagem de casas.
- Navegação por Brasil, cinco macrorregiões, estado, cidade e paróquia; cada nível mostra seus próprios totais e ações.
- Limite municipal simplificado do IBGE em azul tracejado, consultado sob demanda por rota validada, com cache de 24 horas e fallback para a área ilustrada.
- Enquadramento específico para limite municipal, paróquia e casa; zoom ampliado para detalhes em municípios cuja ilustração foi reduzida.
- Testes de separação entre territórios metropolitanos, conservação das sedes, regiões e geometrias administrativas.

### Fixed

- Escala das cidades ilustradas considera os municípios vizinhos, evitando que São Paulo cubra Guarulhos, São Caetano e outras cidades próximas.
- Nome e contagem ficam junto da sede e da área correspondente, em vez de aparecerem deslocados abaixo da mancha urbana.
- Clique em igreja preserva a seleção paroquial, com ação de localizar seu bairro; clique no território seleciona a cidade.
- Validação: Docker reconstruído com aplicação e banco saudáveis; lint, TypeScript e 38 testes aprovados, auditoria sem vulnerabilidades. Navegador conferiu cartão municipal, limite administrativo, navegação Sudeste → São Paulo e seleção/localização paroquial com resumo persistente. Endpoint municipal retornou 200 para São Paulo e São Caetano (qualidade máxima da malha simplificada), 400 para código inválido e 404 para município inexistente.

## [0.16.0] - 2026-10-24

### Added

- Cidade contínua organizada em quadras com núcleos paroquiais, praças locais, praça compartilhada e setores visuais em municípios grandes.
- Lotes e blocos determinísticos: adicionar moradores e paróquias preserva as posições já ocupadas. Novos blocos residenciais entram na malha compartilhada.
- Seleção de nomes por zoom, quantidade de paróquias, prioridade da cidade em foco e colisão em coordenadas de tela.
- Detalhamento progressivo de igrejas, árvores, casas e nomes paroquiais, com destaque por foco/seleção e passagem do ponteiro.
- Testes para centenas de paróquias, estabilidade de lotes e núcleos, conectividade de ruas e colisão de nomes.

### Changed

- Distribuição circular e vias radiais substituídas por ruas conectadas em quadras. Acessos às rodovias chegam a nós dessa malha.
- Símbolos e nomes municipais aparecem gradualmente; cidades com mais paróquias têm prioridade em escalas distantes.
- Setores são organização visual fictícia, sem inferência de limites paroquiais ou diocesanos.
- Validação: Docker reconstruído com aplicação e banco saudáveis; lint, TypeScript e 35 testes aprovados; auditoria de dependências sem vulnerabilidades. Revisão visual de São Paulo e visão nacional confirmou quadras e nomes progressivos. Auditoria de acessos atualizada para 4.019 municípios.

## [0.15.0] - 2026-10-24

### Added

- Publicação de paróquias do Acervo Católico como fonte de referência, com município IBGE resolvido e diocese em aberto.
- Proveniência institucional/referência persistida no catálogo e em suas fontes, identificada no painel, API e cartão da igreja.
- Reconciliação de correspondências únicas por nome/município; homônimas ambíguas ficam para revisão. Fontes institucionais existentes têm prioridade.
- Restrição de banco exige diocese para registros institucionais, permitindo vínculo desconhecido apenas em referências.

### Changed

- Importação e atualização do mapa usam também o snapshot nacional de referência, conforme autorizado pelo responsável, sem criar casas.
- Catálogo administrativo usa junção opcional de diocese e exibe totais separados por tipo de fonte.
- A confirmação institucional posterior pode aproveitar um registro de referência existente, preservando seu identificador e bairro.
- A conciliação reconhece qualificadores iniciais como “Santuário”, corrigindo a duplicata de São José em Niquelândia e outras 13 referências vazias, arquivadas com suas fontes preservadas no registro institucional.
- Validação: importação repetida manteve 10.077 paróquias ativas (2.624 institucionais e 7.453 referências), em 4.019 municípios e 27 UFs, sem casas e sem bairros faltantes. Docker reconstruído e saudável; lint, TypeScript e 31 testes passaram; auditoria sem vulnerabilidades. Cartão de referência conferido no navegador em Maceió com origem e diocese em aberto; painel protegido por autenticação.

## [0.14.0] - 2026-10-24

### Added

- Coletor institucional complementar com 230 fichas de Florianópolis, Rio Branco, Aracaju e Cuiabá, URLs de origem e exclusões documentadas.
- Coleta nacional independente de referência, separada do catálogo publicado, com cache por página, retomada, classificação por nomenclatura e município IBGE.
- Auditoria reproduzível por UF e circunscrição, relação de candidatas para pesquisa e minuta de solicitação de exportação nacional à instituição responsável.
- Testes de classificação, associação municipal e separação entre referência e catálogo institucional.

### Changed

- Importação transacional inclui o novo snapshot oficial, mantendo a reconciliação de fontes e sem criar casas.
- Serviços Docker específicos para atualização institucional complementar e referência nacional. Nenhuma dependência nova.

- Imagens reconstruídas e aplicação/banco saudáveis. Importação repetida preservou 2.624 paróquias, 830 municípios do catálogo, 21 UFs e zero casas; nenhum registro ativo ficou sem bairro associado.
- Lint, TypeScript e 27 testes passaram; auditoria de dependências sem vulnerabilidades. Quatro municípios das novas fontes responderam pela API pública com seus bairros e zero casas.

## [0.13.0] - 2026-10-24

### Added

- Malha rodoviária IBGE BC250 2021: 129.366 trechos classificados como construídos e operacionais, dentre 133.528 registros consultados. Inclui rodovias estaduais e demais estradas além das federais.
- Visão geral com 14.270 trechos federais e 200 arquivos regionais carregados por aproximação, com cache limitado no cliente.
- Auditoria reproduzível das conexões com a malha real e testes para Campinorte, Niquelândia, Minaçu e Colinas do Sul.

### Changed

- A atualização padrão de rodovias usa o IBGE; o coletor DNIT permanece apenas como referência histórica.
- As entradas seguem a direção da estrada, com asfalto, acostamento visual e faixas na mesma escala das ruas da cidade.
- O terreno da comunidade perdeu a borda circular rígida; vias internas sem acesso externo terminam nos anéis urbanos, sem falsas saídas no gramado.

### Fixed

- Rodovia junto ao núcleo não é mais confundida com acesso existente: as interseções com o perímetro geram entradas explícitas.
- Rodovias cortadas pelo desenho da cidade recebem ligações; a seleção não fica limitada aos dois primeiros cruzamentos.
- Ruas internas e estradas externas deixam de usar espessuras incompatíveis ao aproximar.

## [0.12.0] - 2026-10-24

### Added

- Inventário público das 281 circunscrições CNBB, com classificação canônica das igrejas, data da consulta e indicação de diretório vazio.
- Conectores oficiais de Manaus, dos sete vicariatos de Natal, Vitória e Roraima. Catálogo ampliado para 2.394 paróquias ativas em 752 municípios, 17 UFs e 39 circunscrições com registros.
- Malha real DNIT/IBAMA: 5.251 trechos existentes da versão SNV 202201B, excluindo trechos planejados e travessias, carregada de snapshot local.
- Acessos ilustrativos até a rodovia próxima e conexões limitadas entre municípios até 100 km, com saídas encaixadas no perímetro da cidade.
- Camada rodoviária configurável, atribuição das fontes, descarte de geometrias fora do enquadramento e testes de proximidade/encaixe.

### Changed

- Importação mantém paróquias homônimas com IDs distintos da mesma fonte; concilia somente correspondências inequívocas entre provedores diferentes.
- Atualização nacional consulta cada circunscrição, com checkpoint factual, sem persistir fotos, biografias ou contatos pessoais da resposta.
- Painel exibe a data de consulta CNBB e distingue diretório vazio de ausência real de paróquias. A cobertura permanece parcial.

### Removed

- Por solicitação do responsável, removidas as 121 casas, cinco bairros sem fonte, um bairro duplicado e duas cidades apenas de teste. Backup factual local antes da limpeza.
- Mapas de demonstração deixam de aparecer; os municípios e paróquias reais importados permanecem sem moradores.

## [0.11.0] - 2026-10-24

### Added

- Coletor público CNBB/CDICBR: 281 circunscrições e 1.844 fichas paroquiais resolvidas em 641 municípios e 13 UFs, entre 1.883 resultados. Cobertura parcial.
- Snapshot nacional, 39 exclusões documentadas e trilha de fontes múltiplas por paróquia.
- Cobertura por circunscrição, municípios/UFs e histórico das coletas no painel.
- Testes de resolução município/UF e integridade do catálogo nacional.

### Changed

- Paróquias importadas geram bairros no mapa mesmo sem casas. A importação não valida padres.
- Conciliação conservadora entre fontes por município, circunscrição e nome. Arquivamentos e casas são preservados.
- Busca enquadra também cidades com igrejas e nenhuma casa. Cartões mostram circunscrição e fonte oficial.

## [0.10.0] - 2026-10-24

### Added

- Sedes oficiais do IBGE para os 5.571 municípios, metadados de origem/hash e importação de coordenadas no PostgreSQL.
- Arte vetorial isométrica, praça com fonte, jardins, bairros paroquiais e ruas conectadas em uma única cidade.
- Carregamento de cidades por aproximação e descarte de construções fora do enquadramento.
- Navegação por pinça e teclado, modais nativos com foco contido e relatório de auditoria com prioridades.

### Changed

- Uma câmera contínua substitui a troca entre mapa nacional e cena local. A busca e os links diretos apenas enquadram o município ou a casa.
- Terreno ilustrado por padrão, cartografia OSM opcional e porte da cidade ligado à ocupação. Zoom chega a 8.192×.
- Participação recebe o município selecionado no mapa; busca ignora acentos e informa quando está carregando.

### Fixed

- Posição de Niquelândia e das demais cidades corrigida: sede municipal substitui centroide territorial.
- Casas distribuídas em quarteirões curvos sem sobrepor lotes; novas casas preservam posições dos lotes existentes no mesmo conjunto de bairros.
- Fila administrativa permite acessar pedidos além dos 100 mais recentes.
- Mensagens públicas de erro não expõem orientações sobre containers.
- Arrastar o mapa não seleciona textos ou rótulos; cliques em construções continuam disponíveis e o arraste não abre cartões ao terminar.

### Removed

- Renderizador WebGL separado, dependências Three/Fiber/Drei e arquivo de centroides obsoleto.

## [0.9.1] - 2026-10-24

### Fixed

- Zoom nacional ampliado de 3,5× para 512×, com foco no cursor e botões de aproximação proporcionais.
- Pontos grandes substituídos por casas e prévias com igreja e moradias; marcadores e nomes mantêm tamanho estável em pixels.
- Aproximação revela a cidade e abre sua cena isométrica automaticamente ao alcançar 48× próximo de um município ativo.
- Vias usam tiles com detalhe progressivo limitados à área visível; rótulos estaduais dão lugar aos nomes das cidades na aproximação.

## [0.9.0] - 2026-10-24

### Added

- Tela de carregamento com logo do projeto para consultas iniciais, componente de mapa e tiles cartográficos; progresso medido pelos tiles concluídos e fallback vetorial após 10 segundos.
- Catálogo factual de 346 paróquias de 28 municípios, obtido nas APIs oficiais da Arquidiocese de São Paulo e Diocese de Uruaçu, com duas circunscrições e proveniência no PostgreSQL.
- Coleta reexecutável em Docker, snapshot local e importação transacional por chave externa, sem exclusões automáticas.
- Consulta do catálogo no painel e opções de paróquias no formulário de participação.

### Fixed

- Tiles limitados ao contorno brasileiro; países vizinhos ficam ocultos sob a água ilustrada.
- Removidos estilos duplicados da vista nacional.
- Busca municipal limpa sugestões no evento de digitação; restauração do mapa reinicia seu estado sem atualizações síncronas em efeitos. Arraste usa a escala correta também em telas verticais.

## [0.7.0] - 2026-10-24

### Changed

- Visão nacional usa câmera superior com pan e zoom; cidades mantêm câmera isométrica fixa, sem rotação.
- Paróquias são distribuídas em setores de uma única cidade, com casas posicionadas em torno de cada igreja.
- Construção da igreja cresce visualmente em quatro níveis conforme casas ativas, sem alterar nome, natureza ou status canônico da paróquia.

## [0.8.0] - 2026-10-24

### Changed

- Mapa nacional usa projeção SVG geográfica com enquadramento consistente; pan e zoom deixam de depender da escala da cena 3D e rótulos surgem conforme aproximação.
- Interface pública simplificada para mapa em tela cheia, busca municipal superior, lista em modal e modal de camadas.
- Card “Como funciona” apresenta somente princípios já acordados e deixa explícito que as regras completas seguem em elaboração.
- Busca permite localizar municípios do catálogo IBGE sem paróquia cadastrada e mostra que ainda falta cadastrar a comunidade.

### Documentation

- Registrado que os cadastros paroquiais atuais são manuais/demonstrativos; o CDICBR da CNBB é a fonte preferida, mas requer acesso/condições de uso para importação em massa.
- Descrito modelo futuro com circunscrições eclesiásticas, proveniência, revisão e sincronização segura.

## [0.6.0] - 2026-10-24

### Changed

- Aviões ilustrativos agora surgem em intervalos aleatórios e atravessam a visão nacional; a animação pausa quando a página fica oculta ou o navegador solicita movimento reduzido.

## [0.5.0] - 2026-10-24

### Added

- Base cartográfica nacional com vias do OpenStreetMap, controle para exibir/ocultar e crédito visível com links de atribuição ODbL e correção de dados.
- Aeronave estilizada e trilha visual identificadas como elementos ilustrativos, sem alegação de rastreamento real.

### Changed

- Polígonos estaduais usam projeção compatível com o mosaico de tiles para alinhar vias e limites.
- Documentação registra o serviço externo de tiles, seus limites operacionais e o caminho para hospedagem/provedor próprio.

## [0.4.0] - 2026-10-24

### Added

- Formulário público de participação com município brasileiro, paróquia, nome público, perfil do Instagram e consentimento para publicação após aprovação.
- Fila privada de solicitações no painel, com filtros, aprovação/publicação e arquivamento.
- Aprovação transacional cria ou reativa cidade e paróquia quando necessário, publica a casa e registra auditoria.
- Migração PostgreSQL para pedidos, consentimento e histórico da revisão.

### Changed

- Mapa e painel apresentam o caminho de participação e revisão; pedidos pendentes aparecem na navegação administrativa.
- README, documentação do produto e versão atualizados para a entrada pública moderada.

### Security

- Nome e perfil não aparecem no mapa enquanto o pedido estiver pendente ou arquivado; a publicação exige consentimento registrado.

## [0.3.1] - 2026-10-23

### Changed

- Detalhes da paróquia ou casa ficam no painel lateral, liberando a área do mapa.
- Câmera inicial da cidade enquadra o conjunto de paróquias, com aproximação progressiva conforme o número de comunidades.
- Rótulos 3D quebram linhas e controles e navegação têm alvos maiores para toque.
- Painel administrativo respeita limites mínimos dos grids em telas estreitas.
- Coluna da cidade compactada para manter a lista de paróquias visível junto aos detalhes selecionados.

## [0.3.0] - 2026-10-23

### Added

- Nome aprovado **Meu Lugar na Igreja**, assinatura de provedora AcutisTech e símbolo de marca próprio em PNG transparente.
- Ícone de navegador com a marca do produto.

### Changed

- Mapa, painel administrativo e acesso adotam o nome, símbolo, paleta e hierarquia tipográfica do produto.
- Ações primárias do painel usam dourado com texto azul-marinho, alinhadas à identidade AcutisTech.
- README e guia de marca atualizados para a identidade aprovada.
- Símbolo refinado para mostrar claramente a igreja católica e as pessoas da comunidade paroquial.

## [0.2.1] - 2026-10-23

### Added

- Guia de marca da AcutisTech e do produto, com cores observadas, arquivo de logo, hierarquia de marcas e nome sugerido aguardando aprovação.
- Logo oficial da AcutisTech incluída como ativo local para a interface.

### Changed

- Interface atual alinhada à paleta azul-marinho, dourado e marfim da AcutisTech.

## [0.2.0] - 2026-10-23

Primeira implementação funcional do mapa e painel; não há quebra de versão pública anterior.

### Added

- Compose com PostgreSQL persistente, migração SQL automática e aplicação em build de produção.
- Setup com senhas aleatórias, login administrativo, sessões no banco, limite de tentativas e auditoria.
- Mapa nacional 3D com malhas das 27 UFs e catálogo local de 5.571 municípios do IBGE.
- Cenas por cidade, várias paróquias, igrejas ilustradas, casas selecionáveis e lotes estáveis.
- Painel para criar, editar e arquivar cidades, paróquias e casas; busca e paginação de casas.
- Alternativa pública em lista, link de casa e carga opcional de demonstração.
- Testes de layout, senhas, catálogo e integridade do banco, além de orientação de operação/backup.

### Changed

- Funções e progressões adiadas por decisão do responsável; seu planejamento foi preservado.
- Stack inicial reduzida a Next.js, React Three Fiber, PostgreSQL/pg e CSS; ORM, autenticação de moradores e worker ficam para etapas que precisem deles.
- Instagram e verificação de padres permanecem como etapas futuras, sem serviços externos em runtime nesta entrega.

## [0.1.0] - 2026-10-23

Versão inicial de planejamento; não representa lançamento de software executável.

### Added

- Visão do produto da AcutisTech, com cidades em 3D e participação nacional.
- Investigação técnica das duas referências, fontes e limites de reaproveitamento.
- Proposta de arquitetura Docker-first, modelo de dados, administração e integração com Instagram.
- Catálogo extensível de áreas e funções, escolha direta e progressão configurável por pontos.
- Regras de verificação humana exclusivas para padres, sem validação dos demais títulos.
- Roadmap com critérios de aceite e fluxo documentado em Mermaid.
