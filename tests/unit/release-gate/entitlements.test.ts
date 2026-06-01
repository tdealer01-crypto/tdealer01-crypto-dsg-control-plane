import { beforeEach, describe, expect, it, vi } from 'vitest';

const eqStatusMock = vi.fn();
const inMock = vi.fn(() => ({ limit: vi.fn(() => eqStatusMock()) }));
const eqEmailMock = vi.fn(() => ({ in: inMock }));

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: eqEmailMock,
      })),
    })),
  })),
}));

describe('hasReleaseGateProAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false for null email without querying the database', async () => {
    const { hasReleaseGateProAccess } = await import('../../../lib/release-gate/entitlements');
    const result = await hasReleaseGateProAccess(null);

    expect(result).toBe(false);
    expect(eqEmailMock).not.toHaveBeenCalled();
  });

  it('returns false when there are no matching entitlements', async () => {
    eqStatusMock.mockResolvedValue({ data: [], error: null });

    const { hasReleaseGateProAccess } = await import('../../../lib/release-gate/entitlements');
    const result = await hasReleaseGateProAccess('user@example.com');

    expect(result).toBe(false);
  });

  it('returns true when an active entitlement exists', async () => {
    eqStatusMock.mockResolvedValue({ data: [{ id: 'ent-1' }], error: null });

    const { hasReleaseGateProAccess } = await import('../../../lib/release-gate/entitlements');
    const result = await hasReleaseGateProAccess('user@example.com');

    expect(result).toBe(true);
  });

  it('returns false on database error', async () => {
    eqStatusMock.mockResolvedValue({ data: null, error: { message: 'connection refused' } });

    const { hasReleaseGateProAccess } = await import('../../../lib/release-gate/entitlements');
    const result = await hasReleaseGateProAccess('user@example.com');

    expect(result).toBe(false);
  });

  it('returns false when data is null with no error', async () => {
    eqStatusMock.mockResolvedValue({ data: null, error: null });

    const { hasReleaseGateProAccess } = await import('../../../lib/release-gate/entitlements');
    const result = await hasReleaseGateProAccess('user@example.com');

    expect(result).toBe(false);
  });
});
