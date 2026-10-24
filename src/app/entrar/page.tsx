import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getAdmin } from '@/lib/auth';
import ActionForm from '@/components/action-form';
import { login } from '../actions';
export const dynamic='force-dynamic';
export default async function Login(){
  if(await getAdmin())redirect('/admin');
  return <main className="login-page"><div className="login-box"><div className="login-brand"><Image className="product-mark" src="/brand/meu-lugar-na-igreja-mark.png" alt="" width={76} height={76}/><span>Meu Lugar na Igreja<small>UMA INICIATIVA ACUTISTECH</small></span></div><div className="eyebrow">PAINEL ADMINISTRATIVO</div><h1>Cuidar da comunidade.</h1><p>Entre para gerenciar o mapa, as cidades e as paróquias.</p><ActionForm action={login} label="Entrar no painel"><label>E-mail<input name="email" type="email" autoComplete="username" required maxLength={200}/></label><label>Senha<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label></ActionForm><Link href="/" className="back-link"><ArrowLeft size={16}/> Voltar para o mapa</Link></div></main>;
}
