import { getCityWorld } from '@/lib/data';
export const dynamic = 'force-dynamic';
export async function GET(_: Request, {params}: {params: Promise<{code:string}>}) {
  const {code} = await params;
  if (!/^\d{7}$/.test(code)) return Response.json({error:'Município inválido'}, {status:400});
  return Response.json(await getCityWorld(Number(code)), {headers:{'Cache-Control':'no-store'}});
}
