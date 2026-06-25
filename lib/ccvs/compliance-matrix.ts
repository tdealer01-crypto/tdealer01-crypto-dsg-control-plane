import type { EvidenceType, EvidenceSeverityLevel } from './evidence-collector';

export interface RequirementControl {
  requirement_id: string;
  framework: string;
  article_or_section: string;
  title: string;
  control_id: string;
  control_description: string;
  test_file: string;
  test_suite: string;
  evidence_type: EvidenceType;
  min_severity_level: EvidenceSeverityLevel;
  mutation_required: boolean;
}

export interface ComplianceMatrixRow extends RequirementControl {
  evidence_hash: string | null;
  status: 'pass' | 'fail' | 'pending' | 'not_verified';
  verified_at: string | null;
}

export interface ComplianceMatrix {
  schema_version: '1.0.0';
  generated_at: string;
  policy_version: string;
  rows: ComplianceMatrixRow[];
  summary: {
    total: number;
    pass: number;
    fail: number;
    pending: number;
    not_verified: number;
    claim_pass_eligible: boolean;
  };
}

export const REQUIREMENT_CATALOG: RequirementControl[] = [
  {
    requirement_id: 'EU-AI-ACT-ART9',
    framework: 'EU AI Act',
    article_or_section: 'Article 9',
    title: 'Risk management system',
    control_id: 'CTRL-RISK-GATE',
    control_description: 'Continuous risk management throughout AI lifecycle; risk scoring and decision gate for all agent actions',
    test_file: 'tests/unit/spine/pipeline-approval.test.ts',
    test_suite: 'pipeline-approval',
    evidence_type: 'integration',
    min_severity_level: 2,
    mutation_required: true,
  },
  {
    requirement_id: 'EU-AI-ACT-ART14',
    framework: 'EU AI Act',
    article_or_section: 'Article 14',
    title: 'Human oversight',
    control_id: 'CTRL-HUMAN-GATE',
    control_description: 'Human approval required before high-risk AI actions',
    test_file: 'tests/dsg/agent-command-gate.test.ts',
    test_suite: 'agent-command-gate',
    evidence_type: 'integration',
    min_severity_level: 2,
    mutation_required: true,
  },
  {
    requirement_id: 'EU-AI-ACT-ART12',
    framework: 'EU AI Act',
    article_or_section: 'Article 12',
    title: 'Record-keeping and logging',
    control_id: 'CTRL-IMMUTABLE-AUDIT',
    control_description: 'Audit logs must be immutable and tamper-evident',
    test_file: 'tests/integration/api/audit-evidence.test.ts',
    test_suite: 'audit-evidence',
    evidence_type: 'adversarial',
    min_severity_level: 3,
    mutation_required: true,
  },
  {
    requirement_id: 'ISO42001-A7.3',
    framework: 'ISO 42001',
    article_or_section: 'Annex A 7.3',
    title: 'AI system risk assessment',
    control_id: 'CTRL-ISO-RISK-ASSESS',
    control_description: 'Risk scoring and decision gate for AI system actions',
    test_file: 'tests/failure/replay-matrix.test.ts',
    test_suite: 'replay-matrix',
    evidence_type: 'adversarial',
    min_severity_level: 3,
    mutation_required: true,
  },
  {
    requirement_id: 'ISO42001-A9.2',
    framework: 'ISO 42001',
    article_or_section: 'Annex A 9.2',
    title: 'Internal audit',
    control_id: 'CTRL-AUDIT-TRAIL',
    control_description: 'Complete audit trail for all governed AI decisions',
    test_file: 'tests/integration/api/audit-route.test.ts',
    test_suite: 'audit-route',
    evidence_type: 'integration',
    min_severity_level: 2,
    mutation_required: false,
  },
  {
    requirement_id: 'NIST-RMF-GOVERN-1.1',
    framework: 'NIST AI RMF',
    article_or_section: 'GOVERN 1.1',
    title: 'AI risk governance policies',
    control_id: 'CTRL-POLICY-ENGINE',
    control_description: 'Policy engine enforces governance rules on every AI action',
    test_file: 'tests/unit/spine/pipeline.test.ts',
    test_suite: 'spine-pipeline',
    evidence_type: 'unit',
    min_severity_level: 1,
    mutation_required: true,
  },
  {
    requirement_id: 'NIST-RMF-MAP-2.1',
    framework: 'NIST AI RMF',
    article_or_section: 'MAP 2.1',
    title: 'Scientific rigor and validity',
    control_id: 'CTRL-PROOF-VALIDITY',
    control_description: 'Formal proofs of billing and rate-limit invariants',
    test_file: 'tests/proofs/billing-invariants.test.ts',
    test_suite: 'billing-invariants',
    evidence_type: 'oversight',
    min_severity_level: 4,
    mutation_required: false,
  },
  {
    requirement_id: 'NIST-RMF-MEASURE-2.6',
    framework: 'NIST AI RMF',
    article_or_section: 'MEASURE 2.6',
    title: 'Bias and fairness evaluation',
    control_id: 'CTRL-REPLAY-REJECTION',
    control_description: 'Replay attack rejection ensures no reuse of governance proofs',
    test_file: 'tests/failure/replay-matrix.test.ts',
    test_suite: 'replay-matrix',
    evidence_type: 'replay',
    min_severity_level: 3,
    mutation_required: true,
  },
  {
    requirement_id: 'SLSA-L2-PROV',
    framework: 'SLSA',
    article_or_section: 'Level 2 — Provenance',
    title: 'Build provenance',
    control_id: 'CTRL-BUILD-PROVENANCE',
    control_description: 'Every build produces a signed, verifiable SLSA provenance',
    test_file: 'scripts/emit-test-evidence.mjs',
    test_suite: 'ci-provenance',
    evidence_type: 'provenance',
    min_severity_level: 5,
    mutation_required: false,
  },
  {
    requirement_id: 'DSG-MIDMARKET-AUTOPILOT',
    framework: 'DSG Internal',
    article_or_section: 'Midmarket Autopilot Governance',
    title: 'Midmarket governance autopilot',
    control_id: 'CTRL-MIDMARKET-GATE',
    control_description: 'Midmarket governance autopilot runs without manual intervention',
    test_file: 'tests/dsg/midmarket-governance-autopilot.test.ts',
    test_suite: 'midmarket-governance-autopilot',
    evidence_type: 'integration',
    min_severity_level: 2,
    mutation_required: false,
  },
];

export function buildComplianceMatrix(
  evidenceMap: Map<string, { hash: string; verified_at: string; status: 'pass' | 'fail' }>,
  policyVersion = 'v1',
): ComplianceMatrix {
  const rows: ComplianceMatrixRow[] = REQUIREMENT_CATALOG.map((req) => {
    const entry = evidenceMap.get(req.test_suite);
    const status: ComplianceMatrixRow['status'] = entry?.status ?? 'not_verified';
    return {
      ...req,
      evidence_hash: entry?.hash ?? null,
      status,
      verified_at: entry?.verified_at ?? null,
    };
  });

  const pass = rows.filter((r) => r.status === 'pass').length;
  const fail = rows.filter((r) => r.status === 'fail').length;
  const pending = rows.filter((r) => r.status === 'pending').length;
  const not_verified = rows.filter((r) => r.status === 'not_verified').length;

  const claimPassEligible =
    fail === 0 &&
    not_verified === 0 &&
    rows.every(
      (r) =>
        r.status !== 'pass' ||
        (r.evidence_hash !== null && r.evidence_hash.startsWith('sha256:')),
    );

  return {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    policy_version: policyVersion,
    rows,
    summary: {
      total: rows.length,
      pass,
      fail,
      pending,
      not_verified,
      claim_pass_eligible: claimPassEligible,
    },
  };
}
