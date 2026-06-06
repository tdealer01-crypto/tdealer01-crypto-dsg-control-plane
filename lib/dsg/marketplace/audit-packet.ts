import { createAppBuilderFlowProof } from '@/lib/dsg/app-builder/proof/create-flow-proof';
import { getAccessibilityQaReport } from './accessibility-qa';
import { getEntitlementReport } from './entitlement';
import { getEnterpriseMarketplaceReadinessReport } from './readiness';
import { createReadinessScore, type ReadinessScore } from './readiness-score';
import { getSecurityRbacReport } from './security-rbac';

export type DsgAuditPacket = {
  ok: true;
  generatedAt: string;
  product: 'DSG ONE V1';
  baseUrl: string;
  readiness: unknown;
  readinessScore: ReadinessScore;
  accessibilityQa: unknown;
  securityRbac: unknown;
  entitlement: unknown;
  appBuilderProof: unknown;
  smokeEvidence: string[];
  missingEvidence: string[];
  finalVerdict: 'PASS' | 'REVIEW' | 'BLOCKED';
};

function combineVerdict(verdicts: Array<'PASS' | 'REVIEW' | 'BLOCKED'>): 'PASS' | 'REVIEW' | 'BLOCKED' {
  if (verdicts.includes('BLOCKED')) return 'BLOCKED';
  if (verdicts.includes('REVIEW')) return 'REVIEW';
  return 'PASS';
}

export function createDsgAuditPacket(baseUrl: string): DsgAuditPacket {
  const readiness = getEnterpriseMarketplaceReadinessReport();
  const accessibilityQa = getAccessibilityQaReport();
  const securityRbac = getSecurityRbacReport();
  const entitlement = getEntitlementReport();
  const appBuilderProof = createAppBuilderFlowProof('Create an evidence-first enterprise app builder audit packet.');
  const readinessScore = createReadinessScore(readiness);
  const missingEvidence = [
    ...readinessScore.missingEvidence,
    ...securityRbac.checks.flatMap((check) => check.status === 'PASS' ? [] : check.requiredBeforePass.map((item) => `security-rbac:${check.id}: ${item}`)),
    ...entitlement.checks.flatMap((check) => check.status === 'PASS' ? [] : check.requiredBeforePass.map((item) => `entitlement:${check.id}: ${item}`)),
    ...accessibilityQa.checks.flatMap((check) => check.status === 'PASS' ? [] : check.requiredBeforePass.map((item) => `accessibility:${check.id}: ${item}`)),
  ];
  const smokeEvidence = readiness.gates.flatMap((gate) => gate.verifiedEvidence.filter((item) => /smoke|script/i.test(item)));
  const combined = combineVerdict([readiness.verdict, accessibilityQa.verdict, securityRbac.verdict, entitlement.verdict, readinessScore.verdict]);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    product: 'DSG ONE V1',
    baseUrl,
    readiness,
    readinessScore,
    accessibilityQa,
    securityRbac,
    entitlement,
    appBuilderProof,
    smokeEvidence,
    missingEvidence,
    finalVerdict: combined === 'PASS' && missingEvidence.length > 0 ? 'REVIEW' : combined,
  };
}
