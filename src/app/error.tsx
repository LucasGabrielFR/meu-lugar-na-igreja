'use client';
export default function ErrorPage({reset}:{reset:()=>void}) {
  return <main className="login-page"><div className="login-box"><h1>Vamos tentar de novo.</h1><p>A comunidade não pôde ser carregada agora. Tente novamente em alguns instantes.</p><button className="primary-button" onClick={reset}>Tentar novamente</button></div></main>;
}
