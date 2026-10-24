import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request:Request) {
  const query=new URL(request.url).searchParams.get('q')?.trim().slice(0,80)??'';
  if(query.length<2)return NextResponse.json({municipalities:[]});
  const result=await db.query<{code:number;name:string;uf:string;catalog_parishes:number}>(`SELECT m.code,m.name,m.uf,(SELECT count(*)::int FROM parish_catalog p WHERE p.municipality_code=m.code AND p.active) catalog_parishes
    FROM municipalities m WHERE unaccent(m.name) ILIKE unaccent($1) OR m.uf ILIKE $1 ORDER BY m.name LIMIT 15`,[`%${query}%`]);
  return NextResponse.json({municipalities:result.rows},{headers:{'Cache-Control':'public, max-age=60, stale-while-revalidate=300'}});
}
