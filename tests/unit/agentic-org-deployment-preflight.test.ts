import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The preflight contract the deploy job in dsg-agi-simulation relies on. It
// signs exactly this string (there is no body on a GET) and then reads
// status / provider / productionDeployEnabled / deploymentSlot off the
// response. These tests pin that contract: a drift here strands the deploy job
// with an error it can only hit against real Azure, never in CI.
const PREFLIGHT_MESSAGE = 'dsg-deployment-preflight-v1';
const SECRET = 'test-preflight-secret';

function signedRequest(message = PREFLIGHT_MESSAGE, secret = SECRET) {
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return new Request('https://control-plane.test/api/dsg/agentic-org/deployment/record', {
    method: 'GET',
    headers: { 'x-dsg-signature': `sha256=${signature}` },
  });
}

async function loadRoute(target: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock('@/config/production-deployment-target.json', () => ({ default: target }));
  return import('../../app/api/dsg/agentic-org/deployment/record/route');
}

const BOUND_TARGET = {
  schemaVersion: 'dsg.production-target.v1',
  provider: 'AZURE',
  status: 'BOUND',
  productionDeployEnabled: true,
  rollbackTarget: 'staging',
  healthProbe: '/api/agent/status',
};

const UNBOUND_TARGET = {
  schemaVersion: 'dsg.production-target.v1',
  provider: 'UNBOUND',
  status: 'BLOCKED_UNTIL_BOUND',
  productionDeployEnabled: false,
  rollbackTarget: null,
  healthProbe: null,
};

describe('deployment preflight (GET)', () => {
  beforeEach(() => {
    process.env.DSG_PROMOTION_EVALUATION_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.DSG_PROMOTION_EVALUATION_SECRET;
    vi.resetModules();
    vi.doUnmock('@/config/production-deployment-target.json');
  });

  it('returns the fields the deploy job reads when the target is bound', async () => {
    const { GET } = await loadRoute(BOUND_TARGET);
    const response = await GET(signedRequest() as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    // Exactly the four assertions the deploy job makes before touching Azure.
    expect(body.status).toBe('PASS');
    expect(body.provider).toBe('AZURE');
    expect(body.productionDeployEnabled).toBe(true);
    expect(body.deploymentSlot).toBe('staging');
  });

  it('blocks while the production target is unbound', async () => {
    const { GET } = await loadRoute(UNBOUND_TARGET);
    const response = await GET(signedRequest() as never);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.status).toBe('BLOCK');
    expect(body.reason).toBe('PRODUCTION_TARGET_UNBOUND');
  });

  it('blocks a bound target that has no rollback slot, rather than deploying with no way back', async () => {
    const { GET } = await loadRoute({ ...BOUND_TARGET, rollbackTarget: '' });
    const response = await GET(signedRequest() as never);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.reason).toBe('PRODUCTION_TARGET_ROLLBACK_SLOT_MISSING');
    expect(body.deploymentSlot).toBeNull();
  });

  it('rejects a signature made with the wrong secret', async () => {
    const { GET } = await loadRoute(BOUND_TARGET);
    const response = await GET(signedRequest(PREFLIGHT_MESSAGE, 'wrong-secret') as never);

    expect(response.status).toBe(401);
    expect((await response.json()).reason).toBe('DEPLOYMENT_PREFLIGHT_SIGNATURE_INVALID');
  });

  it('rejects a signature over a different message', async () => {
    const { GET } = await loadRoute(BOUND_TARGET);
    const response = await GET(signedRequest('dsg-deployment-preflight-v2') as never);

    expect(response.status).toBe(401);
  });

  it('rejects an unsigned request', async () => {
    const { GET } = await loadRoute(BOUND_TARGET);
    const request = new Request('https://control-plane.test/api/dsg/agentic-org/deployment/record', { method: 'GET' });
    const response = await GET(request as never);

    expect(response.status).toBe(401);
  });

  it('fails closed when the signing secret is not configured', async () => {
    delete process.env.DSG_PROMOTION_EVALUATION_SECRET;
    const { GET } = await loadRoute(BOUND_TARGET);
    const response = await GET(signedRequest() as never);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.reason).toBe('DEPLOYMENT_RECORD_NOT_CONFIGURED');
    expect(body.missing).toContain('DSG_PROMOTION_EVALUATION_SECRET');
  });
});
