import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString =
  process.env.NEON_PG_POOLED_CONNECTION_STRING || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'NEON_PG_POOLED_CONNECTION_STRING (or DATABASE_URL) is not set. See .env.example.'
  );
}

const pool = new Pool({ connectionString });

export const neonDb = drizzle(pool, { schema });
