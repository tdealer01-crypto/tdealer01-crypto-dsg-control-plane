import {
  AGENTIC_ORG_SCHEMA_VERSION,
  type ImprovementCandidateEnvelope,
  type PromotionGateFailure,
  type PromotionGateResult,
} from './contracts';

function metricDelta(envelope: ImprovementCandidateEnvelope): number {
  const raw = envelope.candidateMetric.value - envelope.baselineMetric.value;
  return envelope.baselineMetric.direction === 'HIGHER_IS_BETTER' ? raw : -raw;
}

function hasRequiredEvidence(envelope: ImprovementCandidateEnvelope): boolean {
  const kinds = new Set(envelope.evidence.map((item) => item.kind));
  return kinds.has('commit') && kinds.has('metric') && kinds.has('test_output') && kinds.has('build_output');
}

export function evaluatePromotionCandidate(
  envelope: ImprovementCandidateEnvelope,
  evaluatedAt = new Date().toISOString(),
): PromotionGateResult {
  const failures: PromotionGateFailure[] = [];
  const delta = metricDelta(envelope);

  if (envelope.schemaVersion !== AGENTIC_ORG_SCHEMA_VERSION) {
    failures.push({ code: 'SCHEMA_VERSION_MISMATCH', message: 'Candidate schema version is not canonical.' });
  }
  if (!envelope.approvedPlanHash) {
    failures.push({ code: 'PLAN_HASH_MISSING', message: 'Approved plan hash is required.' });
  }
  if (!envelope.baselineCommit || !envelope.candidateCommit) {
    failures.push({ code: 'COMMIT_BINDING_MISSING', message: 'Baseline and candidate commit SHAs are required.' });
  }
  if (envelope.baselineCommit && envelope.baselineCommit === envelope.candidateCommit) {
    failures.push({ code: 'SAME_BASELINE_AND_CANDIDATE', message: 'Candidate must differ from baseline.' });
  }
  if (envelope.allowedPaths.length === 0) {
    failures.push({ code: 'PATH_SCOPE_MISSING', message: 'Approved path scope is required.' });
  }
  if (!envelope.planAligned) {
    failures.push({ code: 'PLAN_MISMATCH', message: 'Candidate is not aligned to the approved plan.' });
  }
  if (!envelope.constraintsPassed) {
    failures.push({ code: 'CONSTRAINTS_FAILED', message: 'Candidate violates one or more declared constraints.' });
  }
  if (!envelope.testsPassed) {
    failures.push({ code: 'TESTS_FAILED', message: 'Required tests did not pass.' });
  }
  if (!envelope.buildPassed) {
    failures.push({ code: 'BUILD_FAILED', message: 'Required build did not pass.' });
  }
  if (delta <= 0) {
    failures.push({ code: 'METRIC_REGRESSION', message: 'Candidate does not improve the declared objective metric.' });
  }
  if (!hasRequiredEvidence(envelope)) {
    failures.push({ code: 'EVIDENCE_INCOMPLETE', message: 'Commit, metric, test and build evidence are required.' });
  }
  if (
    envelope.candidateAuthority !== 'SIMULATION_ONLY' ||
    envelope.promotionAuthority !== 'DSG_CONTROL_PLANE' ||
    envelope.selfPromotionAllowed !== false
  ) {
    failures.push({
      code: 'SELF_PROMOTION_AUTHORITY_INVALID',
      message: 'Simulation may generate/evaluate candidates but cannot authorize its own promotion.',
    });
  }

  if (!envelope.cinemaProof) {
    failures.push({ code: 'CINEMA_PROOF_MISSING', message: 'Independent Cinema proof is required.' });
  } else {
    if (!envelope.cinemaProof.verified) {
      failures.push({ code: 'CINEMA_PROOF_INVALID', message: 'Cinema proof is not independently verified.' });
    }
    if (envelope.cinemaProof.boundCandidateCommit !== envelope.candidateCommit) {
      failures.push({ code: 'CINEMA_COMMIT_MISMATCH', message: 'Cinema proof is bound to a different candidate commit.' });
    }
    if (
      envelope.cinemaProof.verification !== 'VERIFIED_RAW_EVIDENCE' ||
      envelope.cinemaProof.rawEvidenceVerified !== true
    ) {
      failures.push({
        code: 'CINEMA_RAW_EVIDENCE_REQUIRED',
        message: 'Structural envelope binding is insufficient; Cinema must verify raw metric/test/build evidence.',
      });
    }
  }

  return {
    verdict: failures.length === 0 ? 'ALLOW' : 'BLOCK',
    failures,
    metricDelta: delta,
    evaluatedAt,
    schemaVersion: AGENTIC_ORG_SCHEMA_VERSION,
  };
}
