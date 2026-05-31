import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(),
}));

import {
  normalizeDomain,
  findMatchingOrgDomain,
  resolveDomainGovernance,
  type OrgDomainRow,
} from '../../../lib/auth/domain-governance';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

const mockGetAdmin = vi.mocked(getSupabaseAdmin);

function row(partial: Partial<OrgDomainRow>): OrgDomainRow {
  return {
    id: partial.id ?? 'id-1',
    org_id: partial.org_id ?? 'org-1',
    domain: partial.domain ?? 'example.com',
    status: partial.status ?? 'approved',
    verification_method: partial.verification_method ?? null,
    verification_token: partial.verification_token ?? null,
    verified_at: partial.verified_at ?? null,
    claim_mode: partial.claim_mode ?? 'manual',
    auto_join_mode: partial.auto_join_mode ?? 'disabled',
    notes: partial.notes ?? null,
    created_at: partial.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: partial.updated_at ?? '2026-01-01T00:00:00.000Z',
  };
}

/**
 * Builds a chainable Supabase query stub that resolves to `result` once the
 * chain is awaited. Supports the .select().eq().order()/.in() shapes used by
 * domain-governance.ts.
 */
function makeQuery(result: { data: OrgDomainRow[] | null; error: unknown }) {
  const q: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'in']) {
    q[method] = vi.fn(() => q);
  }
  (q as any).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}

function makeAdmin(result: { data: OrgDomainRow[] | null; error: unknown }) {
  return { from: vi.fn(() => makeQuery(result)) } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.APPROVED_DOMAINS;
  delete process.env.APPROVED_AUTO_JOIN_DOMAINS;
  delete process.env.APPROVAL_REQUIRED_DOMAINS;
});

describe('normalizeDomain', () => {
  it('trims, lowercases and strips leading @', () => {
    expect(normalizeDomain('  @Example.COM ')).toBe('example.com');
  });
  it('returns empty string for null/undefined', () => {
    expect(normalizeDomain(null)).toBe('');
    expect(normalizeDomain(undefined)).toBe('');
  });
});

describe('findMatchingOrgDomain', () => {
  it('returns null for empty domain without touching the db', async () => {
    expect(await findMatchingOrgDomain('')).toBeNull();
    expect(mockGetAdmin).not.toHaveBeenCalled();
  });

  it('prefers a verified row over an approved row', async () => {
    mockGetAdmin.mockReturnValue(
      makeAdmin({
        data: [
          row({ id: 'approved', status: 'approved' }),
          row({ id: 'verified', status: 'verified' }),
        ],
        error: null,
      }),
    );
    const result = await findMatchingOrgDomain('example.com');
    expect(result?.id).toBe('verified');
  });

  it('throws when the db returns an error', async () => {
    mockGetAdmin.mockReturnValue(makeAdmin({ data: null, error: new Error('boom') }));
    await expect(findMatchingOrgDomain('example.com')).rejects.toThrow('boom');
  });
});

describe('resolveDomainGovernance', () => {
  it('returns disabled default for empty domain', async () => {
    const r = await resolveDomainGovernance('');
    expect(r.source).toBe('default');
    expect(r.status).toBe('disabled');
    expect(r.is_managed_identity).toBe(false);
  });

  it('resolves from db and marks verified domain as managed identity', async () => {
    mockGetAdmin.mockReturnValue(
      makeAdmin({ data: [row({ status: 'verified' })], error: null }),
    );
    const r = await resolveDomainGovernance('example.com');
    expect(r.source).toBe('db');
    expect(r.status).toBe('verified');
    expect(r.is_managed_identity).toBe(true);
  });

  it('falls back to env auto_join when no db rule matches', async () => {
    mockGetAdmin.mockReturnValue(makeAdmin({ data: [], error: null }));
    process.env.APPROVED_AUTO_JOIN_DOMAINS = 'example.com';
    const r = await resolveDomainGovernance('Example.com');
    expect(r.source).toBe('env');
    expect(r.auto_join_mode).toBe('auto_join');
  });

  it('falls back to env require_approval list', async () => {
    mockGetAdmin.mockReturnValue(makeAdmin({ data: [], error: null }));
    process.env.APPROVAL_REQUIRED_DOMAINS = 'example.com';
    const r = await resolveDomainGovernance('example.com');
    expect(r.source).toBe('env');
    expect(r.auto_join_mode).toBe('require_approval');
  });

  it('returns disabled default when nothing matches', async () => {
    mockGetAdmin.mockReturnValue(makeAdmin({ data: [], error: null }));
    const r = await resolveDomainGovernance('nomatch.com');
    expect(r.source).toBe('default');
    expect(r.status).toBe('disabled');
  });
});
