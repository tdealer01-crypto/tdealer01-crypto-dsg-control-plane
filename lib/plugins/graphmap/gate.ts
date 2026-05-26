import type { EvidenceItem, GateDecision, GateResult } from './types';

const STALE_MS = 24 * 60 * 60 * 1000; // 24h
const ALLOW_MIN_EVIDENCE = 3;

export function evaluateGate(evidence: EvidenceItem[], graphAgeMs?: number): GateResult {
  const reasons: string[] = [];
  const blockedClaims: string[] = [];

  if (evidence.length === 0) {
    return {
      decision: 'BLOCK',
      reasons: ['No evidence found for this query'],
      blockedClaims: ['Cannot answer without file evidence'],
    };
  }

  const allAmbiguous = evidence.every(e => e.confidence === 'AMBIGUOUS');
  if (allAmbiguous) {
    return {
      decision: 'BLOCK',
      reasons: ['All evidence is AMBIGUOUS — cannot make a reliable claim'],
      blockedClaims: ['Answer blocked: no extracted or inferred evidence'],
    };
  }

  let decision: GateDecision = 'ALLOW';

  const hasInferred = evidence.some(e => e.confidence === 'INFERRED');
  const hasAmbiguous = evidence.some(e => e.confidence === 'AMBIGUOUS');
  const extractedCount = evidence.filter(e => e.confidence === 'EXTRACTED').length;

  if (hasInferred) {
    decision = 'REVIEW';
    reasons.push('Some relationships are INFERRED (co-located) — not directly proven');
  }

  if (hasAmbiguous) {
    decision = 'REVIEW';
    reasons.push('Some evidence is AMBIGUOUS');
  }

  if (extractedCount < ALLOW_MIN_EVIDENCE) {
    if (decision === 'ALLOW') decision = 'REVIEW';
    reasons.push(`Only ${extractedCount} EXTRACTED evidence items (need ≥${ALLOW_MIN_EVIDENCE} to ALLOW)`);
  }

  if (graphAgeMs !== undefined && graphAgeMs > STALE_MS) {
    if (decision === 'ALLOW') decision = 'REVIEW';
    const hours = Math.floor(graphAgeMs / 3600000);
    reasons.push(`Graph is stale (${hours}h old — rebuild recommended)`);
  }

  if (decision === 'REVIEW') {
    blockedClaims.push('Relationship confidence not fully verified — treat answer as indicative, not authoritative');
  }

  return { decision, reasons, blockedClaims };
}
