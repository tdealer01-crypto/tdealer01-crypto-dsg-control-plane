export type EntitlementStatus = 'PASS' | 'REVIEW' | 'BLOCKED';

export type EntitlementCheck = {
  id: string;
  title: string;
  status: EntitlementStatus;
  evidence: string[];
  requiredBeforePass: string[];
  nextAction: string;
};

export type EntitlementReport = {
  ok: true;
  kit: 'enterprise-entitlement-evidence-kit';
  generatedAt: string;
  verdict: EntitlementStatus;
  checks: EntitlementCheck[];
  noMockPolicy: { enforced: true; rule: string };
};

const checks: EntitlementCheck[] = [
  {
    id: 'plan-source-of-truth',
    title: 'Plan source of truth',
    status: 'BLOCKED',
    evidence: [],
    requiredBeforePass: ['Production plan table or billing provider contract', 'Plan id mapping', 'Allowed features per plan'],
    nextAction: 'Attach production plan source before PASS.',
  },
  {
    id: 'seat-quota-policy',
    title: 'Seat and quota policy',
    status: 'BLOCKED',
    evidence: [],
    requiredBeforePass: ['Seat limit source', 'Quota counter source', 'Quota exceeded denial test'],
    nextAction: 'Add seat and quota enforcement proof before PASS.',
  },
  {
    id: 'upgrade-path',
    title: 'Upgrade and billing handoff',
    status: 'BLOCKED',
    evidence: [],
    requiredBeforePass: ['Checkout or upgrade route', 'Billing portal route', 'Failed payment behavior'],
    nextAction: 'Attach upgrade flow proof before PASS.',
  },
  {
    id: 'review-scaffold',
    title: 'Entitlement review scaffold',
    status: 'REVIEW',
    evidence: ['Endpoint: /api/dsg/marketplace/entitlement', 'Page: /enterprise/entitlement', 'Script: smoke:entitlement'],
    requiredBeforePass: ['Runtime enforcement proof', 'Negative entitlement test', 'Owner approval'],
    nextAction: 'Run smoke script and attach real enforcement evidence before PASS.',
  },
];

function deriveVerdict(items: EntitlementCheck[]): EntitlementStatus {
  if (items.some((item) => item.status === 'BLOCKED')) return 'BLOCKED';
  if (items.some((item) => item.status === 'REVIEW')) return 'REVIEW';
  return 'PASS';
}

export function getEntitlementReport(): EntitlementReport {
  return {
    ok: true,
    kit: 'enterprise-entitlement-evidence-kit',
    generatedAt: new Date().toISOString(),
    verdict: deriveVerdict(checks),
    checks,
    noMockPolicy: {
      enforced: true,
      rule: 'Do not mark entitlement checks PASS until real plan, seat, quota, upgrade, and denial evidence are attached.',
    },
  };
}
