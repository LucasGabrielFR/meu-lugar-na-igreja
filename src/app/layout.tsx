import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Meu Lugar na Igreja · AcutisTech',description:'Encontre seu lugar na cidade virtual das comunidades paroquiais do Brasil.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><a className="skip-link" href="#conteudo">Ir para o conteúdo</a><div id="conteudo">{children}</div></body></html>;}
