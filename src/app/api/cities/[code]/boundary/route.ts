import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
export async function GET(_request:Request,{params}:{params:Promise<{code:string}>}){
  const {code}=await params;
  if(!/^\d{7}$/.test(code))return NextResponse.json({error:'Município inválido'},{status:400});
  const result=await db.query<{code:number;path:string|null;bounds:number[];source_url:string;retrieved_at:Date}>(`SELECT m.code,b.path,b.bounds,b.source_url,b.retrieved_at FROM municipalities m LEFT JOIN municipality_boundaries b ON b.code=m.code WHERE m.code=$1`,[Number(code)]);
  const row=result.rows[0];
  if(!row)return NextResponse.json({error:'Município não encontrado'},{status:404});
  if(!row.path)return NextResponse.json({error:'Limite municipal ainda não disponível na base local.'},{status:503});
  return NextResponse.json({code:row.code,path:row.path,bounds:row.bounds,source:'IBGE · malha municipal simplificada · base local',source_url:row.source_url,retrieved_at:row.retrieved_at},{headers:{'Cache-Control':'public, max-age=86400'}});
}
