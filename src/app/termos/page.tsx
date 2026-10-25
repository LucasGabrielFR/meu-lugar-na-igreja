import type { Metadata } from 'next';
import { getAppConfig } from '@/lib/data';
import LegalContent from '@/components/legal-content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Termos de Serviço · Meu Lugar na Igreja',
  description: 'Termos de Serviço e Condições de Uso da plataforma comunitária Meu Lugar na Igreja, mantida pela AcutisTech.',
};

export default async function TermsPage() {
  const config = await getAppConfig('terms_of_service');

  return (
    <LegalContent
      currentKey="terms_of_service"
      title={config?.title ?? 'Termos de Serviço'}
      content={config?.value ?? 'Conteúdo dos Termos de Serviço em atualização.'}
      updatedAt={config?.updated_at ?? new Date()}
    />
  );
}
