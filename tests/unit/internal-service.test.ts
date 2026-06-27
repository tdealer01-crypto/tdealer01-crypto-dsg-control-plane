import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { requireInternalService } from '../../lib/auth/internal-service';

describe('requireInternalService', () => {
  beforeEach(() => {
    process.env.INTERNAL_SERVICE_TOKEN = 'legacy-token';
    process.env.INTERNAL_SERVICE_TOKENS = 'rotated-1,rotated-2';
  });

  afterEach(() => {
    delete process.env.INTERNAL_SERVICE_TOKEN;
    delete process.env.INTERNAL_SERVICE_TOKENS;
  });

  it('authorizes with rotated token list', () => {
    const request = new Request('https://example.com', {
      headers: {
        authorization: 'Bearer rotated-2',
        'x-org-id': 'org-1',
      },
    });

    const result = requireInternalService(request);
    expect(result.ok).toBe(true);
  });

  it('rejects invalid token', () => {
    const request = new Request('https://example.com', {
      headers: {
        authorization: 'Bearer invalid',
        'x-org-id': 'org-1',
      },
    });

    const result = requireInternalService(request);
    expect(result).toEqual({ ok: false, status: 401, error: 'unauthorized_internal_service' });
  });
});
