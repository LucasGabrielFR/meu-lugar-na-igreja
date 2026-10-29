import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim().replace(/^@/, '').slice(0, 80);

  if (!query) {
    const latest = await db.query<{
      id: number;
      username: string;
      display_name: string;
      city_code: number;
      city_name: string;
      uf: string;
      parish_id: number;
      parish_name: string;
      level?: number;
      role?: string;
      xp?: number;
      points?: number;
      streak_days?: number;
      last_checkin_at?: string | Date | null;
      civil_role?: string | null;
      has_approved_priest?: boolean;
    }>(
      `SELECT h.id, h.username, h.display_name, h.city_code, m.name AS city_name, m.uf, h.parish_id, p.name AS parish_name,
              h.level, h.role, h.xp, h.points, h.streak_days, h.last_checkin_at, h.civil_role, p.has_approved_priest
       FROM houses h
       JOIN parishes p ON p.id = h.parish_id
       JOIN cities c ON c.code = h.city_code
       JOIN municipalities m ON m.code = h.city_code
       WHERE h.active AND p.active AND c.active
       ORDER BY h.id DESC
       LIMIT 5`
    );
    return NextResponse.json({ houses: latest.rows }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const result = await db.query<{
    id: number;
    username: string;
    display_name: string;
    city_code: number;
    city_name: string;
    uf: string;
    parish_id: number;
    parish_name: string;
    level?: number;
    role?: string;
    xp?: number;
    points?: number;
    streak_days?: number;
    last_checkin_at?: string | Date | null;
    civil_role?: string | null;
    has_approved_priest?: boolean;
  }>(
    `SELECT h.id, h.username, h.display_name, h.city_code, m.name AS city_name, m.uf, h.parish_id, p.name AS parish_name,
            h.level, h.role, h.xp, h.points, h.streak_days, h.last_checkin_at, h.civil_role, p.has_approved_priest
     FROM houses h
     JOIN parishes p ON p.id = h.parish_id
     JOIN cities c ON c.code = h.city_code
     JOIN municipalities m ON m.code = h.city_code
     WHERE h.active AND p.active AND c.active
       AND (lower(h.username) = lower($1) OR h.username ILIKE $2 OR unaccent(h.display_name) ILIKE unaccent($2))
     ORDER BY CASE WHEN lower(h.username) = lower($1) THEN 0 ELSE 1 END, h.id DESC
     LIMIT 10`,
    [query, `%${query}%`]
  );

  return NextResponse.json({ houses: result.rows }, { headers: { 'Cache-Control': 'no-store' } });
}

