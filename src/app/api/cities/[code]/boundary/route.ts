import {NextResponse} from 'next/server';
import {getMunicipality} from '@/lib/data';
import {geographicPath} from '@/lib/map-territories.mjs';
export async function GET(_request:Request,{params}:{params:Promise<{code:string}>}){
  const {code}=await params;
  if(!/^\d{7}$/.test(code))return NextResponse.json({error:'Município inválido'},{status:400});
  if(!await getMunicipality(Number(code)))return NextResponse.json({error:'Município não encontrado'},{status:404});
  try{
    const url=`https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${code}?formato=application/vnd.geo%2Bjson&qualidade=maxima`;
    const response=await fetch(url,{next:{revalidate:86400},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error('Malha indisponível');
    const geometry=geographicPath(await response.json());
    return NextResponse.json({code:Number(code),...geometry,source:'IBGE · malha municipal simplificada',source_url:url},{headers:{'Cache-Control':'public, max-age=86400'}});
  }catch{return NextResponse.json({error:'Não foi possível carregar o limite municipal do IBGE agora.'},{status:503});}
}
