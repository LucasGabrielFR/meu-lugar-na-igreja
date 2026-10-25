'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileText, ArrowUpRight, CheckCircle2, Info } from 'lucide-react';
import ActionForm from './action-form';
import { saveAppConfig } from '@/app/actions';

interface ConfigItem {
  key: string;
  title: string;
  value: string;
  updated_at: Date | string;
}

export default function AdminLegalEditor({ configs }: { configs: ConfigItem[] }) {
  const [activeKey, setActiveKey] = useState<'privacy_policy' | 'terms_of_service'>('privacy_policy');

  const currentConfig = configs.find(c => c.key === activeKey) ?? {
    key: activeKey,
    title: activeKey === 'privacy_policy' ? 'Política de Privacidade' : 'Termos de Serviço',
    value: '',
    updated_at: new Date(),
  };

  const publicUrl = activeKey === 'privacy_policy' ? '/privacidade' : '/termos';

  return (
    <div className="admin-legal-editor">
      <div className="legal-editor-nav">
        <button
          type="button"
          className={`tab-btn ${activeKey === 'privacy_policy' ? 'active' : ''}`}
          onClick={() => setActiveKey('privacy_policy')}
        >
          <ShieldCheck size={18} />
          <span>Política de Privacidade</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeKey === 'terms_of_service' ? 'active' : ''}`}
          onClick={() => setActiveKey('terms_of_service')}
        >
          <FileText size={18} />
          <span>Termos de Serviço</span>
        </button>
      </div>

      <section className="admin-card">
        <div className="panel-heading">
          <div>
            <h2>{currentConfig.title}</h2>
            <p className="field-note">
              Última modificação salva: {new Date(currentConfig.updated_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </p>
          </div>
          <Link href={publicUrl} target="_blank" rel="noopener noreferrer" className="outline-button">
            Ver página pública <ArrowUpRight size={15} />
          </Link>
        </div>

        <ActionForm key={activeKey} action={saveAppConfig} label="Salvar alterações">
          <input type="hidden" name="key" value={activeKey} />

          <label>
            Título do Documento
            <input
              name="title"
              defaultValue={currentConfig.title}
              required
              minLength={2}
              maxLength={150}
            />
          </label>

          <label>
            Conteúdo (Markdown / Texto estruturado)
            <textarea
              name="value"
              defaultValue={currentConfig.value}
              required
              minLength={10}
              maxLength={50000}
              rows={22}
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '13px', lineHeight: '1.6' }}
            />
          </label>

          <div className="markdown-tips">
            <Info size={16} />
            <span>
              Dicas de formatação: <code># Título</code>, <code>### Subtítulo</code>, <code>**negrito**</code>, <code>- Lista com marcadores</code>, <code>&gt; Citações em destaque</code>, <code>[Texto](https://...)</code>.
            </span>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
