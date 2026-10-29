'use client';

import { useState } from 'react';
import Link from 'next/link';
import Form from 'next/form';
import { Church, Search, ArrowUpRight, Plus, Trash2, AlertTriangle, Users, Filter, X } from 'lucide-react';
import ActionForm from './action-form';
import MunicipalityInput from './municipality-input';
import { saveMap, deleteParish } from '@/app/actions';

const BRAZIL_UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

export interface AdminParishItem {
  id: number;
  city_code: number;
  name: string;
  description: string;
  active: boolean;
  city_name: string;
  uf: string;
  house_count: number;
  sister_parishes: { id: number; name: string }[];
}

export default function AdminParishes({
  parishes,
  totalCount,
  ufFilter = '',
  cityFilter = '',
  searchQuery = '',
  page = 1,
  citiesInUf = [],
}: {
  parishes: AdminParishItem[];
  totalCount: number;
  ufFilter?: string;
  cityFilter?: string;
  searchQuery?: string;
  page?: number;
  citiesInUf?: { code: number; name: string }[];
}) {
  const [selectedUf, setSelectedUf] = useState(ufFilter);

  return (
    <div className="admin-columns management">
      <section className="admin-card">
        <div className="panel-heading">
          <h2>Paróquias e Comunidades</h2>
          <span className="pill">{totalCount.toLocaleString('pt-BR')} cadastradas</span>
        </div>

        {/* Filtros por Estado, Cidade e Busca */}
        <Form action="/admin" className="admin-filter-bar">
          <input type="hidden" name="view" value="parishes" />
          
          <div className="filter-row">
            <label className="filter-field">
              <span>Estado (UF)</span>
              <select
                name="uf"
                value={selectedUf}
                onChange={e => setSelectedUf(e.target.value)}
              >
                <option value="">Todas as UFs</option>
                {BRAZIL_UFS.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>

            {selectedUf && citiesInUf.length > 0 && (
              <label className="filter-field">
                <span>Município</span>
                <select name="city_code" defaultValue={cityFilter}>
                  <option value="">Todos os municípios de {selectedUf}</option>
                  {citiesInUf.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="filter-field search-field">
              <span>Buscar paróquia</span>
              <div className="searchbox">
                <Search size={16} />
                <input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Nome da paróquia..."
                />
              </div>
            </label>

            <button type="submit" className="outline-button filter-submit-btn">
              <Filter size={15} /> Filtrar
            </button>

            {(ufFilter || cityFilter || searchQuery) && (
              <Link href="/admin?view=parishes" className="text-button reset-filter-btn" title="Limpar filtros">
                <X size={14} /> Limpar
              </Link>
            )}
          </div>
        </Form>

        <p className="field-note" style={{ marginTop: '12px' }}>
          Abra uma paróquia para editar dados ou excluir. Paróquias com moradores vinculados exigem selecionar o destino da transferência antes da exclusão.
        </p>

        {/* Lista de paróquias */}
        <div className="parishes-management-list">
          {parishes.map(p => (
            <details className="record parish-record-detail" key={p.id}>
              <summary>
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.city_name} · {p.uf} · {p.house_count} {p.house_count === 1 ? 'casa' : 'casas'}</small>
                </span>
                <span className={`status ${!p.active ? 'muted' : ''}`}>
                  {p.active ? 'Visível' : 'Arquivada'}
                </span>
              </summary>

              <div className="parish-edit-body">
                {/* Formulário de Edição */}
                <ActionForm action={saveMap} label="Salvar alterações">
                  <input type="hidden" name="type" value="parish" />
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="city_code" value={p.city_code} />

                  <label>
                    Nome da paróquia
                    <input name="name" defaultValue={p.name} required minLength={2} maxLength={140} />
                  </label>

                  <p className="field-note">{p.city_name} · {p.uf} · IBGE {p.city_code}</p>

                  <label>
                    Apresentação
                    <textarea name="description" defaultValue={p.description} maxLength={600} rows={3} />
                  </label>

                  <label className="check">
                    <input name="active" type="checkbox" defaultChecked={p.active} /> Visível no mapa
                  </label>
                </ActionForm>

                <div className="parish-card-links" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--line)' }}>
                  <Link className="text-button" href={`/?cidade=${p.city_code}`} target="_blank">
                    Abrir cidade no mapa <ArrowUpRight size={14} />
                  </Link>
                </div>

                {/* Formulário de Exclusão Segura */}
                <div className="parish-delete-section" style={{ marginTop: '20px', padding: '16px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#c53030', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <Trash2 size={15} /> Zona de Exclusão
                  </h4>

                  {p.house_count > 0 ? (
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '12px', color: '#9b2c2c', fontSize: '12px' }}>
                        <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>
                          <strong>Atenção:</strong> Esta paróquia possui <strong>{p.house_count} {p.house_count === 1 ? 'morador cadastrado' : 'moradores cadastrados'}</strong> no mapa.
                          Para que ninguém perca sua casa, selecione abaixo para qual paróquia de {p.city_name} os moradores serão transferidos:
                        </span>
                      </div>

                      {p.sister_parishes.length > 0 ? (
                        <ActionForm action={deleteParish} label="Transferir moradores e excluir paróquia">
                          <input type="hidden" name="id" value={p.id} />
                          <label style={{ marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>Paróquia de destino em {p.city_name} *</span>
                            <select name="migrate_to_id" required defaultValue="">
                              <option value="" disabled>Selecione a paróquia que acolherá os fiéis...</option>
                              {p.sister_parishes.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </label>
                        </ActionForm>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#c53030', margin: 0 }}>
                          Não há outras paróquias cadastradas em {p.city_name} para receber os moradores. Crie outra paróquia na cidade antes de excluir esta, ou edite as casas individualmente.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '12px', color: '#742a2a', margin: '0 0 12px' }}>
                        Esta paróquia não possui moradores cadastrados. Ela pode ser excluída imediatamente sem perda de dados.
                      </p>
                      <ActionForm action={deleteParish} label="Excluir esta paróquia">
                        <input type="hidden" name="id" value={p.id} />
                      </ActionForm>
                    </div>
                  )}
                </div>
              </div>
            </details>
          ))}

          {!parishes.length && (
            <p className="empty">Nenhuma paróquia encontrada para os filtros selecionados.</p>
          )}
        </div>

        {/* Paginação */}
        <div className="pagination">
          {page > 1 && (
            <Link href={`/admin?view=parishes&uf=${ufFilter}&city_code=${cityFilter}&q=${encodeURIComponent(searchQuery)}&page=${page - 1}`}>
              Anterior
            </Link>
          )}
          <span>Página {page} · {parishes.length} exibidas</span>
          {totalCount > page * 50 && (
            <Link href={`/admin?view=parishes&uf=${ufFilter}&city_code=${cityFilter}&q=${encodeURIComponent(searchQuery)}&page=${page + 1}`}>
              Próxima
            </Link>
          )}
        </div>
      </section>

      {/* Card Lateral: Nova Paróquia */}
      <section className="admin-card new-record">
        <div className="eyebrow"><Plus size={14} /> NOVO CADASTRO</div>
        <h2>Cadastrar Paróquia</h2>
        <p>Adicione uma nova paróquia ao mapa informando o município oficial e o nome completo.</p>

        <ActionForm action={saveMap} label="Criar paróquia no mapa">
          <input type="hidden" name="type" value="parish" />

          <MunicipalityInput name="city_code" />

          <label>
            Nome da paróquia *
            <input name="name" required minLength={2} maxLength={140} placeholder="Ex: Paróquia São José" />
          </label>

          <label>
            Apresentação / Descrição
            <textarea name="description" maxLength={600} rows={3} placeholder="Breve apresentação histórica ou devocional..." />
          </label>

          <label className="check">
            <input name="active" type="checkbox" defaultChecked /> Visível no mapa
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
