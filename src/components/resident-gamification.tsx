'use client';

import { useState, useTransition } from 'react';
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
} from 'lucide-react';
import type { House, Parish, City } from '@/lib/types';
import {
  calculateLevel,
  getLiturgicalRole,
  getHouseVisualStage,
  xpProgressInLevel,
  isElectionWindowOpen,
} from '@/lib/gamification-rules.mjs';
import {
  performCheckinAction,
  submitPrayerAction,
  votePresidentialAction,
  submitPresidentialProposalAction,
  updateMayorSettingsAction,
  referPriestAction,
} from '@/app/actions';

export function ResidentGamificationCard({
  house,
  city,
  parish,
  onUpdate,
}: {
  house: House;
  city: City;
  parish?: Parish;
  onUpdate?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'faith' | 'powers' | 'priest'>('profile');

  // Formulários internos
  const [prayerText, setPrayerText] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDesc, setProposalDesc] = useState('');
  const [mayorMsg, setMayorMsg] = useState(city.mayor_message ?? '');
  const [patronFestival, setPatronFestival] = useState(city.patron_festival_active ?? false);
  const [priestHandle, setPriestHandle] = useState('');
  const [priestTitle, setPriestTitle] = useState('Pároco');

  const level = house.level ?? calculateLevel(house.xp ?? 0);
  const xp = house.xp ?? 0;
  const isCreator = house.role === 'criador' || level === 99 || house.username === 'lucasgfr26';
  const roleInfo = getLiturgicalRole(level, house.role);
  const stageInfo = getHouseVisualStage(level, house.civil_role, isCreator);
  const progress = xpProgressInLevel(xp);
  const electionOpen = isElectionWindowOpen();

  const handleCheckin = () => {
    startTransition(async () => {
      const res = await performCheckinAction(house.username);
      if (res.success) {
        setFeedback({ message: res.message, type: 'success' });
        onUpdate?.();
      } else {
        setFeedback({ message: res.message, type: 'error' });
      }
    });
  };

  const handlePrayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parish) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append('city_code', String(city.code));
      fd.append('parish_id', String(parish.id));
      fd.append('username', house.username);
      fd.append('display_name', house.display_name);
      fd.append('intention', prayerText);

      const res = await submitPrayerAction({}, fd);
      if (res?.success) {
        setFeedback({ message: res.success, type: 'success' });
        setPrayerText('');
        onUpdate?.();
      } else {
        setFeedback({ message: res?.error ?? 'Erro ao enviar intenção.', type: 'error' });
      }
    });
  };

  const handleProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append('president_username', house.username);
      fd.append('title', proposalTitle);
      fd.append('description', proposalDesc);
      fd.append('category', 'gameplay');

      const res = await submitPresidentialProposalAction({}, fd);
      if (res?.success) {
        setFeedback({ message: res.success, type: 'success' });
        setProposalTitle('');
        setProposalDesc('');
      } else {
        setFeedback({ message: res?.error ?? 'Erro ao submeter proposta.', type: 'error' });
      }
    });
  };

  const handleMayorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append('username', house.username);
      fd.append('city_code', String(city.code));
      fd.append('mayor_message', mayorMsg);
      if (patronFestival) fd.append('patron_festival', 'true');

      const res = await updateMayorSettingsAction({}, fd);
      if (res?.success) {
        setFeedback({ message: res.success, type: 'success' });
        onUpdate?.();
      } else {
        setFeedback({ message: res?.error ?? 'Erro ao atualizar prefeitura.', type: 'error' });
      }
    });
  };

  const handlePriestReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parish) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append('referrer_username', house.username);
      fd.append('priest_username', priestHandle);
      fd.append('priest_title', priestTitle);
      fd.append('city_code', String(city.code));
      fd.append('parish_id', String(parish.id));

      const res = await referPriestAction({}, fd);
      if (res?.success) {
        setFeedback({ message: res.success, type: 'success' });
        setPriestHandle('');
        onUpdate?.();
      } else {
        setFeedback({ message: res?.error ?? 'Erro ao indicar sacerdote.', type: 'error' });
      }
    });
  };

  return (
    <div className="gamification-card">
      {/* Feedback Toast */}
      {feedback && (
        <div className={`gamification-feedback ${feedback.type}`} role="status">
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)}>×</button>
        </div>
      )}

      {/* Badges de Títulos e Governança */}
      <div className="gamification-badges-row">
        {isCreator ? (
          <span className="game-badge badge-creator">
            <Crown size={13} /> Criador da Plataforma
          </span>
        ) : house.civil_role === 'presidente' ? (
          <span className="game-badge badge-president">
            🇧🇷 Presidente do Brasil
          </span>
        ) : house.civil_role === 'governador' ? (
          <span className="game-badge badge-governor">
            🏛️ Governador de {city.uf}
          </span>
        ) : house.civil_role === 'prefeito' ? (
          <span className="game-badge badge-mayor">
            🏙️ Prefeito de {city.name}
          </span>
        ) : null}

        {house.is_founder && (
          <span className="game-badge badge-founder" title="Primeiro morador a chegar e fundar esta cidade!">
            ⭐ Fundador da Cidade
          </span>
        )}

        <span className="game-badge badge-role">
          {roleInfo.icon} {roleInfo.title}
        </span>
      </div>

      {/* Abas Superiores */}
      <div className="gamification-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Award size={13} /> Nível & Casa
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'faith' ? 'active' : ''}`}
          onClick={() => setActiveTab('faith')}
        >
          <Flame size={13} /> Ações da Fé
        </button>
        {(house.civil_role || isCreator) && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'powers' ? 'active' : ''}`}
            onClick={() => setActiveTab('powers')}
          >
            <Flag size={13} /> Gabinete
          </button>
        )}
        {parish && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'priest' ? 'active' : ''}`}
            onClick={() => setActiveTab('priest')}
          >
            <Cross size={13} /> Padre (+500 XP)
          </button>
        )}
      </div>

      {/* ABA 1: PERFIL, NÍVEL E EVOLUÇÃO DA CASA */}
      {activeTab === 'profile' && (
        <div className="gamification-tab-body">
          {/* Barra de Progresso de XP */}
          <div className="xp-progress-block">
            <div className="xp-progress-header">
              <span>
                <strong>Nível {level}</strong> · {roleInfo.title}
              </span>
              <span className="xp-count">
                {xp.toLocaleString('pt-BR')} XP {level < 99 && `(${progress.xpEarnedInLevel}/${progress.xpNeededInLevel} no nível)`}
              </span>
            </div>
            <div className="xp-track">
              <div className="xp-bar" style={{ width: `${level >= 99 ? 100 : progress.progressPct}%` }} />
            </div>
            <p className="role-description-text">{roleInfo.description}</p>
          </div>

          {/* Estágio Visual da Construção */}
          <div className="house-stage-box">
            <div className="stage-header">
              <span className="stage-tag">Estágio da Construção</span>
              {stageInfo.flag && <span className="stage-flag">{stageInfo.flag}</span>}
            </div>
            <h4>{stageInfo.name}</h4>
            <span className="stage-sub">{stageInfo.subtitle}</span>
            <p>{stageInfo.description}</p>
          </div>
        </div>
      )}

      {/* ABA 2: AÇÕES DA FÉ (CHECK-IN E ORAÇÃO) */}
      {activeTab === 'faith' && (
        <div className="gamification-tab-body">
          {/* Check-in Diário */}
          <div className="faith-action-card">
            <div className="faith-header">
              <Calendar size={18} className="faith-icon" />
              <div>
                <strong>Check-in da Fé (+10 XP)</strong>
                <p>Sequência ativa: <strong>{house.streak_days ?? 0} dias</strong> de visita diária.</p>
              </div>
            </div>
            <button
              type="button"
              className="primary-button checkin-btn"
              disabled={isPending}
              onClick={handleCheckin}
            >
              {isPending ? 'Confirmando…' : '🙏 Fazer Check-in de Hoje (+10 XP)'}
            </button>
            <small className="field-note">
              Complete 7 dias consecutivos para ganhar <strong>+35 XP</strong> de bônus!
            </small>
          </div>

          {/* Intenção de Oração */}
          {parish && (
            <form className="faith-action-card prayer-form" onSubmit={handlePrayerSubmit}>
              <div className="faith-header">
                <Flame size={18} className="faith-icon candle-icon" />
                <div>
                  <strong>Acender Vela & Deixar Oração (+10 XP)</strong>
                  <p>Sua prece será ouvida no sino da {parish.name}.</p>
                </div>
              </div>
              <textarea
                placeholder="Escreva sua intenção de oração (pela família, saúde, vocações)…"
                rows={2}
                value={prayerText}
                onChange={e => setPrayerText(e.target.value)}
                required
              />
              <button type="submit" className="outline-button" disabled={isPending || !prayerText.trim()}>
                <Send size={13} /> Acender vela e enviar oração (+10 XP)
              </button>
            </form>
          )}

          {/* Voto Presidencial (se aberto) */}
          {electionOpen && (
            <div className="faith-action-card election-card">
              <div className="faith-header">
                <Vote size={18} className="faith-icon" />
                <div>
                  <strong>Eleição Presidencial da Semana (+25 XP)</strong>
                  <p>Urnas abertas de sexta a domingo! Escolha o Presidente do Brasil.</p>
                </div>
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const targetCandidate = prompt('Digite o @ do morador em quem deseja votar para Presidente:');
                  if (!targetCandidate) return;
                  startTransition(async () => {
                    const fd = new FormData();
                    fd.append('voter_username', house.username);
                    fd.append('candidate_username', targetCandidate);
                    const res = await votePresidentialAction({}, fd);
                    if (res?.success) setFeedback({ message: res.success, type: 'success' });
                    else setFeedback({ message: res?.error ?? 'Erro ao votar.', type: 'error' });
                  });
                }}
              >
                <button type="submit" className="outline-button" disabled={isPending}>
                  <Vote size={14} /> Votar para Presidente da República (+25 XP)
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: PODERES DE GOVERNANÇA (PRESIDENTE / PREFEITO / GOVERNADOR) */}
      {activeTab === 'powers' && (
        <div className="gamification-tab-body">
          {/* Poder do Presidente */}
          {house.civil_role === 'presidente' && (
            <form className="governance-box" onSubmit={handleProposalSubmit}>
              <div className="gov-header">
                <Lightbulb size={20} className="gov-icon" />
                <div>
                  <h4>Gabinete Presidencial de Inovação</h4>
                  <p>Como Presidente do Brasil, você tem autoridade exclusiva para sugerir novas funcionalidades para a AcutisTech!</p>
                </div>
              </div>
              <label>
                Título da Funcionalidade
                <input
                  type="text"
                  placeholder="Ex.: Procissão Noturna das Velas no Mapa"
                  value={proposalTitle}
                  onChange={e => setProposalTitle(e.target.value)}
                  required
                />
              </label>
              <label>
                Descrição Detalhada da Ideia
                <textarea
                  placeholder="Descreva como a novidade deve funcionar e como ela abençoará a comunidade…"
                  rows={3}
                  value={proposalDesc}
                  onChange={e => setProposalDesc(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="primary-button" disabled={isPending || !proposalTitle.trim()}>
                <Crown size={14} /> Enviar Proposta Formal à AcutisTech
              </button>
            </form>
          )}

          {/* Poder do Prefeito */}
          {house.civil_role === 'prefeito' && (
            <form className="governance-box" onSubmit={handleMayorSubmit}>
              <div className="gov-header">
                <Building size={20} className="gov-icon" />
                <div>
                  <h4>Gabinete do Prefeito de {city.name}</h4>
                  <p>Gerencie os decretos e as celebrações da cidade.</p>
                </div>
              </div>
              <label>
                Mensagem de Acolhida da Cidade (até 100 caracteres)
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Ex.: Sejam bem-vindos à terra do Santíssimo!"
                  value={mayorMsg}
                  onChange={e => setMayorMsg(e.target.value)}
                />
              </label>
              <label className="checkbox-label" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={patronFestival}
                  onChange={e => setPatronFestival(e.target.checked)}
                />
                Ativar Festa do Padroeiro (bandeirinhas festivas nas praças da cidade)
              </label>
              <button type="submit" className="primary-button" disabled={isPending}>
                <Building size={14} /> Publicar Decreto Municipal
              </button>
            </form>
          )}
        </div>
      )}

      {/* ABA 4: INDICAÇÃO SACERDOTAL (+500 XP) */}
      {activeTab === 'priest' && parish && (
        <div className="gamification-tab-body">
          {parish.has_approved_priest ? (
            <div className="priest-approved-box">
              <span className="priest-stamp">✨ PARÓQUIA COM PÁROCO CONFIRMADO</span>
              <h4>{parish.priest_name ?? 'Padre da Paróquia'}</h4>
              <p className="field-note">
                Esta comunidade possui assistência pastoral oficial. Todos os moradores recebem <strong>+10% de XP passivo</strong> em todas as ações, a cruz da torre brilha com luz dourada celestial e a matriz conta com vitrais e capela viva!
              </p>
            </div>
          ) : (
            <form className="priest-referral-form" onSubmit={handlePriestReferral}>
              <div className="referral-header">
                <Cross size={20} style={{ color: '#b88f40' }} />
                <div>
                  <strong>Indicar o Padre da sua Paróquia</strong>
                  <p>Ganhe <strong>+500 XP</strong> imediatos assim que o padre for verificado pela equipe!</p>
                </div>
              </div>
              <label>
                Instagram (@) do Padre
                <input
                  type="text"
                  placeholder="Ex.: @pejoaosilva"
                  value={priestHandle}
                  onChange={e => setPriestHandle(e.target.value)}
                  required
                />
              </label>
              <label>
                Título Pastoral
                <select value={priestTitle} onChange={e => setPriestTitle(e.target.value)}>
                  <option value="Pároco">Pároco</option>
                  <option value="Vigário">Vigário Paroquial</option>
                  <option value="Reitor">Reitor do Santuário</option>
                </select>
              </label>
              <button type="submit" className="primary-button" disabled={isPending || !priestHandle.trim()}>
                <Sparkles size={14} /> Indicar Sacerdote e Solicitar +500 XP
              </button>
              <small className="field-note">
                Ao indicar, você ganha <strong>+15 XP</strong> na hora. Quando o padre confirmar a paróquia e for aprovado no painel, você receberá <strong>+500 XP bônus</strong> e a matriz receberá a Cruz de Ouro Reluzente!
              </small>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
