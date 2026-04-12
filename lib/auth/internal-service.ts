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

export function requireInternalService(
  req: Request,
): InternalServiceIdentity | InternalServiceFailure {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  const auth = req.headers.get('authorization');

  if (!expected || auth !== `Bearer ${expected}`) {
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
