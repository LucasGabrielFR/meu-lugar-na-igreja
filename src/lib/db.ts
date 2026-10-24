import 'server-only';
import { Pool } from 'pg';
const globalDb = globalThis as unknown as { parishPool?: Pool };
export const db = globalDb.parishPool ?? new Pool({ max: 10, connectionTimeoutMillis: 5000 });
if (process.env.NODE_ENV !== 'production') globalDb.parishPool = db;
