import {db} from '@/lib/db';
import {instagramConfig,INSTAGRAM_SCOPES} from '../../scripts/instagram-oauth.mjs';
import {connectInstagram,checkInstagram,disconnectInstagram} from '@/app/admin/instagram-actions';

const messages:Record<string,string>={connected:'Conta conectada pelo Instagram e dados do perfil carregados.',checked:'Dados da conta atualizados pela API oficial.',disconnected:'Conexão removida deste painel. A credencial armazenada foi apagada.',configuration:'Configure as variáveis da integração no servidor e recrie o container.',session:'A sessão administrativa expirou. Entre novamente e reinicie a conexão.',state:'A autorização expirou ou já foi utilizada. Inicie uma nova conexão.',denied:'Autorização cancelada ou não concedida. Nenhuma conexão foi alterada.',provider:'Não foi possível concluir a operação com a Meta. Confira as credenciais, permissões e URL de retorno e tente novamente.',expired:'O acesso expirou ou foi revogado. Conecte a conta novamente.'};
export default async function AdminInstagram({result}:{result?:string}){
  let configured=false,callback='';
  try{callback=instagramConfig().redirectUri;configured=true;}catch{}
  const connection=(await db.query<{account_id:string;username:string;display_name:string|null;account_type:string|null;expires_at:Date;connected_at:Date;checked_at:Date}>('SELECT account_id,username,display_name,account_type,expires_at,connected_at,checked_at FROM instagram_connections WHERE slot=true')).rows[0];
  const date=(value:Date)=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
  const expired=connection&&new Date(connection.expires_at)<=new Date();
  return <section className="admin-card">
    <div className="eyebrow">CONEXÃO OFICIAL · INSTAGRAM</div><h2>Conta conectada à campanha.</h2>
    <p>Autorize uma conta profissional para identificar seu perfil nesta aplicação. A conexão é administrativa; participantes continuam entrando pelos comentários.</p>
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
    <form action={connectInstagram}><button className="gold-button" disabled={!configured}>{connection?'Reconectar ou trocar conta':'Conectar Instagram'}</button></form>
    <p className="field-note">Permissões solicitadas: {INSTAGRAM_SCOPES.join(', ')}. Uma conta conectada por vez; a troca só ocorre após concluir a autorização.</p>
    <p>O token fica criptografado no banco e não é exibido. A atualização consulta o perfil novamente; ela não renova a validade do token. Quando necessário, use Reconectar.</p>
    <p>Conectar a conta não inicia a criação de casas nem ativa novas assinaturas de webhook. O recebimento e o processamento de comentários são etapas separadas.</p>
  </section>;
}
