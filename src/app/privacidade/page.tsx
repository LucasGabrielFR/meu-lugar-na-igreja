import type { Metadata } from 'next';
import { getAppConfig } from '@/lib/data';
import LegalContent from '@/components/legal-content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Política de Privacidade · Meu Lugar na Igreja',
  description: 'Política de Privacidade e Proteção de Dados da plataforma Meu Lugar na Igreja, mantida pela AcutisTech.',
};

export default async function PrivacyPage() {
  const config = await getAppConfig('privacy_policy');

  return (
    <LegalContent
      currentKey="privacy_policy"
      title={config?.title ?? 'Política de Privacidade'}
      content={config?.value ?? 'Conteúdo da Política de Privacidade em atualização.'}
      updatedAt={config?.updated_at ?? new Date()}
    />
  );
}
