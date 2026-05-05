import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runAuthRbacProof } from '@/lib/dsg/runtime/auth-rbac-proof';

describe('auth/rbac proof probe', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('PASS when public is accessible and protected/admin are rejected', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
      .mockResolvedValueOnce(new Response('denied', { status: 401 }))
      .mockResolvedValueOnce(new Response('redirect', { status: 302, headers: { location: '/login' } })));

    const result = await runAuthRbacProof({
      previewUrl: 'https://preview.example.com',
      routes: [
        { path: '/', kind: 'public' },
        { path: '/dashboard', kind: 'protected' },
        { path: '/admin', kind: 'admin' },
      ],
      authRequired: true,
      rbacRequired: true,
    });

    expect(result.status).toBe('PASS');
    expect(result.routesChecked).toHaveLength(3);
  });

  it('FAIL when protected route returns 200 anonymously', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })));
    const result = await runAuthRbacProof({
      previewUrl: 'https://preview.example.com',
      routes: [{ path: '/protected', kind: 'protected' }],
      authRequired: true,
    });

    expect(result.status).toBe('FAILED');
    expect(result.hardFailures).toContain('PROTECTED_ROUTE_ACCESSIBLE_ANONYMOUS');
  });

  it('MANUAL_REQUIRED for oauth manual-only without test identity', async () => {
    const result = await runAuthRbacProof({
      previewUrl: 'https://preview.example.com',
      routes: [],
      oauthFlow: 'manual_only',
      hasTestIdentity: false,
    });
    expect(result.status).toBe('MANUAL_REQUIRED');
  });

  it('BLOCK on fake role/header signal', async () => {
    const result = await runAuthRbacProof({
      previewUrl: 'https://preview.example.com',
      routes: [],
      signals: { fakeRoleHeader: true },
    });
    expect(result.status).toBe('BLOCK');
    expect(result.hardFailures).toContain('FAKE_ROLE_HEADER_SIGNAL');
  });

  it('proofHash is sha256 prefixed', async () => {
    const result = await runAuthRbacProof({
      previewUrl: 'https://preview.example.com',
      routes: [],
    });
    expect(result.proofHash.startsWith('sha256:')).toBe(true);
  });

  it('hardFailures count is correct', async () => {
    const result = await runAuthRbacProof({
      routes: [],
      authRequired: true,
      rbacRequired: true,
      signals: { fakeCookie: true, callerBooleans: true },
    });
    expect(result.status).toBe('BLOCK');
    expect(result.hardFailures.length).toBe(5);
  });
});
