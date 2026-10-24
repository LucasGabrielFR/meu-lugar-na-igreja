import { db } from './db';
import type { City, Parish, House } from './types';
export async function getWorld() {
  const cities = await db.query<City>(`SELECT c.*,m.name,m.uf,
    (SELECT count(*)::int FROM parish_catalog pc WHERE pc.municipality_code=c.code AND pc.active) AS catalog_parishes,
    (SELECT count(*)::int FROM parishes p WHERE p.city_code=c.code AND p.active) AS parishes,
    (SELECT count(*)::int FROM houses h JOIN parishes p ON p.id=h.parish_id WHERE h.city_code=c.code AND h.active AND p.active) AS houses
    FROM cities c JOIN municipalities m ON m.code=c.code WHERE c.active ORDER BY m.name`);
  return cities.rows;
}
export async function getCityWorld(code: number) {
  const [parishes, houses] = await Promise.all([
    db.query<Parish>('SELECT p.* FROM parishes p JOIN cities c ON c.code=p.city_code WHERE p.city_code=$1 AND p.active AND c.active ORDER BY p.slot', [code]),
    db.query<House>('SELECT h.* FROM houses h JOIN parishes p ON p.id=h.parish_id JOIN cities c ON c.code=h.city_code WHERE h.city_code=$1 AND h.active AND p.active AND c.active ORDER BY h.id', [code]),
  ]);
  return { parishes: parishes.rows, houses: houses.rows };
}

export async function getMunicipality(code: number) {
  const result=await db.query<{code:number;name:string;uf:string;catalog_parishes:number}>(
    'SELECT m.code,m.name,m.uf,(SELECT count(*)::int FROM parish_catalog p WHERE p.municipality_code=m.code AND p.active) catalog_parishes FROM municipalities m WHERE m.code=$1',[code],
  );
  return result.rows[0]??null;
}
