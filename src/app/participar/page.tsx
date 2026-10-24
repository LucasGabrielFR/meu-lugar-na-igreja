import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/db';
import ParticipationForm from '@/components/participation-form';
import { getMunicipality } from '@/lib/data';
export const dynamic='force-dynamic';

export default async function Participate({searchParams}:{searchParams:Promise<{cidade?:string}>}) {
  const code=Number((await searchParams).cidade);
  const municipality=Number.isInteger(code)&&code>0?await getMunicipality(code):null;
  const parishes=await db.query<{city_code:number;name:string}>(`SELECT city_code,name FROM (
    SELECT p.city_code,p.name FROM parishes p JOIN cities c ON c.code=p.city_code WHERE p.active AND c.active
    UNION SELECT municipality_code AS city_code,name FROM parish_catalog WHERE active
  ) available ORDER BY city_code,name`);
  return <main className="participation-page"><section className="participation-card">
    <Link className="brand product-brand" href="/" aria-label="Meu Lugar na Igreja · início"><Image className="product-mark" src="/brand/meu-lugar-na-igreja-mark.png" alt="" width={52} height={52}/><span>Meu Lugar na Igreja<small>UMA INICIATIVA ACUTISTECH</small></span></Link>
    <div className="eyebrow">SUA COMUNIDADE TAMBÉM TEM LUGAR AQUI</div><h1>Vamos colocar sua casa no mapa?</h1><p>Conte onde você participa. A equipe confere o pedido antes de publicar sua casa na cidade e na paróquia escolhidas.</p>
    <ParticipationForm parishes={parishes.rows} initialMunicipality={municipality??undefined}/>
  </section></main>;
}
