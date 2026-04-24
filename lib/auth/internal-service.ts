import { createHash, timingSafeEqual } from 'crypto';

export type InternalServiceIdentity = {
  ok: true;
  orgId: string;
  service: string;
  actorType: 'internal_service';
  agentId?: string;
  workspaceId?: string;
  executionId?: string;
};

export type InternalServiceFailure = {
  ok: false;
  status: number;
  error: string;
};

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function getExpectedTokenDigests(): Buffer[] {
  const legacy = process.env.INTERNAL_SERVICE_TOKEN ?? '';
  const rotated = (process.env.INTERNAL_SERVICE_TOKENS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const candidates = [...rotated, ...(legacy ? [legacy] : [])];
  return candidates.map((token) => digest(token));
}

function extractBearerToken(authHeader: string | null): string {
  if (!authHeader) return '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return '';
  return token;
}

function isAuthorized(authHeader: string | null): boolean {
  const providedToken = extractBearerToken(authHeader);
  if (!providedToken) return false;

  const providedDigest = digest(providedToken);
  const expectedDigests = getExpectedTokenDigests();
  if (expectedDigests.length === 0) return false;

  return expectedDigests.some((expectedDigest) => timingSafeEqual(providedDigest, expectedDigest));
}

export function requireInternalService(
  req: Request,
): InternalServiceIdentity | InternalServiceFailure {
  const auth = req.headers.get('authorization');

  if (!isAuthorized(auth)) {
    return { ok: false, status: 401, error: 'unauthorized_internal_service' };
  }

  const orgId = req.headers.get('x-org-id');
  if (!orgId) {
    return { ok: false, status: 400, error: 'missing_org_id' };
  }

  return {
    ok: true,
    orgId,
    service: req.headers.get('x-internal-service') ?? 'agent-governance',
    actorType: 'internal_service',
    agentId: req.headers.get('x-agent-id') ?? undefined,
    workspaceId: req.headers.get('x-workspace-id') ?? undefined,
    executionId: req.headers.get('x-execution-id') ?? undefined,
  };
}
