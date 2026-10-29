'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Target,
  Flame,
  Award,
  Vote,
  User,
  Heart,
  Home,
  Crown,
  Cross,
  Compass,
  ArrowUpRight,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { getUserMissionsStatusAction, performCheckinAction } from '@/app/actions';

interface DailyMissionsProps {
  isOpen: boolean;
  onToggle: () => void;
  activeUsername?: string | null;
  onOpenWalk?: () => void;
  onOpenCreateHouse?: () => void;
  onOpenHowItWorks?: () => void;
  onSelectParishMatriz?: () => void;
}

export function DailyMissionsBoard({
  isOpen,
  onToggle,
  activeUsername,
  onOpenWalk,
  onOpenCreateHouse,
  onOpenHowItWorks,
  onSelectParishMatriz,
}: DailyMissionsProps) {
  const [isPending, startTransition] = useTransition();
  const [userData, setUserData] = useState<{
    houseId: number;
    username: string;
    displayName: string;
    xp: number;
    level: number;
    streakDays: number;
    parishName: string;
    missions: Record<string, boolean>;
  } | null>(null);

  const [walkDoneSession, setWalkDoneSession] = useState(false);

  // Dynamic date header (e.g. "QUINTA-FEIRA · 29/10")
  const dateFormatted = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${weekday.toUpperCase()} · ${day}/${month}`;
  }, []);

  // Fetch real mission status whenever activeUsername changes
  useEffect(() => {
    if (!activeUsername) {
      setUserData(null);
      return;
    }

    startTransition(async () => {
      try {
        const res = await getUserMissionsStatusAction(activeUsername);
        if (res) {
          setUserData(res);

          // Auto-checkin se ainda não tiver feito check-in hoje
          if (!res.missions.checkin) {
            const checkinRes = await performCheckinAction(activeUsername);
            if (checkinRes.success) {
              setUserData(prev => prev ? {
                ...prev,
                streakDays: checkinRes.streak,
                missions: { ...prev.missions, checkin: true },
              } : null);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao sincronizar missões do usuário', err);
      }
    });
  }, [activeUsername]);

  // Combined missions status (system verified)
  const systemMissions: Record<string, boolean> = useMemo(() => {
    const base = userData?.missions ?? {};
    return {
      checkin: !!base.checkin,
      intention: !!base.intention,
      walk: walkDoneSession || !!base.walk,
      comment: !!base.comment,
      vote: !!base.vote,
      matriz_visit: !!base.matriz_visit,
      streak: !!base.streak || (userData ? userData.streakDays >= 7 : false),
      referral_house: !!base.referral_house,
      refer_priest: !!base.refer_priest,
      priest_verified: !!base.priest_verified,
    };
  }, [userData, walkDoneSession]);

  const missions = [
    // FÁCEIS
    {
      id: 'checkin',
      tier: 'easy',
      title: 'Faça o Check-in Diário de Oração',
      desc: 'Entre com seu @ e confirme sua oração diária',
      xp: '+10 XP',
      icon: '📿',
    },
    {
      id: 'intention',
      tier: 'easy',
      title: 'Registre 1 Intenção de Oração no mural',
      desc: 'Peça oração ou agradeça por uma graça na sua paróquia',
      xp: '+10 XP',
      icon: '🕊️',
    },
    {
      id: 'walk',
      tier: 'easy',
      title: 'Passeie 5 min com o seu bonequinho',
      desc: 'Explore as ruas, praça e a Igreja Matriz em 3D',
      xp: '+15 XP',
      icon: '🚶',
      action: onOpenWalk
        ? {
            label: 'Passear em 3D',
            onClick: () => {
              setWalkDoneSession(true);
              onOpenWalk();
            },
          }
        : undefined,
    },
    {
      id: 'comment',
      tier: 'easy',
      title: 'Faça 3 comentários ou marque @ de amigos',
      desc: 'Comente nos posts do @meu_lugar_na_igreja',
      xp: '+15 XP',
      icon: '💬',
      link: 'https://www.instagram.com/meu_lugar_na_igreja/',
    },

    // MÉDIAS
    {
      id: 'vote',
      tier: 'medium',
      title: 'Vote para Presidente da República',
      desc: 'Participe da eleição católica semanal (sexta a domingo)',
      xp: '+25 XP',
      icon: '🗳️',
    },
    {
      id: 'matriz_visit',
      tier: 'medium',
      title: 'Visite a Igreja Matriz e reze na praça',
      desc: 'Localize e selecione a matriz da comunidade',
      xp: '+20 XP',
      icon: '⛪',
      action: onSelectParishMatriz
        ? { label: 'Ver Matriz', onClick: onSelectParishMatriz }
        : undefined,
    },
    {
      id: 'streak',
      tier: 'medium',
      title: 'Mantenha 7 dias seguidos de oração (Streak)',
      desc: 'Bônus sagrado de fidelidade e constância espiritual',
      xp: '+35 XP',
      icon: '🔥',
    },

    // DIFÍCEIS / ESPECIAIS
    {
      id: 'referral_house',
      tier: 'hard',
      title: 'Indique 1 amigo que crie a casa no mapa',
      desc: 'Ganhe bônus sagrado quando seu amigo construir',
      xp: '+100 XP',
      icon: '🏡',
      action: onOpenCreateHouse
        ? { label: 'Construir casa', onClick: onOpenCreateHouse }
        : undefined,
    },
    {
      id: 'refer_priest',
      tier: 'hard',
      title: 'Marque o @ do seu Pároco ou Vigário',
      desc: 'Convide o padre da sua paróquia para a comunidade',
      xp: '+15 XP',
      icon: '✝️',
    },
    {
      id: 'priest_verified',
      tier: 'hard',
      title: 'Pároco aprovado e consagrado na Matriz',
      desc: 'Igreja ganha cruz dourada e todos ganham +10% XP',
      xp: '+500 XP',
      icon: '✨',
    },
  ];

  const totalCount = missions.length;
  const completedCount = Object.keys(systemMissions).filter(k => systemMissions[k]).length;

  return (
    <aside
      className={`missions-drawer-wrapper ${isOpen ? 'drawer-open' : 'drawer-collapsed'}`}
      aria-label="Quadro Lateral de Missões Diárias"
    >
      {/* Alça Lateral Suspensa (Sempre acessível para recolher ou expandir) */}
      <button
        type="button"
        className="missions-drawer-tab"
        onClick={onToggle}
        aria-label={isOpen ? 'Recolher quadro de missões' : 'Abrir quadro de missões'}
        title={isOpen ? 'Recolher na lateral' : 'Expandir missões do dia'}
      >
        <span className="drawer-tab-badge">🎯 MISSÕES</span>
        <span className="drawer-tab-count">
          {completedCount}/{totalCount}
        </span>
        <span className="drawer-tab-arrow" aria-hidden="true">
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {/* Conteúdo Principal do Quadro */}
      <div className="missions-board-card">
        {/* Card Header matching Domine Com Seu Time */}
        <div className="missions-card-header">
          <button
            type="button"
            className="missions-close-btn"
            onClick={onToggle}
            aria-label="Recolher na lateral"
            title="Recolher na lateral"
          >
            <X size={17} />
          </button>

          <div className="missions-date-pill">{dateFormatted}</div>

          <div className="missions-title-wrap">
            <h2 className="missions-title">10 MISSÕES DO DIA</h2>
          </div>

          <p className="missions-subtitle">
            O sistema valida seu progresso e credita o XP na sua casa!
          </p>
        </div>

        {/* User Identification Banner */}
        <div className="missions-user-status-bar">
          {userData ? (
            <div className="user-active-info">
              <span className="user-dot online" aria-hidden="true" />
              <span>
                <strong>@{userData.username}</strong> · Nível {userData.level} ({userData.xp} XP)
              </span>
              {userData.streakDays > 0 && (
                <span className="streak-badge" title={`${userData.streakDays} dias seguidos`}>
                  🔥 {userData.streakDays}d
                </span>
              )}
            </div>
          ) : (
            <div className="user-guest-info">
              <span>💡 Digite seu <strong>@</strong> na busca superior para registrar seu progresso!</span>
            </div>
          )}
        </div>

        {/* Scrollable Missions List */}
        <div
          className="missions-scroll-area"
          onWheel={e => e.stopPropagation()}
        >
          {/* TIER 1: FÁCEIS */}
          <div className="missions-tier-group">
            <div className="missions-tier-header tier-easy">
              <span className="tier-tag">FÁCEIS</span>
              <span className="tier-reward">+10 a +15 XP cada</span>
            </div>
            <ul className="missions-list">
              {missions
                .filter(m => m.tier === 'easy')
                .map(m => {
                  const done = !!systemMissions[m.id];
                  return (
                    <li key={m.id} className={`mission-item ${done ? 'done' : ''}`}>
                      <div className="mission-status-indicator" aria-hidden="true">
                        {done ? (
                          <span className="status-circle completed">✓</span>
                        ) : (
                          <span className="status-circle pending">{m.icon}</span>
                        )}
                      </div>

                      <div className="mission-content">
                        <div className="mission-row">
                          <strong className="mission-name">{m.title}</strong>
                          <span className={`mission-xp-tag ${done ? 'tag-done' : ''}`}>
                            {done ? '✓ Feito' : m.xp}
                          </span>
                        </div>
                        <span className="mission-desc">{m.desc}</span>
                      </div>

                      {!done && m.action && (
                        <button
                          type="button"
                          className="mission-action-btn"
                          onClick={m.action.onClick}
                        >
                          {m.action.label}
                        </button>
                      )}

                      {!done && m.link && (
                        <a
                          href={m.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mission-action-link"
                          title="Abrir Instagram oficial"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>

          {/* TIER 2: MÉDIAS */}
          <div className="missions-tier-group">
            <div className="missions-tier-header tier-medium">
              <span className="tier-tag">MÉDIAS</span>
              <span className="tier-reward">+20 a +35 XP cada</span>
            </div>
            <ul className="missions-list">
              {missions
                .filter(m => m.tier === 'medium')
                .map(m => {
                  const done = !!systemMissions[m.id];
                  return (
                    <li key={m.id} className={`mission-item ${done ? 'done' : ''}`}>
                      <div className="mission-status-indicator" aria-hidden="true">
                        {done ? (
                          <span className="status-circle completed">✓</span>
                        ) : (
                          <span className="status-circle pending">{m.icon}</span>
                        )}
                      </div>

                      <div className="mission-content">
                        <div className="mission-row">
                          <strong className="mission-name">{m.title}</strong>
                          <span className={`mission-xp-tag ${done ? 'tag-done' : ''}`}>
                            {done ? '✓ Feito' : m.xp}
                          </span>
                        </div>
                        <span className="mission-desc">{m.desc}</span>
                      </div>

                      {!done && m.action && (
                        <button
                          type="button"
                          className="mission-action-btn"
                          onClick={m.action.onClick}
                        >
                          {m.action.label}
                        </button>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>

          {/* TIER 3: DIFÍCEIS / ESPECIAIS */}
          <div className="missions-tier-group">
            <div className="missions-tier-header tier-hard">
              <span className="tier-tag">DIFÍCEIS / ESPECIAIS</span>
              <span className="tier-reward">+100 a +500 XP</span>
            </div>
            <ul className="missions-list">
              {missions
                .filter(m => m.tier === 'hard')
                .map(m => {
                  const done = !!systemMissions[m.id];
                  return (
                    <li key={m.id} className={`mission-item ${done ? 'done' : ''}`}>
                      <div className="mission-status-indicator" aria-hidden="true">
                        {done ? (
                          <span className="status-circle completed">✓</span>
                        ) : (
                          <span className="status-circle pending">{m.icon}</span>
                        )}
                      </div>

                      <div className="mission-content">
                        <div className="mission-row">
                          <strong className="mission-name">{m.title}</strong>
                          <span className={`mission-xp-tag ${done ? 'tag-done' : 'gold-tag'}`}>
                            {done ? '✓ Feito' : m.xp}
                          </span>
                        </div>
                        <span className="mission-desc">{m.desc}</span>
                      </div>

                      {!done && m.action && (
                        <button
                          type="button"
                          className="mission-action-btn"
                          onClick={m.action.onClick}
                        >
                          {m.action.label}
                        </button>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>

        {/* Footer Bonus Banner */}
        <div className="missions-bonus-banner">
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <div className="missions-bonus-text">
            <strong>FEZ TODAS? +50 XP DE BÔNUS</strong>
            <small>O sistema valida e credita o bônus na sua residência</small>
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="missions-footer-cta">
          <button
            type="button"
            className="missions-cta-btn"
            onClick={() => {
              if (onOpenHowItWorks) onOpenHowItWorks();
            }}
          >
            <span>📜 VER COMO FUNCIONA O JOGO</span>
            <small>iguais pra todo mundo · os pontos sobem a sua casa</small>
          </button>
        </div>
      </div>
    </aside>
  );
}
