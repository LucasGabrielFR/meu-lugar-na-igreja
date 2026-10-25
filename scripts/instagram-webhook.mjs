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

export async function receiveInstagramWebhook(request,client,secret){

  if(!secret)return Response.json({error:'Webhook não configurado.'},{status:503});
  if(Number(request.headers.get('content-length'))>MAX_BODY)return new Response('Payload too large',{status:413});
  const reader=request.body?.getReader();
  if(!reader)return new Response('Empty body',{status:400});
  const chunks=[];let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();return new Response('Payload too large',{status:413});}chunks.push(value);}
  }catch{return new Response('Invalid body',{status:400});}
  const body=Buffer.concat(chunks);
  if(!validInstagramSignature(body,request.headers.get('x-hub-signature-256'),secret))return new Response('Forbidden',{status:403});
  let payload;
  try{payload=JSON.parse(body.toString('utf8'));}catch{return new Response('Invalid JSON',{status:400});}
  if(payload?.object!=='instagram'||!Array.isArray(payload.entry))return new Response('Invalid Instagram event',{status:400});
  try{
    await storeInstagramReceipt(client,body,payload);
    return Response.json({received:true});
  }catch{
    console.error('Instagram webhook persistence failed');
    return Response.json({error:'Recebimento temporariamente indisponível.'},{status:503});
  }
}

