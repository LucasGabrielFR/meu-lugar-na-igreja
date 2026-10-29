import Explorer from '@/components/explorer';
import { getCityWorld, getMunicipality, getWorld } from '@/lib/data';
export const dynamic='force-dynamic';
export default async function Home({searchParams}: {searchParams:Promise<{cidade?:string;casa?:string;walk?:string;clean?:string;autowalk?:string}>}) {
  const params=await searchParams;
  const cities=await getWorld();
  const code=Number(params.cidade);
  const activeCity=cities.find(c=>c.code===code);
  const municipality=!activeCity&&Number.isInteger(code)?await getMunicipality(code):null;
  const city=activeCity??(municipality?{...municipality,description:'',active:false,parishes:0,houses:0}:null);
  const local=city?await getCityWorld(city.code):{parishes:[],houses:[]};
  const house=local.houses.find(h=>h.id===Number(params.casa));
  const initialWalk=params.walk==='1'||params.walk==='true';
  const cleanMode=params.clean==='1'||params.clean==='true';
  const autoWalk=params.autowalk==='1'||params.autowalk==='true';
  return (
    <Explorer
      world={{cities:city&&!activeCity?[...cities,city]:cities,...local}}
      initialCity={city?.code??null}
      initialHouse={house?.id??null}
      initialWalk={initialWalk}
      cleanMode={cleanMode}
      autoWalk={autoWalk}
    />
  );
}
