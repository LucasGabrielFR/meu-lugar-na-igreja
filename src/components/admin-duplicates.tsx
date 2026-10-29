'use client';

import { useState, useTransition } from 'react';
import { Search, Sparkles, Users, CheckCircle2, AlertCircle, X, Trash2, ArrowRight } from 'lucide-react';
import type { DuplicateParishPair } from '@/lib/admin-curation';
import { resolveDuplicatePair, ignoreDuplicatePairDirect } from '@/app/actions';

interface AdminDuplicatesProps {
  pairs: DuplicateParishPair[];
  resolvedCount: number;
}

export default function AdminDuplicates({ pairs, resolvedCount }: AdminDuplicatesProps) {
  const [items, setItems] = useState<DuplicateParishPair[]>(pairs);
  const [resolved, setResolved] = useState<number>(resolvedCount);
  const [filter, setFilter] = useState('');
  const [selectedUf, setSelectedUf] = useState<string>('TODAS');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [, startTransition] = useTransition();

  // Distinct UFs present in remaining items
  const availableUfs = Array.from(new Set(items.map(p => p.uf))).sort();

  const filteredPairs = items.filter(p => {
    if (selectedUf !== 'TODAS' && p.uf !== selectedUf) return false;
    if (!filter.trim()) return true;
    const term = filter.toLowerCase().trim();
    return (
      p.city_name.toLowerCase().includes(term) ||
      p.uf.toLowerCase().includes(term) ||
      p.p1_name.toLowerCase().includes(term) ||
      p.p2_name.toLowerCase().includes(term)
    );
  });

  const totalEvaluated = resolved + items.length;
  const progressPct = totalEvaluated > 0 ? Math.round((resolved / totalEvaluated) * 100) : 100;

  const handleKeep = (keepId: number, removeId: number, keepName: string, removeName: string) => {
    // Optimistic removal: remove any card that references the deleted parish (removeId)
    // or is the current pair
    const previousItems = items;
    const previousResolved = resolved;

    const remainingItems = items.filter(
      p => p.p1_id !== removeId && p.p2_id !== removeId && !(p.p1_id === keepId && p.p2_id === removeId) && !(p.p2_id === keepId && p.p1_id === removeId)
    );

    setItems(remainingItems);
    setResolved(r => r + 1);
    setToast({
      message: `Opção mantida! "${removeName}" foi apagada permanentemente do banco.`,
      type: 'success',
    });

    startTransition(async () => {
      const res = await resolveDuplicatePair(keepId, removeId);
      if (res?.error) {
        // Rollback
        setItems(previousItems);
        setResolved(previousResolved);
        setToast({ message: `Erro ao apagar paróquia: ${res.error}`, type: 'error' });
      }
    });
  };

  const handleIgnore = (id1: number, id2: number) => {
    const previousItems = items;
    const remainingItems = items.filter(p => !(p.p1_id === id1 && p.p2_id === id2));

    setItems(remainingItems);
    setToast({
      message: 'Par marcado como paróquias distintas. O alerta foi removido.',
      type: 'success',
    });

    startTransition(async () => {
      const res = await ignoreDuplicatePairDirect(id1, id2);
      if (res?.error) {
        setItems(previousItems);
        setToast({ message: `Erro ao ignorar par: ${res.error}`, type: 'error' });
      }
    });
  };

  return (
    <div className="admin-duplicates-view">
      {/* Toast Feedback */}
      {toast && (
        <div className={`duplicate-toast ${toast.type}`} role="status">
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar aviso">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main Header & Progress Card */}
      <div className="admin-card duplicates-header-card">
        <div className="panel-heading">
          <div>
            <h2>Curadoria de Duplicações Paroquiais</h2>
            <span className="eyebrow" style={{ color: '#10b981', fontWeight: 700 }}>
              {resolved} paróquias duplicadas já apagadas permanentemente
            </span>
          </div>
          <span className="pill">{items.length} pares restantes</span>
        </div>

        {/* Progress Bar */}
        <div className="duplicate-progress-container">
          <div className="duplicate-progress-header">
            <span>Progresso da Higienização da Base</span>
            <strong>{progressPct}% concluído ({resolved} de {totalEvaluated})</strong>
          </div>
          <div className="duplicate-progress-track">
            <div className="duplicate-progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="duplicate-notice-box">
          <p>
            <strong>Como funciona:</strong> Ao clicar em <strong>&ldquo;Manter esta (Apagar outra)&rdquo;</strong>, a opção descartada é <strong>apagada permanentemente</strong> do banco de dados na mesma hora. Se houver fiéis ou casas cadastradas nela, eles são transferidos automaticamente para a paróquia mantida sem nenhuma perda.
          </p>
          <p className="field-note" style={{ marginTop: '6px' }}>
            <em>Dica: quando um município tem 3 ou mais registros quase idênticos (triplicatas), ao apagar um deles o próximo par restante continua na lista para você decidir.</em>
          </p>
        </div>

        {/* Filters and Search */}
        <div className="duplicate-filters-row">
          <div className="searchbox" style={{ maxWidth: '420px', flex: 1 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por município, UF ou paróquia..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>

          {availableUfs.length > 1 && (
            <div className="uf-filter-pills">
              <button
                type="button"
                className={`uf-pill ${selectedUf === 'TODAS' ? 'active' : ''}`}
                onClick={() => setSelectedUf('TODAS')}
              >
                Todas ({items.length})
              </button>
              {availableUfs.map(uf => {
                const count = items.filter(p => p.uf === uf).length;
                return (
                  <button
                    key={uf}
                    type="button"
                    className={`uf-pill ${selectedUf === uf ? 'active' : ''}`}
                    onClick={() => setSelectedUf(uf)}
                  >
                    {uf} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pairs List */}
      {!filteredPairs.length ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Sparkles size={40} style={{ color: '#10b981', margin: '0 auto 12px' }} />
          <h3>
            {filter || selectedUf !== 'TODAS'
              ? 'Nenhuma duplicata encontrada com os filtros selecionados.'
              : '🎉 Excelente! Nenhuma duplicação pendente no mapa!'}
          </h3>
          <p className="field-note">
            {filter || selectedUf !== 'TODAS'
              ? 'Tente limpar a busca ou selecionar outro estado.'
              : `Todas as duplicatas foram resolvidas. Um total de ${resolved} paróquias foram unificadas.`}
          </p>
        </div>
      ) : (
        <div className="duplicate-pairs-list">
          {filteredPairs.map(pair => {
            const pairKey = `${pair.p1_id}-${pair.p2_id}`;
            return (
              <div key={pairKey} className="admin-card duplicate-pair-card">
                <div className="duplicate-card-header">
                  <div>
                    <span className="eyebrow">
                      {pair.city_name} · {pair.uf}
                    </span>
                    <h3>{pair.city_name} / {pair.uf}</h3>
                  </div>
                  <span className="similarity-badge" title="Grau de similaridade de nomenclatura">
                    {Math.round(pair.similarity * 100)}% similar
                  </span>
                </div>

                <div className="duplicate-comparison-grid">
                  {/* Opção A */}
                  <div className="duplicate-parish-box">
                    <div className="parish-box-header">
                      <span className="box-tag">Opção A (ID #{pair.p1_id})</span>
                      <span className="box-houses">
                        <Users size={13} /> {pair.p1_houses} {pair.p1_houses === 1 ? 'morador' : 'moradores'}
                      </span>
                    </div>
                    <h4>{pair.p1_name}</h4>
                    <div className="parish-box-actions">
                      <button
                        type="button"
                        className="primary-button keep-button"
                        onClick={() => handleKeep(pair.p1_id, pair.p2_id, pair.p1_name, pair.p2_name)}
                      >
                        <Trash2 size={14} /> Manter esta (Apagar Opção B)
                      </button>
                      <small className="action-hint">Exclui permanentemente o ID #{pair.p2_id}</small>
                    </div>
                  </div>

                  {/* Opção B */}
                  <div className="duplicate-parish-box">
                    <div className="parish-box-header">
                      <span className="box-tag">Opção B (ID #{pair.p2_id})</span>
                      <span className="box-houses">
                        <Users size={13} /> {pair.p2_houses} {pair.p2_houses === 1 ? 'morador' : 'moradores'}
                      </span>
                    </div>
                    <h4>{pair.p2_name}</h4>
                    <div className="parish-box-actions">
                      <button
                        type="button"
                        className="primary-button keep-button"
                        onClick={() => handleKeep(pair.p2_id, pair.p1_id, pair.p2_name, pair.p1_name)}
                      >
                        <Trash2 size={14} /> Manter esta (Apagar Opção A)
                      </button>
                      <small className="action-hint">Exclui permanentemente o ID #{pair.p1_id}</small>
                    </div>
                  </div>
                </div>

                <div className="duplicate-card-footer">
                  <button
                    type="button"
                    className="ignore-button"
                    onClick={() => handleIgnore(pair.p1_id, pair.p2_id)}
                  >
                    ⚪ São paróquias diferentes (Ignorar este alerta)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}