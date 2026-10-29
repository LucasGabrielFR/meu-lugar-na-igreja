import Link from 'next/link';
import {db} from '@/lib/db';
import {instagramConfig,INSTAGRAM_SCOPES} from '../../scripts/instagram-oauth.mjs';
import {connectInstagram,checkInstagram,disconnectInstagram,processInstagramComments} from '@/app/admin/instagram-actions';

const messages:Record<string,string>={
  connected:'Conta conectada pelo Instagram e dados do perfil carregados.',
  checked:'Dados da conta atualizados pela API oficial.',
  disconnected:'Conexão removida deste painel. A credencial armazenada foi apagada.',
  configuration:'Configure as variáveis da integração no servidor e recrie o container.',
  session:'A sessão administrativa expirou. Entre novamente e reinicie a conexão.',
  state:'A autorização expirou ou já foi utilizada. Inicie uma nova conexão.',
  denied:'Autorização cancelada ou não concedida. Nenhuma conexão foi alterada.',
  provider:'Não foi possível concluir a operação com a Meta. Confira as credenciais, permissões e URL de retorno e tente novamente.',
  expired:'O acesso expirou ou foi revogado. Conecte a conta novamente.',
  processed:'Fila de comentários do Instagram processada com sucesso.',
  process_failed:'Ocorreu uma falha ao processar parte dos comentários recebidos.',
};

const outcomeLabels:Record<string,string>={
  house_created:'Casa criada no mapa',
  house_updated:'Casa atualizada no mapa',
  not_understood:'Comentário incompleto · resposta enviada',
  city_not_found:'Cidade não localizada · resposta enviada',
  parish_not_found:'Paróquia não localizada · resposta enviada',
  parish_ambiguous:'Paróquia ambígua · resposta enviada',
  ignored_self:'Ignorado (própria conta)',
  ignored_test:'Ignorado (teste sintético Meta)',
  ignored_invalid:'Ignorado (sem texto/autor válido)',
  error:'Erro no processamento',
};

const replyStatusLabels:Record<string,string>={
  sent:'Enviada no Instagram',
  skipped:'Não enviada (sem token ativo)',
  failed:'Falha ao responder na API',
  none:'Sem resposta necessária',
};

type CommentEventRow={
  comment_id:string;
  author_username:string|null;
  comment_text:string;
  extracted_city:string|null;
  extracted_uf:string|null;
  extracted_parish:string|null;
  city_code:number|null;
  parish_id:number|null;
  house_id:number|null;
  outcome:string;
  reply_text:string|null;
  reply_status:string;
  processed_at:Date;
};

export default async function AdminInstagram({result}:{result?:string}){
  let configured=false,callback='';
  try{callback=instagramConfig().redirectUri;configured=true;}catch{}
  const aiConfigured=Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const aiModel=process.env.OPENROUTER_MODEL?.trim()||'openai/gpt-4o-mini';

  const [connectionRes,receiptStatsRes,eventsRes]=await Promise.all([
    db.query<{account_id:string;username:string;display_name:string|null;account_type:string|null;expires_at:Date;connected_at:Date;checked_at:Date}>('SELECT account_id,username,display_name,account_type,expires_at,connected_at,checked_at FROM instagram_connections WHERE slot=true'),
    db.query<{pending:number;processed:number;failed:number}>(`SELECT
      (SELECT count(*)::int FROM instagram_webhook_receipts WHERE status IN ('received','failed')) AS pending,
      (SELECT count(*)::int FROM instagram_webhook_receipts WHERE status='processed') AS processed,
      (SELECT count(*)::int FROM instagram_webhook_receipts WHERE status='failed') AS failed`),
    db.query<CommentEventRow>('SELECT comment_id,author_username,comment_text,extracted_city,extracted_uf,extracted_parish,city_code,parish_id,house_id,outcome,reply_text,reply_status,processed_at FROM instagram_comment_events ORDER BY processed_at DESC LIMIT 20'),
  ]);

  const connection=connectionRes.rows[0];
  const stats=receiptStatsRes.rows[0]??{pending:0,processed:0,failed:0};
  const events=eventsRes.rows;
  const date=(value:Date)=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
  const expired=connection&&new Date(connection.expires_at)<=new Date();

  return <section className="admin-card">
    <div className="eyebrow">CONEXÃO OFICIAL · INSTAGRAM</div><h2>Conta conectada à campanha.</h2>
    <p>Autorize uma conta profissional para identificar seu perfil nesta aplicação e responder automaticamente quando faltarem dados nos comentários. Os participantes ganham sua casa no mapa comentando Paróquia, Cidade e Estado (UF).</p>
    {result&&messages[result]&&<p role="status" className="draft-notice">{messages[result]}</p>}
    {!configured&&<p className="draft-notice">Integração ainda não configurada. Defina APP_URL, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET e INSTAGRAM_TOKEN_ENCRYPTION_KEY no servidor. O ID e o segredo devem ser os do aplicativo Instagram mostrado na configuração de Instagram Login.</p>}
    {configured&&<p className="field-note">URL de redirecionamento para cadastrar no login da Meta:<br/><code>{callback}</code></p>}
    {connection?<article className="record">
      <h3>@{connection.username}</h3><p>{connection.display_name??'Nome não disponibilizado pela Meta'}</p>
      <p><strong>Status:</strong> {expired?'Acesso expirado · reconecte a conta':'Conectada · autorização armazenada'}</p>
      <p><strong>ID da conta:</strong> {connection.account_id}<br/><strong>Tipo:</strong> {connection.account_type??'Não informado'}<br/><strong>Validade:</strong> {date(connection.expires_at)}<br/><strong>Última consulta:</strong> {date(connection.checked_at)}</p>
      <a href={'https://www.instagram.com/'+encodeURIComponent(connection.username)+'/'} target="_blank" rel="noreferrer" className="text-button">Ver perfil conectado ↗</a>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:16}}><form action={checkInstagram}><button className="outline-button" disabled={!configured||!!expired}>Atualizar dados da conta</button></form><form action={disconnectInstagram}><button className="outline-button">Desconectar do painel</button></form></div>
      <p className="field-note">Desconectar apaga o token desta aplicação. Para revogar o acesso também na Meta, remova o aplicativo em Apps e sites no Instagram. A assinatura do webhook existente não é alterada por esse botão.</p>
    </article>:<p>Nenhuma conta conectada pelo painel.</p>}
    <form action={connectInstagram}><button className="primary-button" disabled={!configured}>{connection?'Reconectar ou trocar conta':'Conectar Instagram'}</button></form>
    <p className="field-note">Permissões solicitadas: {INSTAGRAM_SCOPES.join(', ')}. Uma conta conectada por vez; a troca só ocorre após concluir a autorização.</p>

    <hr style={{margin:'24px 0',opacity:0.2}}/>
    <div className="eyebrow">PROCESSAMENTO DE COMENTÁRIOS · IA + CATÁLOGO</div>
    <h2>Criação automática de casas pelos comentários</h2>
    <p>
      <strong>Interpretação via OpenRouter:</strong> {aiConfigured?`Ativa (${aiModel})`:'Modo determinístico (defina OPENROUTER_API_KEY no servidor para interpretação por IA)'}<br/>
      <strong>Recibos na fila:</strong> {stats.pending} pendente(s) · {stats.processed} processado(s)
    </p>
    <form action={processInstagramComments} style={{marginBottom:20}}>
      <button className="outline-button">Processar comentários pendentes ({stats.pending})</button>
    </form>

    <h3>Últimos comentários processados</h3>
    {events.length?events.map(ev=><article key={ev.comment_id} className="record" style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
        <strong>{ev.author_username?`@${ev.author_username}`:'Autor não informado'}</strong>
        <span className="pill">{outcomeLabels[ev.outcome]??ev.outcome}</span>
      </div>
      <p style={{margin:'6px 0'}}><em>&ldquo;{ev.comment_text}&rdquo;</em></p>
      {(ev.extracted_parish||ev.extracted_city)&&<small style={{display:'block'}}>
        Extraído: <strong>{ev.extracted_parish??'—'}</strong> · {ev.extracted_city??'—'}{ev.extracted_uf?`/${ev.extracted_uf}`:''}
      </small>}
      {ev.reply_text&&<small style={{display:'block',marginTop:4}}>
        Resposta ({replyStatusLabels[ev.reply_status]??ev.reply_status}): &ldquo;{ev.reply_text}&rdquo;
      </small>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6,flexWrap:'wrap',gap:8}}>
        <small>{date(ev.processed_at)}</small>
        {ev.city_code&&ev.house_id&&<Link className="text-button" href={`/?cidade=${ev.city_code}&casa=${ev.house_id}`}>Ver casa no mapa ↗</Link>}
      </div>
    </article>):<p className="empty">Nenhum comentário processado ainda.</p>}
  </section>;
}
