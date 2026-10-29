import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('codes') ?? '';
  const codes = [...new Set(
    raw.split(',')
      .map(s => s.trim())
      .filter(s => /^\d{7}$/.test(s))
      .map(Number)
  )].slice(0, 120);

  if (!codes.length) {
    return NextResponse.json({ boundaries: [] }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
  }

  const result = await db.query<{ code: number; path: string; bounds: number[] }>(
    'SELECT code, path, bounds FROM municipality_boundaries WHERE code = ANY($1::int[]) AND path IS NOT NULL',
    [codes]
  );

  return NextResponse.json(
    { boundaries: result.rows },
    { headers: { 'Cache-Control': 'public, max-age=86400' } }
  );
}

