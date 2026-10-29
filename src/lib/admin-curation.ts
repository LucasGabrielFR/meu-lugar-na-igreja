import { db } from './db';

export interface DuplicateParishPair {
  city_name: string;
  uf: string;
  city_code: number;
  p1_id: number;
  p1_name: string;
  p1_houses: number;
  p2_id: number;
  p2_name: string;
  p2_houses: number;
  similarity: number;
}

let cachedPairs: DuplicateParishPair[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000; // 1 minute in-memory cache

export function invalidateDuplicateCache() {
  cachedPairs = null;
  cachedAt = 0;
}

export async function getPotentialDuplicateParishes(): Promise<DuplicateParishPair[]> {
  const now = Date.now();
  if (cachedPairs && now - cachedAt < CACHE_TTL_MS) {
    return cachedPairs;
  }

  // Find active parishes in the same municipality with normalized similarity >= 0.70
  const result = await db.query<DuplicateParishPair>(`
    WITH multi_city AS (
      SELECT city_code FROM parishes WHERE active GROUP BY city_code HAVING count(*) > 1
    ),
    p AS (
      SELECT p.id, p.city_code, p.name,
        regexp_replace(
          regexp_replace(
            unaccent(lower(p.name)),
            '^(paroquia|quase-paroquia|catedral|santuario|igreja matriz|matriz)\\s*(de\\s*|da\\s*|do\\s*|dos\\s*|das\\s*)?', ''
          ),
          '\\s*·.*$', ''
        ) AS clean_name
      FROM parishes p
      JOIN multi_city mc ON mc.city_code = p.city_code
      WHERE p.active
    ),
    pairs AS (
      SELECT m.name AS city_name, m.uf, m.code AS city_code,
             p1.id AS p1_id, p1.name AS p1_name,
             p2.id AS p2_id, p2.name AS p2_name,
             round(similarity(p1.clean_name, p2.clean_name)::numeric, 2) AS similarity,
             (SELECT count(*)::int FROM houses h WHERE h.parish_id = p1.id) AS p1_houses,
             (SELECT count(*)::int FROM houses h WHERE h.parish_id = p2.id) AS p2_houses
      FROM p p1
      JOIN p p2 ON p1.city_code = p2.city_code AND p1.id < p2.id
      JOIN municipalities m ON m.code = p1.city_code
      LEFT JOIN parish_duplicate_ignores ign ON (ign.parish_id_1 = p1.id AND ign.parish_id_2 = p2.id)
      WHERE ign.parish_id_1 IS NULL
        AND (
          trim(p1.clean_name) = trim(p2.clean_name)
          OR similarity(p1.clean_name, p2.clean_name) >= 0.70
        )
    )
    SELECT * FROM pairs
    ORDER BY similarity DESC, (p1_houses + p2_houses) DESC, city_name
  `);

  cachedPairs = result.rows;
  cachedAt = Date.now();
  return cachedPairs;
}

export async function countPotentialDuplicateParishes(): Promise<number> {
  const pairs = await getPotentialDuplicateParishes();
  return pairs.length;
}

export async function getSisterParishes(cityCode: number, excludeParishId: number): Promise<{ id: number; name: string }[]> {
  const result = await db.query<{ id: number; name: string }>(`
    SELECT id, name
    FROM parishes
    WHERE city_code = $1 AND id <> $2 AND active
    ORDER BY name
  `, [cityCode, excludeParishId]);
  return result.rows;
}
