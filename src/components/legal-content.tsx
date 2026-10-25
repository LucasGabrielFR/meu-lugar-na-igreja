import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ShieldCheck, FileText, ExternalLink } from 'lucide-react';

interface LegalDocProps {
  currentKey: 'privacy_policy' | 'terms_of_service';
  title: string;
  content: string;
  updatedAt: Date | string;
}

export default function LegalContent({ currentKey, title, content, updatedAt }: LegalDocProps) {
  const formattedDate = new Date(updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Renderizador seguro e limpo de markdown simples
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listBuffer: string[] = [];

    const flushList = (keyPrefix: number) => {
      if (listBuffer.length > 0) {
        elements.push(
          <ul key={`ul-${keyPrefix}`} className="legal-list">
            {listBuffer.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ul>
        );
        listBuffer = [];
      }
    };

    const formatInline = (str: string) => {
      // Bold **text**
      let out = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Inline code `code`
      out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
      // Links [text](url)
      out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      return out;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('- ')) {
        listBuffer.push(trimmed.slice(2));
        return;
      }

      flushList(index);

      if (!trimmed) {
        return;
      }

      if (trimmed.startsWith('# ')) {
        elements.push(<h1 key={index} className="legal-h1">{trimmed.slice(2)}</h1>);
      } else if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={index} className="legal-h2">{trimmed.slice(3)}</h2>);
      } else if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={index} className="legal-h3">{trimmed.slice(4)}</h3>);
      } else if (trimmed.startsWith('> ')) {
        elements.push(
          <blockquote key={index} className="legal-quote" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(2)) }} />
        );
      } else if (trimmed === '---') {
        elements.push(<hr key={index} className="legal-divider" />);
      } else {
        elements.push(
          <p key={index} className="legal-p" dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
        );
      }
    });

    flushList(lines.length);
    return elements;
  };

  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link href="/" className="brand product-brand" aria-label="Voltar para o mapa">
            <Image
              className="product-mark"
              src="/brand/meu-lugar-na-igreja-mark.png"
              alt="Meu Lugar na Igreja"
              width={44}
              height={44}
            />
            <span>
              Meu Lugar na Igreja
              <small>ACUTISTECH</small>
            </span>
          </Link>
          <Link href="/" className="back-button">
            <ArrowLeft size={16} /> Voltar para o mapa
          </Link>
        </div>
      </header>

      <main className="legal-container">
        {/* Abas de navegação entre Privacidade e Termos */}
        <nav className="legal-tabs" aria-label="Documentos Legais">
          <Link
            href="/privacidade"
            className={`legal-tab ${currentKey === 'privacy_policy' ? 'active' : ''}`}
          >
            <ShieldCheck size={18} />
            <span>Política de Privacidade</span>
          </Link>
          <Link
            href="/termos"
            className={`legal-tab ${currentKey === 'terms_of_service' ? 'active' : ''}`}
          >
            <FileText size={18} />
            <span>Termos de Serviço</span>
          </Link>
        </nav>

        {/* Card com o documento */}
        <article className="legal-card">
          <div className="legal-meta">
            <span className="eyebrow">DOCUMENTO OFICIAL · ACUTISTECH</span>
            <div className="legal-updated">Última atualização: {formattedDate}</div>
          </div>

          <div className="legal-body">
            {renderMarkdown(content)}
          </div>

          <footer className="legal-footer">
            <div className="legal-contact-box">
              <h3>Dúvidas ou solicitações de privacidade?</h3>
              <p>
                A equipe da <strong>AcutisTech</strong> está à disposição para atender pedidos de confirmação,
                correção ou exclusão definitiva de dados cadastrados no mapa conforme a LGPD.
              </p>
              <div className="legal-contact-actions">
                <a href="mailto:privacidade@acutistech.com.br" className="primary-button">
                  Entrar em contato por e-mail
                </a>
                <a href="https://acutistech.com.br" target="_blank" rel="noreferrer" className="outline-button">
                  Conhecer a AcutisTech <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}
