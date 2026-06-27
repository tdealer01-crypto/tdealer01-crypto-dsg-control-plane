/**
 * Incidents API — Integration Test Suite
 *
 * Tests the three incidents endpoints:
 *   GET    /api/incidents  — list incidents (monitor+)
 *   POST   /api/incidents  — create incident (admin)
 *   PATCH  /api/incidents  — update incident status (admin)
 *
 * Auth is mocked at the lib/authz-runtime layer so tests run without a live
 * Supabase connection.  The route handlers are imported directly and called
 * with synthetic Request objects.
 *
 * Run: npx vitest run tests/integration/incidents-api.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

// ─── Mock auth before importing route handlers ───────────────────────────────

vi.mock('@/lib/authz-runtime', () => ({
  requireRuntimeAccess: vi.fn(),
}));

vi.mock('@/lib/security/api-error', () => ({
  internalErrorMessage: () => 'Internal server error',
  logApiError: vi.fn(),
}));

// Now safe to import route handlers (their requireRuntimeAccess calls are mocked)
import { requireRuntimeAccess } from '@/lib/authz-runtime';
import { GET, POST, PATCH } from '@/app/api/incidents/route';

type AccessResult = Awaited<ReturnType<typeof requireRuntimeAccess>>;

// ─── helpers ─────────────────────────────────────────────────────────────────

function jsonRequest(body: unknown, method = 'POST'): Request {
  return new Request('http://localhost:3000/api/incidents', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function urlRequest(url: string): Request {
  return new Request(url, { method: 'GET' });
}

function authedResult(orgId = 'org-1'): Extract<AccessResult, { ok: true }> {
  return {
    ok: true,
    orgId,
    userId: 'user-1',
    grantedRoles: ['operator', 'org_admin'],
    actorType: 'user',
  };
}

function deniedResult(status = 401, error = 'unauthorized'): Extract<AccessResult, { ok: false }> {
  return { ok: false, status, error };
}

const mockAccess = requireRuntimeAccess as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/incidents — List
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/incidents — list incidents', () => {
  it('returns structured list when auth succeeds', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());

    const res = await GET(urlRequest('http://localhost:3000/api/incidents'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.count).toBe('number');
  });

  it('passes monitor-level access to GET handler (pre-condition check)', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());
    await GET(urlRequest('http://localhost:3000/api/incidents'));
    expect(mockAccess).toHaveBeenCalledWith(expect.any(Request), 'monitor');
  });

  it('returns 401 when auth is denied', async () => {
    mockAccess.mockResolvedValueOnce(deniedResult(401, 'Unauthorized'));
    const res = await GET(urlRequest('http://localhost:3000/api/incidents'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns items sorted by created_at descending', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());
    const res = await GET(urlRequest('http://localhost:3000/api/incidents'));
    const body = await res.json();

    const dates = body.items.map((i: { created_at: string }) => new Date(i.created_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/incidents — Create
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/incidents — create incident', () => {
  it('creates a new incident with valid payload', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());

    const payload = {
      severity: 'P2',
      title: 'Test incident from integration suite',
      description: 'Integration test description',
    };

    const res = await POST(jsonRequest(payload));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.incident).toMatchObject({
      severity: 'P2',
      title: payload.title,
      description: payload.description,
      status: 'open',
    });
    expect(body.incident.id).toMatch(/^INC-\d{4}-/);
  });

  it('requires admin-level access', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());
    await POST(jsonRequest({ severity: 'P3', title: 'access check' }));
    expect(mockAccess).toHaveBeenCalledWith(expect.any(Request), 'admin');
  });

  it('returns 401 when auth is denied', async () => {
    mockAccess.mockResolvedValueOnce(deniedResult(401, 'Unauthorized'));
    const res = await POST(jsonRequest({ severity: 'P1', title: 'auth-fail test' }));
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/incidents — Validation errors
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/incidents — validation errors', () => {
  it('rejects when severity is missing', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());
    const res = await POST(jsonRequest({ title: 'no severity' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/severity/i);
  });

  it('rejects when title is missing', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());
    const res = await POST(jsonRequest({ severity: 'P3' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/title/i);
  });

  it('rejects invalid severity value', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());
    const res = await POST(jsonRequest({ severity: 'P99', title: 'bad sev' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/severity/i);
  });

  it('rejects empty body', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());
    const res = await POST(jsonRequest(null));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('rejects severity with wrong type', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());
    const res = await POST(jsonRequest({ severity: 123, title: 'wrong type' }));
    const body = await res.json();

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PATCH /api/incidents — Update status
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/incidents — update incident status', () => {
  it('updates status of an existing incident', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());

    const patchRes = await PATCH(
      jsonRequest({ id: 'INC-2026-002', status: 'contained' }),
    );
    const patchBody = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patchBody.ok).toBe(true);
    expect(patchBody.incident.status).toBe('contained');
  });

  it('sets resolved_at when status transitions to resolved', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());

    const patchRes = await PATCH(
      jsonRequest({ id: 'INC-2026-002', status: 'resolved' }),
    );
    const patchBody = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patchBody.incident.resolved_at).toBeDefined();
  });

  it('requires admin-level access for PATCH', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());
    await PATCH(jsonRequest({ id: 'INC-2026-001', status: 'investigating' }));
    expect(mockAccess).toHaveBeenCalledWith(expect.any(Request), 'admin');
  });

  it('returns 401 when auth is denied', async () => {
    mockAccess.mockResolvedValueOnce(deniedResult(401, 'Unauthorized'));
    const res = await PATCH(jsonRequest({ id: 'INC-2026-001', status: 'open' }));
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PATCH /api/incidents — Not found
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/incidents — not found', () => {
  it('returns 404 for non-existent incident id', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());

    const res = await PATCH(
      jsonRequest({ id: 'INC-NONEXISTENT-999', status: 'resolved' }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });

  it('returns 400 when id is missing', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());
    const res = await PATCH(jsonRequest({ status: 'contained' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/id is required/i);
  });

  it('returns 400 for invalid status value', async () => {
    mockAccess.mockResolvedValueOnce(authedResult());
    const res = await PATCH(
      jsonRequest({ id: 'INC-2026-001', status: 'bogus_status' }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/status must be one of/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Auth — required on all endpoints
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth — required on all endpoints', () => {
  it('GET rejects unauthenticated requests', async () => {
    mockAccess.mockResolvedValueOnce(deniedResult(401, 'unauthorized'));
    const res = await GET(urlRequest('http://localhost:3000/api/incidents'));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('POST rejects unauthenticated requests', async () => {
    mockAccess.mockResolvedValueOnce(deniedResult(401, 'unauthorized'));
    const res = await POST(jsonRequest({ severity: 'P1', title: 'test' }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('PATCH rejects unauthenticated requests', async () => {
    mockAccess.mockResolvedValueOnce(deniedResult(401, 'unauthorized'));
    const res = await PATCH(jsonRequest({ id: 'INC-2026-001', status: 'resolved' }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('GET rejects requests with insufficient role', async () => {
    mockAccess.mockResolvedValueOnce(deniedResult(403, 'Forbidden'));
    const res = await GET(urlRequest('http://localhost:3000/api/incidents'));
    expect(res.status).toBe(403);
  });

  it('all three endpoints delegate to requireRuntimeAccess', () => {
    const src = readFileSync('app/api/incidents/route.ts', 'utf8');
    expect(src).toContain('requireRuntimeAccess');
    // Verify all three handlers are defined
    const getMatch = src.match(/export async function GET/);
    const postMatch = src.match(/export async function POST/);
    const patchMatch = src.match(/export async function PATCH/);
    expect(getMatch).toBeTruthy();
    expect(postMatch).toBeTruthy();
    expect(patchMatch).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. File-structure sanity
// ─────────────────────────────────────────────────────────────────────────────
describe('File-structure sanity', () => {
  it('incidents route file exists', () => {
    expect(existsSync('app/api/incidents/route.ts')).toBe(true);
  });

  it('route exports GET, POST, and PATCH', async () => {
    const mod = await import('@/app/api/incidents/route');
    expect(typeof mod.GET).toBe('function');
    expect(typeof mod.POST).toBe('function');
    expect(typeof mod.PATCH).toBe('function');
  });

  it('requireRuntimeAccess delegate module exists', () => {
    expect(existsSync('lib/authz-runtime.ts')).toBe(true);
  });

  it('incident response playbook doc exists', () => {
    expect(existsSync('docs/compliance/incident-response-playbook.md')).toBe(true);
  });
});
