import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { withNeonAuthContext } from '@/lib/neon/auth-context';

function createMockClient() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  };
}

function createMockPool(client: ReturnType<typeof createMockClient>) {
  return {
    connect: vi.fn().mockResolvedValue(client as unknown as PoolClient),
  } as unknown as Pool;
}

describe('withNeonAuthContext', () => {
  let client: ReturnType<typeof createMockClient>;
  let pool: Pool;

  beforeEach(() => {
    client = createMockClient();
    pool = createMockPool(client);
  });

  it('rejects an invalid role before ever touching the pool', async () => {
    await expect(
      withNeonAuthContext(
        pool,
        // @ts-expect-error intentionally invalid role for the test
        { role: 'superuser' },
        async () => 'unreachable'
      )
    ).rejects.toThrow(/invalid neon auth role/i);

    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('begins a transaction, sets GUCs and role via parameterized calls, then commits', async () => {
    const result = await withNeonAuthContext(
      pool,
      { role: 'authenticated', userId: 'user-123' },
      async () => 'callback-result'
    );

    expect(result).toBe('callback-result');

    const calls = client.query.mock.calls.map((c) => c[0]);
    expect(calls[0]).toBe('BEGIN');
    expect(calls).toContainEqual(expect.stringContaining("set_config('request.jwt.claim.sub'"));
    expect(calls).toContainEqual(expect.stringContaining("set_config('request.jwt.claim.role'"));
    expect(calls).toContainEqual('SET LOCAL ROLE authenticated');
    expect(calls[calls.length - 1]).toBe('COMMIT');

    // userId must be passed as a bind parameter, never string-interpolated into the SQL text.
    const subCall = client.query.mock.calls.find((c) =>
      String(c[0]).includes('request.jwt.claim.sub')
    );
    expect(subCall?.[1]).toEqual(['user-123']);
  });

  it('defaults userId to empty string (anonymous) when not provided', async () => {
    await withNeonAuthContext(pool, { role: 'anon' }, async () => undefined);

    const subCall = client.query.mock.calls.find((c) =>
      String(c[0]).includes('request.jwt.claim.sub')
    );
    expect(subCall?.[1]).toEqual(['']);
  });

  it('rolls back and rethrows when the callback throws, and always releases the client', async () => {
    const boom = new Error('boom');

    await expect(
      withNeonAuthContext(pool, { role: 'service_role' }, async () => {
        throw boom;
      })
    ).rejects.toThrow(boom);

    const calls = client.query.mock.calls.map((c) => c[0]);
    expect(calls).toContain('ROLLBACK');
    expect(calls).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('releases the client even when COMMIT itself throws', async () => {
    client.query.mockImplementation((sql: string) => {
      if (sql === 'COMMIT') return Promise.reject(new Error('commit failed'));
      return Promise.resolve({ rows: [] });
    });

    await expect(
      withNeonAuthContext(pool, { role: 'authenticated' }, async () => 'ok')
    ).rejects.toThrow('commit failed');

    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('never uses pool.query() directly, only a dedicated checked-out client', async () => {
    const poolWithQuery = pool as Pool & { query?: unknown };
    poolWithQuery.query = vi.fn();

    await withNeonAuthContext(pool, { role: 'anon' }, async () => undefined);

    expect(poolWithQuery.query).not.toHaveBeenCalled();
  });
});
