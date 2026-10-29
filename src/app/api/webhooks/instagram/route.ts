import {revalidatePath} from 'next/cache';
import {db} from '@/lib/db';
import {verifyInstagramWebhook,receiveInstagramWebhook} from '../../../../../scripts/instagram-webhook.mjs';
import {processPendingInstagramReceipts} from '../../../../../scripts/instagram-comment-processor.mjs';
export const runtime='nodejs';
export async function GET(request:Request){return verifyInstagramWebhook(request,process.env.META_WEBHOOK_VERIFY_TOKEN);}
export async function POST(request:Request){
  const response=await receiveInstagramWebhook(request,db,process.env.META_APP_SECRET);
  if(response.status===200){
    try{
      const summary=await processPendingInstagramReceipts(db,process.env);
      if(summary.housesCreated>0||summary.housesUpdated>0)revalidatePath('/','layout');
      revalidatePath('/admin');
    }catch(error){
      console.error('instagram_webhook_post_process_failed',error instanceof Error?error.message:'unknown');
    }
  }
  return response;
}
