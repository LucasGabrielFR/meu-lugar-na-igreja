'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, MapPin, Users, Sparkles, MessageCircle, Send, Heart, Shield, Award, User, ChevronDown, Plane, Search, Loader2 } from 'lucide-react';
import type { City, CityWorld } from '@/lib/types';
import Walk3DScene, { type CharacterGender, type CharacterRole, type WalkCharacterConfig } from './walk-3d-scene';

export function warmWalkAssets() {
  // Pre-instantiate a dummy geometry/material in memory
  try {
    import('three').then(THREE => {
      const g = new THREE.BoxGeometry(1, 1, 1);
      const m = new THREE.MeshBasicMaterial();
      g.dispose();
      m.dispose();
    }).catch(() => {});
  } catch {}
}

const ROLES: { id: CharacterRole; label: string; icon: string; description: string }[] = [
  { id: 'criador', label: 'Criador · Nível 99', icon: '👑', description: 'Criador do projeto · Permissões máximas e vestes douradas' },
  { id: 'leigo', label: 'Leigo', icon: '👤', description: 'Fiel batizado que santifica as realidades temporais' },
  { id: 'coroinha', label: 'Coroinha', icon: '🕯️', description: 'Auxilia no altar com túnica vermelha e sobrepeliz' },
  { id: 'acolito', label: 'Acólito', icon: '✝️', description: 'Túnica branca pura e cruz peitoral no serviço litúrgico' },
  { id: 'cerimoniario', label: 'Cerimoniário', icon: '📜', description: 'Veste litúrgica e faixa dourada orientando o rito' },
  { id: 'ministro', label: 'Ministro da Eucaristia', icon: '🍞', description: 'Veste branca e fita ministerial distribuindo o Pão da Vida' },
  { id: 'sacristao', label: 'Sacristão', icon: '🗝️', description: 'Guardião das chaves e do zelo do templo do Senhor' },
  { id: 'prefeito', label: 'Prefeito', icon: '🏛️', description: 'Maior pontuação municipal · Faixa municipal' },
  { id: 'governador', label: 'Governador', icon: '🌟', description: 'Maior pontuação estadual · Faixa estadual' },
  { id: 'presidente', label: 'Presidente', icon: '🇧🇷', description: 'Eleito pela comunidade · Faixa presidencial' },
  { id: 'padre', label: 'Pároco / Padre', icon: '⛪', description: 'Batina preta e colarinho clerical · Pastor do rebanho' },
];

const POPULAR_DESTINATIONS = [
  { code: 3502507, name: 'Aparecida', uf: 'SP', icon: '👑', highlight: 'Santuário Nacional de Nossa Senhora' },
  { code: 5214606, name: 'Niquelândia', uf: 'GO', icon: '⛪', highlight: 'Santuário São José · Berço da fé em Goiás' },
  { code: 3304557, name: 'Rio de Janeiro', uf: 'RJ', icon: '✝️', highlight: 'Cristo Redentor · Arquidiocese de São Sebastião' },
  { code: 3550308, name: 'São Paulo', uf: 'SP', icon: '🏛️', highlight: 'Catedral da Sé · Maior metrópole católica' },
  { code: 5300108, name: 'Brasília', uf: 'DF', icon: '🕊️', highlight: 'Catedral Metropolitana Nossa Senhora Aparecida' },
  { code: 2927408, name: 'Salvador', uf: 'BA', icon: '🔔', highlight: 'Basílica do Senhor do Bonfim · Tradição secular' },
  { code: 1501402, name: 'Belém', uf: 'PA', icon: '🌸', highlight: 'Basílica Santuário de Nazaré · Círio de Nazaré' },
  { code: 2307304, name: 'Juazeiro do Norte', uf: 'CE', icon: '⛰️', highlight: 'Colina do Horto · Centro de Romarias' },
  { code: 4106902, name: 'Curitiba', uf: 'PR', icon: '🌿', highlight: 'Catedral Basílica Menor Nossa Senhora da Luz' },
  { code: 3106200, name: 'Belo Horizonte', uf: 'MG', icon: '⛰️', highlight: 'Santuário Basílica Nossa Senhora da Piedade' },
];

interface ChatMessage {
  id: string;
  sender: string;
  role: string;
  text: string;
  time: string;
}

export default function WalkMode({
  city,
  world,
  onExit,
  onTravel,
  defaultGender = 'male',
  defaultRole,
  username = 'fiel_devoto',
  targetParishId,
  autoWalk = false,
  cleanMode = false,
}: {
  city: City;
  world: CityWorld;
  onExit: () => void;
  onTravel?: (cityCode: number) => Promise<{ city: City; world: CityWorld } | null>;
  defaultGender?: CharacterGender;
  defaultRole?: CharacterRole;
  username?: string;
  targetParishId?: number;
  autoWalk?: boolean;
  cleanMode?: boolean;
}) {
  const isCreatorUser = username.toLowerCase().replace(/^@/, '') === 'lucasgfr26';
  const initialRole = defaultRole ?? (isCreatorUser ? 'criador' : 'leigo');
  const [currentCity, setCurrentCity] = useState<City>(city);
  const [currentWorld, setCurrentWorld] = useState<CityWorld>(world);
  const [gender, setGender] = useState<CharacterGender>(defaultGender);
  const [role, setRole] = useState<CharacterRole>(initialRole);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Travel feature state
  const [travelModalOpen, setTravelModalOpen] = useState(false);
  const [travelSearch, setTravelSearch] = useState('');
  const [travelResults, setTravelResults] = useState<any[]>([]);
  const [isSearchingTravel, setIsSearchingTravel] = useState(false);
  const [isTraveling, setIsTraveling] = useState(false);
  const [travelTargetName, setTravelTargetName] = useState('');

  useEffect(() => {
    setCurrentCity(city);
  }, [city]);

  useEffect(() => {
    setCurrentWorld(world);
  }, [world]);

  // Debounced municipality search for Travel
  useEffect(() => {
    if (travelSearch.trim().length < 2) {
      setTravelResults([]);
      setIsSearchingTravel(false);
      return;
    }
    setIsSearchingTravel(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/municipalities?q=${encodeURIComponent(travelSearch.trim())}`, { signal: controller.signal })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (!controller.signal.aborted && data?.municipalities) {
            setTravelResults(data.municipalities);
            setIsSearchingTravel(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setIsSearchingTravel(false);
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [travelSearch]);

  const handleTravelToCity = async (code: number, name: string, uf: string) => {
    if (code === currentCity.code) {
      setTravelModalOpen(false);
      return;
    }
    setTravelTargetName(`${name} · ${uf}`);
    setIsTraveling(true);
    try {
      if (onTravel) {
        const result = await onTravel(code);
        if (result?.city && result?.world) {
          setCurrentCity(result.city);
          setCurrentWorld(result.world);
          setChatMessages(prev => [
            ...prev,
            {
              id: String(Date.now()),
              sender: '✈️ Aeronave Paroquial',
              role: 'Sistema de Viagem',
              text: `✈️ Você viajou e aterrissou em ${result.city.name}/${result.city.uf}! Caminhe pelas ruas da comunidade.`,
              time: 'Agora',
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Erro ao viajar:', err);
    } finally {
      window.setTimeout(() => {
        setIsTraveling(false);
        setTravelModalOpen(false);
        setTravelSearch('');
      }, 700);
    }
  };

  // Chat box state
  const [chatOpen, setChatOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: '1',
      sender: 'Paróquia',
      role: 'Acolhida',
      text: `Paz e bem! Bem-vindo(a) ao bairro de ${city.name}/${city.uf}. Explore as ruas e visite a Igreja Matriz!`,
      time: 'Agora',
    },
    {
      id: '2',
      sender: '@maria_paroquiana',
      role: 'Leigo',
      text: 'Que comunidade bonita! Que Deus abençoe a todos.',
      time: 'há 2m',
    },
  ]);

  const activeParish = (targetParishId ? currentWorld.parishes?.find(p => p.id === targetParishId) : null) ?? currentWorld.parishes?.[0];
  const primaryParish = activeParish;
  const residentCount = currentWorld.houses?.length ?? 0;

  // Trigger emote actions
  const triggerEmote = (action: 'pray' | 'cheer' | 'praise') => {
    setCurrentAction(action);
    const feedback =
      action === 'pray'
        ? '🙏 Rezando: Ave Maria, cheia de graça, o Senhor é convosco...'
        : action === 'cheer'
        ? '🎉 Viva Cristo Rei e Nossa Senhora Aparecida!'
        : '📣 Glória a Deus nas alturas e paz na terra aos homens!';
    setActionFeedback(feedback);

    // Broadcast into chat
    const actionMsg: ChatMessage = {
      id: String(Date.now()),
      sender: `@${username}`,
      role: ROLES.find(r => r.id === role)?.label ?? 'Fiel',
      text: feedback,
      time: 'Agora',
    };
    setChatMessages(prev => [...prev, actionMsg]);

    window.setTimeout(() => {
      setCurrentAction(null);
      setActionFeedback(null);
    }, 3200);
  };

  // Keyboard shortcuts for actions (E = pray, C = cheer, G = praise, V = travel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const k = e.key.toLowerCase();
      if (k === 'e') {
        e.preventDefault();
        triggerEmote('pray');
      } else if (k === 'c') {
        e.preventDefault();
        triggerEmote('cheer');
      } else if (k === 'g') {
        e.preventDefault();
        triggerEmote('praise');
      } else if (k === 'v') {
        e.preventDefault();
        setTravelModalOpen(o => !o);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [role, username]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    const newMsg: ChatMessage = {
      id: String(Date.now()),
      sender: `@${username}`,
      role: ROLES.find(r => r.id === role)?.label ?? 'Fiel',
      text: trimmed,
      time: 'Agora',
    };
    setChatMessages(prev => [...prev, newMsg]);
    setInputMessage('');
  };

  const characterConfig = useMemo<WalkCharacterConfig>(() => ({
    gender,
    role,
    username,
  }), [gender, role, username]);

  const currentRoleObj = ROLES.find(r => r.id === role) ?? ROLES[0];

  return (
    <div className="walk-mode-overlay" role="dialog" aria-modal="true" aria-label="Modo Passear 3D no Bairro">
      {/* 3D Scene */}
      <Walk3DScene
        city={currentCity}
        world={currentWorld}
        character={characterConfig}
        onExit={onExit}
        currentAction={currentAction}
        targetParishId={targetParishId}
        autoWalk={autoWalk}
      />

      {!cleanMode && (
        <>
          {/* Top Left Navigation Bar */}
          <div className="walk-hud-top-left">
            <button
              type="button"
              className="walk-hud-pill walk-exit-button"
              onClick={onExit}
              title="Voltar para o mapa (Esc)"
            >
              <X size={16} />
              <span>Sair</span>
            </button>

            <div className="walk-hud-pill walk-location-pill" title="Localização atual no mapa">
              <MapPin size={15} className="walk-icon-pin" />
              <span className="walk-location-text">
                <strong>{currentCity.name}</strong>/{currentCity.uf}
                {activeParish && <small> · {activeParish.name}</small>}
              </span>
            </div>

            <div className="walk-hud-pill walk-residents-pill" title="Total de moradores cadastrados no bairro">
              <Users size={15} />
              <span><strong>{residentCount}</strong> {residentCount === 1 ? 'fiel' : 'fiéis'} aqui</span>
            </div>
          </div>

          {/* Top Center Controls Banner (matching reference style) */}
          <div className="walk-controls-banner" role="status" aria-live="polite">
            {actionFeedback ? (
              <span className="walk-action-feedback">{actionFeedback}</span>
            ) : (
              <span><strong>W A S D</strong> anda · <strong>setas ou arraste</strong> giram a câmera · <strong>Shift</strong> corre · <strong>V</strong> viaja · <strong>E</strong> ora · <strong>C</strong> comemora · <strong>Esc</strong> sai</span>
            )}
          </div>

          {/* Top Right Character Customizer & Travel */}
          <div className="walk-hud-top-right">
            {/* Travel Button */}
            <button
              type="button"
              className="walk-hud-pill walk-travel-btn"
              onClick={() => setTravelModalOpen(true)}
              title="Viajar para qualquer cidade do Brasil (Atalho: V)"
            >
              <span className="travel-btn-icon">✈️</span>
              <span>viajar</span>
            </button>

            {/* Gender Toggle */}
            <div className="walk-gender-toggle" role="group" aria-label="Gênero do personagem">
              <button
                type="button"
                className={`gender-btn ${gender === 'male' ? 'active' : ''}`}
                onClick={() => setGender('male')}
                title="Personagem Masculino"
              >
                👨 Masculino
              </button>
              <button
                type="button"
                className={`gender-btn ${gender === 'female' ? 'active' : ''}`}
                onClick={() => setGender('female')}
                title="Personagem Feminino"
              >
                👩 Feminino
              </button>
            </div>

            {/* Role Selector Dropdown */}
            <div className="walk-role-dropdown-wrap">
              <button
                type="button"
                className="walk-hud-pill walk-role-trigger"
                onClick={() => setRoleMenuOpen(v => !v)}
                title="Alterar papel/traje litúrgico do personagem"
              >
                <span className="role-icon">{currentRoleObj.icon}</span>
                <span>{currentRoleObj.label}</span>
                <ChevronDown size={14} className={roleMenuOpen ? 'rotate-180' : ''} />
              </button>

              {roleMenuOpen && (
                <div className="walk-role-menu">
                  <div className="walk-role-menu-header">
                    <strong>Vestes e Papéis na Comunidade</strong>
                    <small>Trajes devidamente compostos para cada missão</small>
                  </div>
                  <div className="walk-role-list">
                    {ROLES.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        className={`walk-role-item ${role === r.id ? 'active' : ''}`}
                        onClick={() => {
                          setRole(r.id);
                          setRoleMenuOpen(false);
                        }}
                      >
                        <span className="item-icon">{r.icon}</span>
                        <div className="item-details">
                          <strong>{r.label}</strong>
                          <small>{r.description}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Right Emote Actions */}
          <div className="walk-hud-bottom-right">
            <button
              type="button"
              className="walk-action-button pray-btn"
              onClick={() => triggerEmote('pray')}
              title="Fazer uma oração (Atalho: E)"
            >
              <span className="action-icon">🙏</span>
              <span className="action-label">Orar <kbd>E</kbd></span>
            </button>

            <button
              type="button"
              className="walk-action-button cheer-btn"
              onClick={() => triggerEmote('cheer')}
              title="Comemorar com júbilo (Atalho: C)"
            >
              <span className="action-icon">🎉</span>
              <span className="action-label">Comemorar <kbd>C</kbd></span>
            </button>

            <button
              type="button"
              className="walk-action-button praise-btn"
              onClick={() => triggerEmote('praise')}
              title="Dar um grito de louvor (Atalho: G)"
            >
              <span className="action-icon">📣</span>
              <span className="action-label">Louvor <kbd>G</kbd></span>
            </button>
          </div>

          {/* Bottom Left Chat Component (Prepared for Global Chat) */}
          <div className={`walk-chat-box ${chatOpen ? 'expanded' : 'collapsed'}`}>
            <button
              type="button"
              className="walk-chat-toggle"
              onClick={() => setChatOpen(o => !o)}
              aria-expanded={chatOpen}
            >
              <MessageCircle size={16} />
              <span>Chat do Bairro · {primaryParish?.name ?? currentCity.name}</span>
              <span className="chat-badge">{chatMessages.length}</span>
            </button>

            {chatOpen && (
              <div className="walk-chat-content">
                <div className="walk-chat-messages">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className="walk-chat-msg">
                      <div className="msg-header">
                        <span className="msg-role">{msg.role}</span>
                        <span className="msg-sender">{msg.sender}</span>
                        <span className="msg-time">{msg.time}</span>
                      </div>
                      <div className="msg-body">{msg.text}</div>
                    </div>
                  ))}
                </div>

                <form className="walk-chat-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Enviar mensagem para o bairro..."
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    maxLength={180}
                  />
                  <button type="submit" disabled={!inputMessage.trim()}>
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </>
      )}

      {/* Travel Modal Dialog */}
      {travelModalOpen && (
        <div className="walk-travel-dialog-backdrop" onClick={() => setTravelModalOpen(false)}>
          <div className="walk-travel-dialog" onClick={e => e.stopPropagation()}>
            <div className="travel-dialog-header">
              <div className="travel-dialog-title">
                <span className="travel-header-icon">✈️</span>
                <div>
                  <h4>Viajar pelo Brasil</h4>
                  <p>Escolha qualquer uma das 5.570 cidades ou paróquias para caminhar</p>
                </div>
              </div>
              <button
                type="button"
                className="travel-close-btn"
                onClick={() => setTravelModalOpen(false)}
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            <div className="travel-search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar cidade por nome ou UF (ex: Aparecida, Rio de Janeiro, Niquelândia)..."
                value={travelSearch}
                onChange={e => setTravelSearch(e.target.value)}
                autoFocus
              />
              {travelSearch && (
                <button type="button" className="clear-search-btn" onClick={() => setTravelSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            {travelSearch.trim().length >= 2 ? (
              <div className="travel-results-list">
                {isSearchingTravel ? (
                  <div className="travel-status-msg">
                    <Loader2 size={18} className="animate-spin" /> Buscando municípios...
                  </div>
                ) : travelResults.length > 0 ? (
                  travelResults.map(mun => (
                    <button
                      key={mun.code}
                      type="button"
                      className={`travel-result-item ${mun.code === currentCity.code ? 'current' : ''}`}
                      onClick={() => handleTravelToCity(mun.code, mun.name, mun.uf)}
                    >
                      <MapPin size={16} className="item-pin" />
                      <div className="item-info">
                        <span className="city-title">
                          <strong>{mun.name}</strong> <span className="uf-tag">{mun.uf}</span>
                        </span>
                        <small>{mun.catalog_parishes ? `${mun.catalog_parishes} paróquias` : 'Comunidade católica'}</small>
                      </div>
                      {mun.code === currentCity.code ? (
                        <span className="current-badge">Você está aqui</span>
                      ) : (
                        <span className="fly-btn">Viajar ✈️</span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="travel-status-msg">Nenhum município encontrado com este nome.</div>
                )}
              </div>
            ) : (
              <div className="travel-quick-destinations">
                <div className="section-label">⚡ Destinos Populares & Santuários</div>
                <div className="destinations-grid">
                  {POPULAR_DESTINATIONS.map(dest => (
                    <button
                      key={dest.code}
                      type="button"
                      className={`quick-dest-pill ${dest.code === currentCity.code ? 'current' : ''}`}
                      onClick={() => handleTravelToCity(dest.code, dest.name, dest.uf)}
                    >
                      <span className="dest-icon">{dest.icon}</span>
                      <div className="dest-text">
                        <strong>{dest.name} · {dest.uf}</strong>
                        <small>{dest.highlight}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cinematic In-Flight Travel Overlay */}
      {isTraveling && (
        <div className="walk-travel-overlay" role="alert" aria-live="assertive">
          <div className="walk-travel-card">
            <div className="travel-flight-icon">✈️</div>
            <h3>Viajando para {travelTargetName}...</h3>
            <p>Sobrevoando as regiões do Brasil e preparando a paróquia!</p>
            <div className="travel-progress-bar">
              <div className="travel-progress-fill" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
