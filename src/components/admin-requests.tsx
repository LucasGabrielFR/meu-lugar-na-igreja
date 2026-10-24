import Link from 'next/link';
import { db } from '@/lib/db';
import RequestReviewForm from './request-review-form';

type RequestRow={id:number;city_code:number;city_name:string;uf:string;parish_id:number|null;parish_name:string;display_name:string;username:string;status:'pending'|'approved'|'rejected';created_at:Date;house_id:number|null};
export default async function AdminRequests({status,page=1}:{status:string;page?:number}) {
  const filter=['pending','approved','rejected'].includes(status)?status:'pending';
  const requests=await db.query<RequestRow>(`SELECT r.id,r.city_code,m.name AS city_name,m.uf,r.parish_id,r.parish_name,r.display_name,r.username,r.status,r.created_at,r.house_id
    FROM participation_requests r JOIN municipalities m ON m.code=r.city_code WHERE r.status=$1 ORDER BY r.created_at DESC,r.id DESC LIMIT 101 OFFSET $2`,[filter,(page-1)*100]);
  const counts=await db.query<{pending:number;approved:number;rejected:number}>(`SELECT count(*) FILTER(WHERE status='pending')::int pending,count(*) FILTER(WHERE status='approved')::int approved,count(*) FILTER(WHERE status='rejected')::int rejected FROM participation_requests`);
  return <section className="admin-card requests-card">
    <div className="panel-heading"><h2>Solicitações de participação</h2><span className="pill">{Math.min(100,requests.rows.length)} nesta página</span></div>
    <p className="field-note">Pedidos pendentes ainda não aparecem no mapa. Ao aprovar, a cidade, a paróquia e a casa são cadastradas juntas. Nome e perfil só ficam públicos depois da aprovação.</p>
    <nav className="request-filters" aria-label="Filtrar solicitações">{(['pending','approved','rejected'] as const).map((key)=><Link key={key} className={filter===key?'active':''} href={`/admin?view=requests&status=${key}`}>{({pending:'Pendentes',approved:'Aprovadas',rejected:'Arquivadas'})[key]} <span>{counts.rows[0][key]}</span></Link>)}</nav>
    {requests.rows.slice(0,100).map(request=><article className="request-record" key={request.id}>
      <div className="request-heading"><div><div className="eyebrow">{request.city_name} · {request.uf}</div><h3>{request.display_name}</h3><a href={`https://www.instagram.com/${encodeURIComponent(request.username)}/`} target="_blank" rel="noreferrer">@{request.username} ↗</a></div><time>{new Date(request.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</time></div>
      <p><strong>Paróquia:</strong> {request.parish_name}{request.parish_id?' · já cadastrada':' · será criada na aprovação, se necessário'}</p>
      <p className="field-note">Autorizou a publicação do nome e do perfil no mapa.</p>
      {filter==='pending'?<RequestReviewForm id={request.id}/>:request.house_id?<Link className="text-button" href={`/?cidade=${request.city_code}&casa=${request.house_id}`}>Abrir casa publicada ↗</Link>:null}
    </article>)}
    {!requests.rows.length&&<p className="empty">{filter==='pending'?'Não há solicitações aguardando revisão.':filter==='approved'?'Nenhuma solicitação aprovada ainda.':'Nenhuma solicitação arquivada.'}</p>}
    <div className="pagination">{page>1&&<Link href={`/admin?view=requests&status=${filter}&page=${page-1}`}>Anterior</Link>}<span>Página {page}</span>{requests.rows.length>100&&<Link href={`/admin?view=requests&status=${filter}&page=${page+1}`}>Próxima</Link>}</div>
  </section>;
}
