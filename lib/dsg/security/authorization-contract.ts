export type DsgAuthorizationDecision = {
  ok: boolean;
  subjectId: string | null;
  orgId: string | null;
  action: string;
  resource: string;
  reason: 'ALLOW' | 'MISSING_SUBJECT' | 'MISSING_ORG' | 'ROLE_DENIED' | 'ORG_DENIED' | 'POLICY_MISSING';
  auditRequired: boolean;
};

export type DsgAuthorizationInput = {
  subjectId?: string | null;
  orgId?: string | null;
  action: string;
  resource: string;
  allowedActions?: string[];
  sameOrg?: boolean;
};

export function decideDsgAuthorization(input: DsgAuthorizationInput): DsgAuthorizationDecision {
  if (!input.subjectId) return { ok: false, subjectId: null, orgId: input.orgId ?? null, action: input.action, resource: input.resource, reason: 'MISSING_SUBJECT', auditRequired: true };
  if (!input.orgId) return { ok: false, subjectId: input.subjectId, orgId: null, action: input.action, resource: input.resource, reason: 'MISSING_ORG', auditRequired: true };
  if (input.sameOrg === false) return { ok: false, subjectId: input.subjectId, orgId: input.orgId, action: input.action, resource: input.resource, reason: 'ORG_DENIED', auditRequired: true };
  if (!input.allowedActions) return { ok: false, subjectId: input.subjectId, orgId: input.orgId, action: input.action, resource: input.resource, reason: 'POLICY_MISSING', auditRequired: true };
  if (!input.allowedActions.includes(input.action)) return { ok: false, subjectId: input.subjectId, orgId: input.orgId, action: input.action, resource: input.resource, reason: 'ROLE_DENIED', auditRequired: true };
  return { ok: true, subjectId: input.subjectId, orgId: input.orgId, action: input.action, resource: input.resource, reason: 'ALLOW', auditRequired: true };
}
