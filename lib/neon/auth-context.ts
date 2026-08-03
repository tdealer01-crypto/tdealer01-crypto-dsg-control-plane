import type { Pool, PoolClient } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export type NeonAuthRole = 'anon' | 'authenticated' | 'service_role';

export interface NeonAuthContext {
  userId?: string;
  role: NeonAuthRole;
}

const ALLOWED_ROLES: readonly NeonAuthRole[] = ['anon', 'authenticated', 'service_role'];

/**
 * Runs `callback` inside a single dedicated transaction with the Neon
 * auth-compat GUCs (request.jwt.claim.sub / .role) and Postgres role set to
 * match `context`, so RLS policies written against auth.uid()/auth.role()
 * and `TO authenticated`/`TO service_role` (see lib/neon/sql/0000_auth_compat.sql)
 * evaluate the same way they would under Supabase/PostgREST.
 *
 * A dedicated client is checked out of the pool for the whole transaction
 * (never pool.query()) so SET LOCAL/SET ROLE can't leak onto a connection
 * some other in-flight request is using.
 */
export async function withNeonAuthContext<T>(
  pool: Pool,
  context: NeonAuthContext,
  callback: (db: NodePgDatabase<typeof schema>) => Promise<T>
): Promise<T> {
  if (!ALLOWED_ROLES.includes(context.role)) {
    throw new Error(`Invalid Neon auth role: ${context.role}`);
  }

  const client: PoolClient = await pool.connect();

  try {
    await client.query('BEGIN');

    // set_config() is parameterized (unlike `SET LOCAL <name> = <value>`),
    // so this is safe even though userId is caller-supplied.
    await client.query(
      "SELECT set_config('request.jwt.claim.sub', $1, true)",
      [context.userId ?? '']
    );
    await client.query(
      "SELECT set_config('request.jwt.claim.role', $1, true)",
      [context.role]
    );

    // Native Postgres role switch for policies declared `TO authenticated` /
    // `TO service_role`. Role name comes only from the checked ALLOWED_ROLES
    // allowlist above, so this interpolation is not attacker-controlled.
    await client.query(`SET LOCAL ROLE ${context.role}`);

    const db = drizzle(client, { schema });
    const result = await callback(db);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
