import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runReleaseGate } from '../../../lib/release-gate/checker';

const BASE_URL = 'https://example.com';

const EXPECTED_PATHS = ['/terms', '/privacy', '/support', '/api/health', '/api/readiness'];

function mockFetchAll(statusCode: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: statusCode >= 200 && statusCode < 300, status: statusCode }),
  );
}

describe('runReleaseGate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns GO when all checks pass', async () => {
    mockFetchAll(200);
    const result = await runReleaseGate(BASE_URL);

    expect(result.ok).toBe(true);
    expect(result.verdict).toBe('GO');
  });

  it('returns NO-GO when any check fails', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const result = await runReleaseGate(BASE_URL);

    expect(result.ok).toBe(false);
    expect(result.verdict).toBe('NO-GO');
  });

  it('returns NO-GO when all checks fail', async () => {
    mockFetchAll(500);
    const result = await runReleaseGate(BASE_URL);

    expect(result.ok).toBe(false);
    expect(result.verdict).toBe('NO-GO');
  });

  it('handles network errors gracefully and marks that check as failed', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const result = await runReleaseGate(BASE_URL);

    expect(result.ok).toBe(false);
    const failedCheck = result.checks.find((c) => !c.ok);
    expect(failedCheck).toBeDefined();
    expect(failedCheck?.status).toBeUndefined();
  });

  it('returns checks for all 5 expected paths', async () => {
    mockFetchAll(200);
    const result = await runReleaseGate(BASE_URL);

    expect(result.checks).toHaveLength(5);
    const paths = result.checks.map((c) => c.name);
    expect(paths).toEqual(EXPECTED_PATHS);
  });

  it('prefixes each check url with the provided base url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await runReleaseGate(BASE_URL);

    for (const path of EXPECTED_PATHS) {
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}${path}`);
    }
  });

  it('includes status code in passing checks', async () => {
    mockFetchAll(200);
    const result = await runReleaseGate(BASE_URL);

    for (const check of result.checks) {
      expect(check.status).toBe(200);
    }
  });
});
