import {db} from '@/lib/db';
import {verifyInstagramWebhook,receiveInstagramWebhook} from '../../../../../scripts/instagram-webhook.mjs';
export const runtime='nodejs';
export async function GET(request:Request){return verifyInstagramWebhook(request,process.env.META_WEBHOOK_VERIFY_TOKEN);}
export async function POST(request:Request){return receiveInstagramWebhook(request,db,process.env.META_APP_SECRET);}
