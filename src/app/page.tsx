import Explorer from '@/components/explorer';
import { getCityWorld, getMunicipality, getWorld } from '@/lib/data';
export const dynamic='force-dynamic';
export default async function Home({searchParams}: {searchParams:Promise<{cidade?:string;casa?:string}>}) {
  const params=await searchParams;
  const cities=await getWorld();
  const code=Number(params.cidade);
  const activeCity=cities.find(c=>c.code===code);
  const municipality=!activeCity&&Number.isInteger(code)?await getMunicipality(code):null;
  const city=activeCity??(municipality?{...municipality,description:'',active:false,parishes:0,houses:0}:null);
  const local=city?await getCityWorld(city.code):{parishes:[],houses:[]};
  const house=local.houses.find(h=>h.id===Number(params.casa));
  return <Explorer world={{cities:city&&!activeCity?[...cities,city]:cities,...local}} initialCity={city?.code??null} initialHouse={house?.id??null}/>;
}
