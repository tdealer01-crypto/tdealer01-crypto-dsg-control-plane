export type MarketplaceReadinessStatus = 'PASS' | 'REVIEW' | 'BLOCKED';

export type MarketplaceReadinessGate = {
  id: string;
  title: string;
  status: MarketplaceReadinessStatus;
  userBenefit: string;
  verifiedEvidence: string[];
  requiredEvidence: string[];
  nextAction: string;
};

export type MarketplaceReadinessReport = {
  ok: true;
  product: 'DSG ONE V1';
  kit: 'enterprise-marketplace-readiness-audit-kit';
  generatedAt: string;
  verdict: MarketplaceReadinessStatus;
  summary: string;
  gates: MarketplaceReadinessGate[];
  noMockPolicy: {
    enforced: true;
    rule: string;
  };
};

const gates: MarketplaceReadinessGate[] = [
  {
    id: 'deployment-proof',
    title: 'Production deployment proof',
    status: 'REVIEW',
    userBenefit: 'ผู้ใช้มั่นใจได้ว่าแอปเปิดได้จริงใน production ไม่ใช่แค่โค้ดใน repo',
    verifiedEvidence: [
      'Existing package script: dsg:production-flow-check',
      'Existing Vercel deployment proof must be attached from deployment logs before marketplace submission',
    ],
    requiredEvidence: [
      'Latest production deployment READY proof',
      'Production URL returns 2xx without unexpected auth wall for intended audience',
      'Body/proof hash from scripts/dsg-production-flow-check.mjs',
    ],
    nextAction: 'Run dsg:production-flow-check with the exact production URL and attach proofHash to the release note.',
  },
  {
    id: 'app-builder-proof',
    title: 'App Builder governed flow proof',
    status: 'REVIEW',
    userBenefit: 'ผู้ใช้เห็น PRD, plan, proof และ blocked state โดยไม่ถูกหลอกว่า production-ready ก่อนมีหลักฐานครบ',
    verifiedEvidence: [
      'Existing endpoint: /api/dsg/app-builder/proof',
      'Existing smoke script: smoke:app-builder-flow-proof',
    ],
    requiredEvidence: [
      'GET /api/dsg/app-builder/proof returns ok=true and status=PASS',
      'Smoke assertion proves runtime remains blocked without executor proof',
      'Claim boundary keeps productionReadyClaim=false until evidence exists',
    ],
    nextAction: 'Run smoke:app-builder-flow-proof against the production APP_URL and store the output in the audit packet.',
  },
  {
    id: 'security-rbac-org-isolation',
    title: 'Security, RBAC, and organization isolation',
    status: 'BLOCKED',
    userBenefit: 'ผู้ใช้ enterprise ต้องมั่นใจว่าสิทธิ์และข้อมูลข้ามองค์กรไม่รั่ว',
    verifiedEvidence: [],
    requiredEvidence: [
      'Server-side RBAC proof for critical read/write routes',
      'Cross-org access denial test',
      'Audit event for privileged actions',
      'Deny-by-default error contract',
    ],
    nextAction: 'Add or attach tests proving unauthorized role and cross-org access are denied server-side.',
  },
  {
    id: 'commercial-entitlement',
    title: 'Billing, entitlement, seat, and quota gates',
    status: 'BLOCKED',
    userBenefit: 'ผู้ใช้รู้ขอบเขตแพ็กเกจชัดเจน และระบบไม่เปิด bypass ฟรีในเส้นทางสำคัญ',
    verifiedEvidence: [],
    requiredEvidence: [
      'Plan/seat/quota source-of-truth',
      'Quota exceeded behavior with clear message',
      'Upgrade path proof',
      'Entitlement denial test for restricted action',
    ],
    nextAction: 'Wire entitlement checks to production source-of-truth and add a negative test for quota/seat denial.',
  },
  {
    id: 'legal-support-package',
    title: 'Marketplace legal and support package',
    status: 'BLOCKED',
    userBenefit: 'ผู้ซื้อ enterprise มี Terms, Privacy, Security, Support และ data handling clarity ก่อนติดตั้ง',
    verifiedEvidence: [],
    requiredEvidence: [
      'Terms page',
      'Privacy page',
      'Security page',
      'Support/SLA page',
      'Data retention and subprocessors statement when applicable',
    ],
    nextAction: 'Create customer-facing legal/support pages and link them from the readiness page.',
  },
  {
    id: 'accessibility-qa',
    title: 'Accessibility and QA proof',
    status: 'BLOCKED',
    userBenefit: 'ผู้ใช้ทำงานได้ด้วย keyboard/screen reader และทีมขายมีหลักฐานคุณภาพก่อนส่ง marketplace',
    verifiedEvidence: [],
    requiredEvidence: [
      'Lint result or explicit lint waiver',
      'WCAG 2.2 AA checklist for core pages',
      'Keyboard navigation proof',
      'E2E smoke for first-time user get-started flow',
    ],
    nextAction: 'Add automated smoke coverage and a manual accessibility checklist for /dsg/app-builder.',
  },
];

function deriveVerdict(items: MarketplaceReadinessGate[]): MarketplaceReadinessStatus {
  if (items.some((item) => item.status === 'BLOCKED')) return 'BLOCKED';
  if (items.some((item) => item.status === 'REVIEW')) return 'REVIEW';
  return 'PASS';
}

export function getEnterpriseMarketplaceReadinessReport(): MarketplaceReadinessReport {
  const verdict = deriveVerdict(gates);

  return {
    ok: true,
    product: 'DSG ONE V1',
    kit: 'enterprise-marketplace-readiness-audit-kit',
    generatedAt: new Date().toISOString(),
    verdict,
    summary:
      verdict === 'PASS'
        ? 'All marketplace readiness gates have attached evidence.'
        : 'Marketplace readiness is not a full pass yet. Existing deployment and app-builder proof can be attached, but security, entitlement, legal/support, accessibility, and QA evidence are still required.',
    gates,
    noMockPolicy: {
      enforced: true,
      rule: 'No gate may be marked PASS unless the required evidence is generated by a real file, route, test, deployment, or customer-facing page in this repository or production environment.',
    },
  };
}
