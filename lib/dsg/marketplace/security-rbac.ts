export type SecurityRbacStatus = 'PASS' | 'REVIEW' | 'BLOCKED';

export type SecurityRbacCheck = {
  id: string;
  title: string;
  status: SecurityRbacStatus;
  evidence: string[];
  requiredBeforePass: string[];
  nextAction: string;
};

export type SecurityRbacReport = {
  ok: true;
  kit: 'enterprise-security-rbac-evidence-kit';
  generatedAt: string;
  verdict: SecurityRbacStatus;
  checks: SecurityRbacCheck[];
  noMockPolicy: { enforced: true; rule: string };
};

const checks: SecurityRbacCheck[] = [
  {
    id: 'server-rbac',
    title: 'Server-side RBAC proof',
    status: 'BLOCKED',
    evidence: [],
    requiredBeforePass: ['Role source of truth', 'Allowed role test', 'Denied role test', 'Critical route coverage'],
    nextAction: 'Add route-level RBAC checks and negative tests before PASS.',
  },
  {
    id: 'org-isolation',
    title: 'Organization isolation proof',
    status: 'BLOCKED',
    evidence: [],
    requiredBeforePass: ['Org id source of truth', 'Cross-org denial test', 'Tenant scoped data access review'],
    nextAction: 'Add cross-org denial tests before PASS.',
  },
  {
    id: 'audit-events',
    title: 'Audit event proof',
    status: 'BLOCKED',
    evidence: [],
    requiredBeforePass: ['Audit event schema', 'Privileged action event test', 'Event retention owner'],
    nextAction: 'Add audit event schema and proof tests before PASS.',
  },
  {
    id: 'deny-default-contract',
    title: 'Deny-by-default contract',
    status: 'REVIEW',
    evidence: ['Endpoint: /api/dsg/marketplace/security-rbac', 'Page: /enterprise/security-rbac', 'Script: smoke:security-rbac'],
    requiredBeforePass: ['Runtime enforcement proof', 'Negative access tests', 'Owner review'],
    nextAction: 'Attach enforcement proof before PASS.',
  },
];

function deriveVerdict(items: SecurityRbacCheck[]): SecurityRbacStatus {
  if (items.some((item) => item.status === 'BLOCKED')) return 'BLOCKED';
  if (items.some((item) => item.status === 'REVIEW')) return 'REVIEW';
  return 'PASS';
}

export function getSecurityRbacReport(): SecurityRbacReport {
  return {
    ok: true,
    kit: 'enterprise-security-rbac-evidence-kit',
    generatedAt: new Date().toISOString(),
    verdict: deriveVerdict(checks),
    checks,
    noMockPolicy: {
      enforced: true,
      rule: 'Do not mark security or RBAC checks PASS until real enforcement, tests, and audit evidence are attached.',
    },
  };
}
