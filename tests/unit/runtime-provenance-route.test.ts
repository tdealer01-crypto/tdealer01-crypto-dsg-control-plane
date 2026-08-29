import { afterEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/dsg/v1/runtime/route';

const original = {
  DSG_GIT_SHA: process.env.DSG_GIT_SHA,
  DSG_IMAGE_DIGEST: process.env.DSG_IMAGE_DIGEST,
  DSG_BUILD_TIMESTAMP: process.env.DSG_BUILD_TIMESTAMP,
};

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('GET /api/dsg/v1/runtime', () => {
  it('returns deployment provenance without caching', async () => {
    process.env.DSG_GIT_SHA = 'abc123';
    process.env.DSG_IMAGE_DIGEST = `sha256:${'d'.repeat(64)}`;
    process.env.DSG_BUILD_TIMESTAMP = '2026-08-29T02:00:00Z';

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual({
      service: 'dsg-control-plane',
      gitSha: 'abc123',
      imageDigest: `sha256:${'d'.repeat(64)}`,
      builtAt: '2026-08-29T02:00:00Z',
    });
  });

  it('returns null for unset provenance instead of inventing identity', async () => {
    delete process.env.DSG_GIT_SHA;
    delete process.env.DSG_IMAGE_DIGEST;
    delete process.env.DSG_BUILD_TIMESTAMP;

    const response = await GET();

    expect(await response.json()).toEqual({
      service: 'dsg-control-plane',
      gitSha: null,
      imageDigest: null,
      builtAt: null,
    });
  });
});
