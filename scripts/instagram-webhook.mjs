import {createHash,createHmac,timingSafeEqual} from 'node:crypto';

export function sameSecret(actual,expected){
  if(!actual||!expected)return false;
  const a=Buffer.from(actual),b=Buffer.from(expected);
  return a.length===b.length&&timingSafeEqual(a,b);
}
export function validInstagramSignature(body,signature,secret){
  if(!secret||!/^sha256=[a-f0-9]{64}$/.test(signature??''))return false;
  return sameSecret(signature,'sha256='+createHmac('sha256',secret).update(body).digest('hex'));
}
export async function storeInstagramReceipt(client,body,payload){
  const digest=createHash('sha256').update(body).digest('hex');
  return (await client.query(`INSERT INTO instagram_webhook_receipts(payload_sha256,payload) VALUES($1,$2::jsonb)
    ON CONFLICT(payload_sha256) DO UPDATE SET last_received_at=now(),delivery_count=instagram_webhook_receipts.delivery_count+1
    RETURNING id,delivery_count`,[digest,JSON.stringify(payload)])).rows[0];
}




const MAX_BODY=1024*1024;

export async function verifyInstagramWebhook(request,token){

  if(!token)return Response.json({error:'Webhook não configurado.'},{status:503});
  const params=new URL(request.url).searchParams;
  if(params.get('hub.mode')!=='subscribe'||!sameSecret(params.get('hub.verify_token'),token)||!params.has('hub.challenge'))return new Response('Forbidden',{status:403});
  return new Response(params.get('hub.challenge'),{headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
}

import {processIncomingDirectMessage} from './instagram-direct.mjs';
import {getActiveInstagramToken} from './instagram-oauth.mjs';

export async function receiveInstagramWebhook(request,client,secret,logger=console){
  const reject=(reason,status,message)=>{
    logger.warn('instagram_webhook_rejected',{reason,status});
    return new Response(message,{status});
  };

  if(!secret)return reject('missing_app_secret',503,'Webhook não configurado.');
  if(Number(request.headers.get('content-length'))>MAX_BODY)return reject('body_too_large',413,'Payload too large');
  const reader=request.body?.getReader();
  if(!reader)return reject('empty_body',400,'Empty body');
  const chunks=[];let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();return reject('body_too_large',413,'Payload too large');}chunks.push(value);}
  }catch{return reject('body_read_failed',400,'Invalid body');}
  const body=Buffer.concat(chunks);
  if(!validInstagramSignature(body,request.headers.get('x-hub-signature-256'),secret))return reject('invalid_signature',403,'Forbidden');
  let payload;
  try{payload=JSON.parse(body.toString('utf8'));}catch{return reject('invalid_json',400,'Invalid JSON');}
  if(payload?.object!=='instagram'||!Array.isArray(payload.entry))return reject('invalid_event_shape',400,'Invalid Instagram event');
  try{
    const receipt=await storeInstagramReceipt(client,body,payload);
    logger.info('instagram_webhook_received',{receipt_id:receipt.id,delivery_count:receipt.delivery_count,entries:payload.entry.length});

    const token = await getActiveInstagramToken(client, process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY).catch(()=>null);
    for (const entry of payload.entry) {
      if (Array.isArray(entry.messaging)) {
        for (const msgEvent of entry.messaging) {
          try {
            await processIncomingDirectMessage(client, msgEvent, token, process.env.INSTAGRAM_API_VERSION || 'v26.0', logger);
          } catch (dmErr) {
            logger.error?.('instagram_direct_processing_failed', dmErr);
          }
        }
      }
    }

    return Response.json({received:true});
  }catch{
    logger.error('instagram_webhook_persistence_failed');
    return Response.json({error:'Recebimento temporariamente indisponível.'},{status:503});
  }
}

