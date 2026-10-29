'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Award,
  Crown,
  Flame,
  CheckCircle2,
  Calendar,
  Vote,
  Lightbulb,
  Building,
  Flag,
  Cross,
  Send,
  Heart,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Home,
  User,
  Compass,
  Layers,
  ArrowUpRight,
  Target,
} from 'lucide-react';

export function HowItWorksGuide({
  onOpenCreateHouse,
  onOpenWalk,
}: {
  onOpenCreateHouse?: () => void;
  onOpenWalk?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'missions' | 'levels' | 'houses' | 'governance' | 'priest' | 'walk' | 'privacy'>('overview');

  return (
    <div className="how-it-works-modal-content">
      {/* Navigation Pills */}
      <nav className="how-it-works-tabs" aria-label="Abas do manual do jogo">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Home size={15} />
          <span>Visão Geral</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'missions' ? 'active' : ''}`}
          onClick={() => setActiveTab('missions')}
        >
          <Target size={15} />
          <span>Missões & XP</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'levels' ? 'active' : ''}`}
          onClick={() => setActiveTab('levels')}
        >
          <Award size={15} />
          <span>Níveis Litúrgicos</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'houses' ? 'active' : ''}`}
          onClick={() => setActiveTab('houses')}
        >
          <Building size={15} />
          <span>Casas & Palácios</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'governance' ? 'active' : ''}`}
          onClick={() => setActiveTab('governance')}
        >
          <Crown size={15} />
          <span>Governança Cívica</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'priest' ? 'active' : ''}`}
          onClick={() => setActiveTab('priest')}
        >
          <Cross size={15} />
          <span>Pároco & Matriz</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'walk' ? 'active' : ''}`}
          onClick={() => setActiveTab('walk')}
        >
          <User size={15} />
          <span>Passeio 3D</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          <ShieldCheck size={15} />
          <span>LGPD & Regras</span>
        </button>
      </nav>

      {/* TAB 1: VISÃO GERAL */}
      {activeTab === 'overview' && (
        <section className="guide-section">
          <div className="guide-hero-banner">
            <span className="guide-kicker">PRODUTO OFICIAL ACUTISTECH</span>
            <h2>Bem-vindo ao Meu Lugar na Igreja</h2>
            <p>
              Um mapa contínuo, vivo e ilustrado que conecta as comunidades católicas em todos os <strong>5.570 municípios</strong> do Brasil.
              Aqui, fiéis se unem aos bairros de suas paróquias reais, cumprem missões devocionais diárias, evoluem suas residências e participam da governança cívica paroquial.
            </p>
          </div>

          <div className="guide-grid-2">
            <div className="guide-card">
              <div className="guide-card-icon gold">
                <Home size={20} />
              </div>
              <h3>1. Como entrar no mapa</h3>
              <p>Você pode criar sua casa de duas maneiras muito simples:</p>
              <ul className="guide-checklist">
                <li>
                  <strong>Direto no mapa:</strong> Clique em <button type="button" className="text-link" onClick={onOpenCreateHouse}>Construir casa</button>, digite seu @ do Instagram, selecione sua cidade e sua paróquia oficial.
                </li>
                <li>
                  <strong>Pelo Instagram:</strong> Comente seu município e paróquia nos posts do <strong>@meu_lugar_na_igreja</strong> para nossa IA alocar seu lote na paróquia correta.
                </li>
              </ul>
            </div>

            <div className="guide-card">
              <div className="guide-card-icon green">
                <Compass size={20} />
              </div>
              <h3>2. Encontre sua casa e vizinhos</h3>
              <p>
                Digite seu <strong>@seu_arroba</strong> no campo de busca do topo e clique em <strong>achar</strong>. O mapa voará direto para o quarteirão onde está a sua casa e a Matriz da sua paróquia.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: MISSÕES & XP */}
      {activeTab === 'missions' && (
        <section className="guide-section">
          <div className="guide-header-box">
            <span className="guide-kicker">ROUTINA DE ENGAJAMENTO DIÁRIO</span>
            <h2>Quadro de Missões Diárias & Pontuação</h2>
            <p>
              Todos os dias você tem 10 missões devocionais e comunitárias para acumular Experiência (XP). O progresso sobe o nível do seu personagem e aprimora visualmente sua residência no mapa!
            </p>
          </div>

          <div className="missions-guide-table">
            <div className="missions-guide-tier tier-easy-box">
              <div className="tier-badge-heading green">
                <strong>Missões Fáceis</strong>
                <span>+10 a +15 XP cada</span>
              </div>
              <div className="tier-items-list">
                <div className="tier-item-row">
                  <span className="icon">📿</span>
                  <div>
                    <strong>Check-in Diário de Oração (+10 XP)</strong>
                    <p>Reze e confirme seu compromisso diário com a comunidade.</p>
                  </div>
                </div>
                <div className="tier-item-row">
                  <span className="icon">🕊️</span>
                  <div>
                    <strong>Intenção no Mural da Paróquia (+10 XP)</strong>
                    <p>Deposite uma súplica ou ação de graças para todos rezarem juntos.</p>
                  </div>
                </div>
                <div className="tier-item-row">
                  <span className="icon">🚶</span>
                  <div>
                    <strong>Passeio de 5 min com o Bonequinho (+15 XP)</strong>
                    <p>Explore as ruas do bairro paroquial e a praça da Matriz em 3D.</p>
                  </div>
                </div>
                <div className="tier-item-row">
                  <span className="icon">💬</span>
                  <div>
                    <strong>Comente ou Marque @ de Amigos (+15 XP)</strong>
                    <p>Mencione amigos nos comentários do perfil oficial (máx. 3 por dia).</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="missions-guide-tier tier-medium-box">
              <div className="tier-badge-heading orange">
                <strong>Missões Médias</strong>
                <span>+20 a +35 XP cada</span>
              </div>
              <div className="tier-items-list">
                <div className="tier-item-row">
                  <span className="icon">🗳️</span>
                  <div>
                    <strong>Voto Semanal no Presidente (+25 XP)</strong>
                    <p>Exerça seu voto popular católico entre sexta-feira e domingo.</p>
                  </div>
                </div>
                <div className="tier-item-row">
                  <span className="icon">⛪</span>
                  <div>
                    <strong>Visita à Igreja Matriz (+20 XP)</strong>
                    <p>Aproxime o mapa e reze no adro da matriz da sua comunidade.</p>
                  </div>
                </div>
                <div className="tier-item-row">
                  <span className="icon">🔥</span>
                  <div>
                    <strong>Streak Sagrado de 7 Dias (+35 XP Bônus)</strong>
                    <p>Mantenha 7 dias consecutivos de check-in ininterrupto de oração.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="missions-guide-tier tier-hard-box">
              <div className="tier-badge-heading red">
                <strong>Missões Difíceis & Especiais</strong>
                <span>+100 a +500 XP cada</span>
              </div>
              <div className="tier-items-list">
                <div className="tier-item-row">
                  <span className="icon">🏡</span>
                  <div>
                    <strong>Amigo Constrói Casa por Indicação (+100 XP)</strong>
                    <p>Quando o amigo que você marcou cria a casa no mapa, você recebe o bônus.</p>
                  </div>
                </div>
                <div className="tier-item-row">
                  <span className="icon">✝️</span>
                  <div>
                    <strong>Indique seu Pároco ou Vigário (@padre) (+15 XP)</strong>
                    <p>Marque o @ do padre da sua paróquia para convidá-lo a liderar a Matriz.</p>
                  </div>
                </div>
                <div className="tier-item-row">
                  <span className="icon">✨</span>
                  <div>
                    <strong>Pároco Aprovado na Matriz (+500 XP Bônus Máximo)</strong>
                    <p>Concedido a você quando a cúria homologa o sacerdote na sua paróquia.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="guide-bonus-callout">
            <CheckCircle2 size={24} style={{ color: '#16a34a', flexShrink: 0 }} />
            <div>
              <strong>Bônus de Todas as Missões Concluídas: +50 XP Adicional Diário!</strong>
              <p>Ao realizar todas as metas do dia, você ganha 50 XP extras na apuração do seu perfil.</p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: NÍVEIS LITÚRGICOS */}
      {activeTab === 'levels' && (
        <section className="guide-section">
          <div className="guide-header-box">
            <span className="guide-kicker">PROGRESSÃO ECLESIÁSTICA</span>
            <h2>Níveis Pessoais & Papéis na Igreja</h2>
            <p>
              Sua caminhada é reconhecida por funções e ministérios litúrgicos. Cada nível desbloqueia trajes no modo 3D e títulos honoríficos na paróquia.
            </p>
          </div>

          <div className="levels-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Nível</th>
                  <th>Papel Litúrgico</th>
                  <th>XP Acumulado</th>
                  <th>Vestes e Insígnias</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>1 – 4</strong></td>
                  <td>Leigo da Paróquia</td>
                  <td>0 a 199 XP</td>
                  <td>Roupas civis dignas e acolhedoras</td>
                </tr>
                <tr>
                  <td><strong>5 – 9</strong></td>
                  <td>Coroinha</td>
                  <td>200 a 599 XP</td>
                  <td>Túnica vermelha litúrgica e sobrepeliz branca</td>
                </tr>
                <tr>
                  <td><strong>10 – 19</strong></td>
                  <td>Acólito</td>
                  <td>600 a 1.599 XP</td>
                  <td>Túnica sagrada com círio pascal e cruz processional</td>
                </tr>
                <tr>
                  <td><strong>20 – 24</strong></td>
                  <td>Cerimoniário</td>
                  <td>1.600 a 2.399 XP</td>
                  <td>Túnica preta solene, sobrepeliz e missal romano</td>
                </tr>
                <tr>
                  <td><strong>25 – 29</strong></td>
                  <td>Ministro da Eucaristia</td>
                  <td>2.400 a 3.199 XP</td>
                  <td>Vestes brancas sagradas, estola dourada e teca eucarística</td>
                </tr>
                <tr className="highlight-sacristan">
                  <td><strong>30+</strong></td>
                  <td>👑 Sacristão da Igreja</td>
                  <td>3.200+ XP</td>
                  <td>
                    <strong>Top 5 maiores pontuadores da cidade com Nível 30+</strong>.
                    Guardião oficial das chaves da matriz, estandarte dourado e vestes talares nobres.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: CASAS & PALÁCIOS */}
      {activeTab === 'houses' && (
        <section className="guide-section">
          <div className="guide-header-box">
            <span className="guide-kicker">ARQUITETURA ISOMÉTRICA DINÂMICA</span>
            <h2>Evolução Visual das Residências</h2>
            <p>
              A sua casa cresce visualmente no mapa à medida que você progride. Ela começa como uma casinha rústica e pode se tornar um palacete histórico ou palácio de governo!
            </p>
          </div>

          <div className="house-stages-grid">
            <div className="house-stage-card">
              <span className="stage-pill">Estágio 1 · Nível 1–4</span>
              <h4>Casinha da Vila</h4>
              <p>Casa acolhedora em madeira e telha cerâmica colonial em lote gramado tradicional.</p>
            </div>

            <div className="house-stage-card">
              <span className="stage-pill">Estágio 2 · Nível 5–14</span>
              <h4>Casa Colonial</h4>
              <p>Construção em alvenaria branca caiada com janelas azuis coloniais, calçada de pedra e jardim florido.</p>
            </div>

            <div className="house-stage-card">
              <span className="stage-pill">Estágio 3 · Nível 15–24</span>
              <h4>Sobrado Paroquial</h4>
              <p>Dois pavimentos com sacada de ferro batido e lampião colonial aceso na entrada.</p>
            </div>

            <div className="house-stage-card">
              <span className="stage-pill">Estágio 4 · Nível 25–29</span>
              <h4>Solar da Fé</h4>
              <p>Casa senhorial ampla com muro de pedra rústica, portão nobre de ferro e cruzeiro devocional no quintal.</p>
            </div>

            <div className="house-stage-card sacristan-card">
              <span className="stage-pill gold">Estágio 5 · Nível 30+ (Top 5)</span>
              <h4>Palacete do Sacristão</h4>
              <p>Palacete histórico colonial com oratório iluminado no muro, estandarte dourado e as chaves de ouro da Matriz.</p>
            </div>
          </div>

          <div className="guide-header-box" style={{ marginTop: '32px' }}>
            <span className="guide-kicker">SOBREPOSIÇÃO POR MANDATO CÍVICO</span>
            <h3>Palácios de Autoridades Oficiais</h3>
            <p>
              Quem estiver empossado nos cargos políticos durante a semana tem o modelo da casa pessoal substituído pelo palácio oficial de autoridade:
            </p>
          </div>

          <div className="palaces-grid">
            <div className="palace-card mayor">
              <div className="palace-header">
                <Building size={18} />
                <strong>Prefeito Municipal</strong>
              </div>
              <h4>Palacete Municipal</h4>
              <p>Pórtico cívico com colunas clássicas, brasão do município e bandeira municipal hasteada.</p>
            </div>

            <div className="palace-card governor">
              <div className="palace-header">
                <Flag size={18} />
                <strong>Governador do Estado</strong>
              </div>
              <h4>Palácio dos Governadores</h4>
              <p>Pórtico nobre duplo, escadaria cerimonial de pedra, brasão das armas e bandeira do Estado.</p>
            </div>

            <div className="palace-card president">
              <div className="palace-header">
                <Crown size={18} />
                <strong>Presidente da República</strong>
              </div>
              <h4>Palácio Presidencial da República</h4>
              <p>Cúpula palaciana imponente, espelho d&apos;água frontal e a bandeira do Brasil hasteada com aura dourada.</p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: GOVERNANÇA CÍVICA */}
      {activeTab === 'governance' && (
        <section className="guide-section">
          <div className="guide-header-box">
            <span className="guide-kicker">DEMOCRACIA SEMANAL EM CASCATA</span>
            <h2>Eleições, Mandatos e Poderes</h2>
            <p>
              O sistema político é renovado a cada semana, com eleição popular de sexta a domingo e posse automática às segundas-feiras.
            </p>
          </div>

          <div className="cascade-explanation">
            <div className="cascade-step">
              <div className="step-num">1</div>
              <div>
                <strong>Eleição Popular do Presidente</strong>
                <p>Todos os moradores votam pelo mapa entre sexta e domingo. Quem tiver mais votos no Brasil assume a Presidência.</p>
              </div>
            </div>
            <div className="cascade-step">
              <div className="step-num">2</div>
              <div>
                <strong>Nomeação de Governadores</strong>
                <p>O Presidente empossado escolhe e nomeia os Governadores de cada um dos estados brasileiros.</p>
              </div>
            </div>
            <div className="cascade-step">
              <div className="step-num">3</div>
              <div>
                <strong>Nomeação de Prefeitos</strong>
                <p>Cada Governador nomeia os Prefeitos dos municípios de seu respectivo estado.</p>
              </div>
            </div>
          </div>

          <div className="powers-comparison">
            <div className="power-box">
              <h4>🏛️ Poderes do Prefeito</h4>
              <ul>
                <li>Define a <strong>Mensagem de Boas-Vindas</strong> da cidade vista por todos os visitantes.</li>
                <li>Ativa a <strong>Festa do Padroeiro</strong>, enfeitando as ruas do município com bandeirolas coloridas.</li>
              </ul>
            </div>

            <div className="power-box">
              <h4>🗺️ Poderes do Governador</h4>
              <ul>
                <li>Eleger o <strong>Município Destaque</strong> de peregrinação e turismo religioso no estado.</li>
                <li>Publicar o <strong>Decreto Estadual da Fé</strong> para motivar todos os paroquianos do estado.</li>
              </ul>
            </div>

            <div className="power-box highlight">
              <h4>👑 Poder Exclusivo do Presidente da República</h4>
              <ul>
                <li>
                  O Presidente é a <strong>única autoridade com o poder de sugerir formalmente novas funcionalidades e expansões para o jogo</strong>!
                </li>
                <li>
                  Suas propostas são enviadas diretamente ao gabinete de inovação da <strong>AcutisTech</strong> no painel administrativo e avaliadas com prioridade absoluta.
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* TAB 6: PÁROCO & MATRIZ */}
      {activeTab === 'priest' && (
        <section className="guide-section">
          <div className="guide-header-box">
            <span className="guide-kicker">MINISTÉRIO SACERDOTAL CANÔNICO</span>
            <h2>O Padre na Comunidade & Upgrade da Matriz</h2>
            <p>
              O sacerdote tem um lugar sagrado e exclusivo no jogo: ele não reside em uma casa comum, mas é entronizado na própria Igreja Matriz da paróquia.
            </p>
          </div>

          <div className="priest-features-grid">
            <div className="priest-card">
              <div className="icon-wrap gold">
                <Cross size={24} />
              </div>
              <h4>Como Indicar um Padre</h4>
              <p>
                Qualquer fiel pode marcar o @ do seu Pároco ou Vigário nos comentários ou na ficha da paróquia. O fiel ganha <strong>+15 XP</strong> na indicação e <strong>+500 XP de bônus sagrado</strong> assim que o sacerdote for verificado e aprovado pela cúria no painel da AcutisTech.
              </p>
            </div>

            <div className="priest-card">
              <div className="icon-wrap green">
                <Sparkles size={24} />
              </div>
              <h4>Upgrade Sagrado da Igreja Matriz</h4>
              <p>Assim que o Pároco tem sua função confirmada, a matriz recebe:</p>
              <ul>
                <li><strong>Cruz Dourada Reluzente</strong> no campanário com halo celestial pulsante.</li>
                <li><strong>Estola Pastoral</strong> litúrgica adornando o portal sagrado.</li>
                <li><strong>Bandeirolas e Sinos</strong> solenes anunciando a presença do pastor.</li>
                <li><strong>Bênção Comunitária (+10% XP):</strong> Todos os moradores daquela paróquia recebem um multiplicador permanente de 10% em todas as ações de fé!</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* TAB 7: PASSEIO 3D */}
      {activeTab === 'walk' && (
        <section className="guide-section">
          <div className="guide-header-box">
            <span className="guide-kicker">IMERSÃO EM TERCEIRA PESSOA</span>
            <h2>Modo Passear em 3D (&ldquo;Bonequinho&rdquo;)</h2>
            <p>
              Caminhe livremente pelas ruas reais, calçadas, quarteirões e praça da Igreja Matriz do seu município com seu avatar católico!
            </p>
          </div>

          <div className="controls-card">
            <h4>🎮 Controles de Navegação</h4>
            <div className="controls-list">
              <div className="control-key">
                <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>
                <span>Caminhar pelo bairro (o personagem vira na direção da marcha)</span>
              </div>
              <div className="control-key">
                <kbd>Setas</kbd> ou <kbd>Arraste do Mouse</kbd>
                <span>Girar a câmera orbital em 360 graus</span>
              </div>
              <div className="control-key">
                <kbd>Shift</kbd>
                <span>Correr com o bonequinho</span>
              </div>
              <div className="control-key">
                <kbd>E</kbd> / <kbd>C</kbd> / <kbd>G</kbd>
                <span>Ações e emotes: Orar com as mãos postas, Comemorar e Louvar</span>
              </div>
              <div className="control-key">
                <kbd>Esc</kbd> ou botão <kbd>X Sair</kbd>
                <span>Retornar imediatamente ao mapa</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                type="button"
                className="primary-button"
                onClick={onOpenWalk}
                style={{ display: 'inline-flex', padding: '12px 24px' }}
              >
                <User size={16} /> Iniciar Passeio em 3D Agora
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 8: LGPD & PRIVACIDADE */}
      {activeTab === 'privacy' && (
        <section className="guide-section">
          <div className="guide-header-box">
            <span className="guide-kicker">SEGURANÇA & CONFORMIDADE</span>
            <h2>Privacidade, LGPD e Pertencimento</h2>
            <p>
              Nosso compromisso é com a fé, a dignidade humana e o respeito absoluto às leis brasileiras de proteção de dados (LGPD - Lei nº 13.709/2018).
            </p>
          </div>

          <div className="guide-grid-2">
            <div className="guide-card">
              <h3>🛡️ Proteção de Identidade e Endereço</h3>
              <p>
                O <em>Meu Lugar na Igreja</em> <strong>nunca coleta, armazena ou solicita endereços físicos residenciais reais</strong>. As ruas, quarteirões e posicionamentos de casas no mapa são representações artísticas e virtuais geradas por algoritmos sobre a malha pública do IBGE.
              </p>
            </div>

            <div className="guide-card">
              <h3>📜 Dados Públicos e Exclusão</h3>
              <p>
                Utilizamos exclusivamente o seu @ público do Instagram informado voluntariamente. Caso você deseje alterar sua paróquia ou remover sua casa da plataforma a qualquer momento, o procedimento é atendido prontamente pela AcutisTech.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link href="/privacidade" className="text-button" style={{ display: 'inline-flex', gap: '6px' }}>
              Ler Políticas de Privacidade Completas <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
