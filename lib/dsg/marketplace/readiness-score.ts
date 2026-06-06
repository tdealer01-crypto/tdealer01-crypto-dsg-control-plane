import type { MarketplaceReadinessReport, MarketplaceReadinessStatus } from './readiness';

export type ReadinessScore = {
  overall: number;
  verdict: 'PASS' | 'REVIEW' | 'BLOCKED';
  categories: Array<{
    id: string;
    title: string;
    score: number;
    status: 'PASS' | 'REVIEW' | 'BLOCKED';
    blockers: string[];
    nextAction: string;
  }>;
  missingEvidence: string[];
  caps: string[];
};

function scoreGate(status: MarketplaceReadinessStatus, hasSmokeEvidence: boolean): number {
  if (status === 'PASS') return 100;
  if (status === 'BLOCKED') return 0;
  return hasSmokeEvidence ? 70 : 50;
}

export function createReadinessScore(report: MarketplaceReadinessReport): ReadinessScore {
  const categories = report.gates.map((gate) => {
    const hasSmokeEvidence = gate.verifiedEvidence.some((item) => item.toLowerCase().includes('smoke'));
    return {
      id: gate.id,
      title: gate.title,
      score: scoreGate(gate.status, hasSmokeEvidence),
      status: gate.status,
      blockers: gate.status === 'PASS' ? [] : gate.requiredEvidence,
      nextAction: gate.nextAction,
    };
  });

  const rawOverall = Math.round(categories.reduce((sum, category) => sum + category.score, 0) / Math.max(categories.length, 1));
  const hasOwnerApproval = report.gates.some((gate) => gate.verifiedEvidence.some((item) => /owner approval/i.test(item)));
  const hasEnforcementProof = report.gates.some((gate) => gate.verifiedEvidence.some((item) => /enforcement test|server-side rbac|entitlement denial/i.test(item)));
  const caps: string[] = [];
  let overall = rawOverall;
  if (!hasOwnerApproval && overall > 80) {
    overall = 80;
    caps.push('overall capped at 80 until owner approval evidence exists');
  }

  const hasBlocked = categories.some((category) => category.status === 'BLOCKED');
  const hasReview = categories.some((category) => category.status === 'REVIEW');
  const verdict: ReadinessScore['verdict'] = hasBlocked || !hasEnforcementProof ? 'BLOCKED' : hasReview ? 'REVIEW' : 'PASS';
  if (!hasEnforcementProof) caps.push('overall verdict cannot be PASS until enforcement proof exists');

  return {
    overall,
    verdict,
    categories,
    missingEvidence: categories.flatMap((category) => category.blockers.map((blocker) => `${category.id}: ${blocker}`)),
    caps,
  };
}
