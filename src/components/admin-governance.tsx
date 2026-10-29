'use client';

import { useTransition, useState } from 'react';
import { Crown, Cross, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Send, ArrowUpRight } from 'lucide-react';
import { approvePriestReferralAction, tallyGovernanceWeeklyAction } from '@/app/actions';

export function AdminProposals({
  proposals,
}: {
  proposals: Array<{
    id: number;
    cycle_week: string;
    president_username: string;
    title: string;
    description: string;
    category: string;
    status: string;
    admin_notes: string | null;
    created_at: Date | string;
  }>;
}) {
  return (
    <div className="admin-proposals-view">
      <div className="admin-card">
        <div className="panel-heading">
          <div>
            <h2>Gabinete de Inovação · Propostas Presidenciais</h2>
            <p>O Presidente do Brasil é a única autoridade com poder exclusivo de propor melhorias para o jogo.</p>
          </div>
          <span className="pill">{proposals.length} propostas</span>
        </div>
      </div>

      {!proposals.length ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Crown size={36} style={{ color: '#b88f40', margin: '0 auto 12px' }} />
          <h3>Nenhuma proposta presidencial enviada ainda</h3>
          <p className="field-note">
            Quando o Presidente da República em mandato submeter uma sugestão formal pelo mapa, ela aparecerá aqui com prioridade para a AcutisTech.
          </p>
        </div>
      ) : (
        <div className="proposals-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {proposals.map(p => (
            <div key={p.id} className="admin-card proposal-card" style={{ padding: '20px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span className="eyebrow" style={{ color: '#059669', fontWeight: 700 }}>
                    🇧🇷 PRESIDENTE @{p.president_username} · CICLO {p.cycle_week}
                  </span>
                  <h3 style={{ margin: '4px 0', fontSize: '18px' }}>{p.title}</h3>
                </div>
                <span className={`status-pill ${p.status === 'approved' ? 'highlight-pill' : ''}`}>
                  {p.status === 'pending' ? '⏳ Aguardando Análise' : p.status === 'approved' ? '✅ Aprovada' : p.status}
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {p.description}
              </p>
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="field-note">
                  Enviada em {new Date(p.created_at).toLocaleDateString('pt-BR')} · Categoria: <strong>{p.category}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminPriestVerifications({
  referrals,
}: {
  referrals: Array<{
    id: number;
    referrer_username: string;
    referred_username: string;
    priest_title: string;
    parish_name: string;
    city_name: string;
    uf: string;
    bonus_awarded: boolean;
    created_at: Date | string;
  }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleApprove = (id: number) => {
    startTransition(async () => {
      const res = await approvePriestReferralAction(id);
      if (res?.success) {
        setToast({ message: res.success, type: 'success' });
      } else {
        setToast({ message: res?.error ?? 'Falha ao aprovar sacerdote.', type: 'error' });
      }
    });
  };

  return (
    <div className="admin-priests-view">
      {toast && (
        <div className={`duplicate-toast ${toast.type}`} role="status">
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      <div className="admin-card">
        <div className="panel-heading">
          <div>
            <h2>Verificação de Padres & Concessão de +500 XP</h2>
            <p>
              Ao aprovar uma indicação, a paróquia recebe o <strong>Upgrade Sagrado</strong> (Cruz de Ouro com Aura Celestial e Bênção Pastoral) e o fiel indicador ganha <strong>+500 XP</strong> imediatos!
            </p>
          </div>
          <span className="pill">{referrals.filter(r => !r.bonus_awarded).length} pendentes</span>
        </div>
      </div>

      {!referrals.length ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Cross size={36} style={{ color: '#b88f40', margin: '0 auto 12px' }} />
          <h3>Nenhuma indicação de padre pendente</h3>
          <p className="field-note">
            Quando os fiéis marcarem seus sacerdotes nas paróquias, os registros aparecerão aqui para verificação oficial.
          </p>
        </div>
      ) : (
        <div className="referrals-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
          {referrals.map(r => (
            <div key={r.id} className="admin-card" style={{ padding: '20px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="eyebrow" style={{ color: '#b88f40', fontWeight: 700 }}>
                    {r.city_name} · {r.uf} · {r.parish_name}
                  </span>
                  <h3 style={{ margin: '4px 0 2px' }}>
                    {r.priest_title} Pe. @{r.referred_username}
                  </h3>
                  <p className="field-note" style={{ margin: '4px 0 0' }}>
                    Indicado com fé pelo morador <strong>@{r.referrer_username}</strong> em {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  {r.bonus_awarded ? (
                    <span className="status-pill highlight-pill">
                      ✨ Aprovado (+500 XP liberados)
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      style={{ background: '#16a34a', borderColor: '#16a34a' }}
                      disabled={isPending}
                      onClick={() => handleApprove(r.id)}
                    >
                      <CheckCircle2 size={15} /> Aprovar Padre (+500 XP)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GovernanceTallyButton() {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleTally = () => {
    if (!confirm('Deseja processar a apuração e posse da governança semanal agora? O Presidente eleito, Governadores de cada Estado, Prefeitos e Sacristãos serão determinados com a regra de cascata.')) return;
    startTransition(async () => {
      const res = await tallyGovernanceWeeklyAction();
      setFeedback(res?.success ?? res?.error ?? 'Concluído.');
    });
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <button
        type="button"
        className="outline-button"
        disabled={isPending}
        onClick={handleTally}
        title="Apura votos presidenciais e rankings para empossar Presidente, Governadores e Prefeitos da semana"
      >
        <RefreshCw size={14} className={isPending ? 'spin' : ''} /> {isPending ? 'Apurando…' : 'Rodar Apuração Semanal'}
      </button>
      {feedback && <small style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>{feedback}</small>}
    </div>
  );
}
