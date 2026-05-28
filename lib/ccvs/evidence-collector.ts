import crypto from 'node:crypto';

export type EvidenceType =
  | 'unit'
  | 'integration'
  | 'adversarial'
  | 'replay'
  | 'oversight'
  | 'sbom'
  | 'provenance'
  | 'mutation';

/** L1=basic unit, L2=integration, L3=adversarial, L4=cryptographic, L5=independently reproducible */
export type EvidenceSeverityLevel = 1 | 2 | 3 | 4 | 5;

export const EVIDENCE_SEVERITY: Record<EvidenceType, EvidenceSeverityLevel> = {
  unit: 1,
  integration: 2,
  adversarial: 3,
  replay: 3,
  sbom: 3,
  mutation: 4,
  oversight: 4,
  provenance: 5,
};

export interface EvidenceSubject {
  name: string;
  digest: Record<string, string>;
}

export interface EvidenceRunContext {
  repo: string;
  commit: string;
  ref?: string;
  workflow_run_id: string;
  builder_id: string;
  invocation_id: string;
  runner_os?: string;
}

export interface EvidenceOIDC {
  issuer: string;
  audience: string;
  sub: string;
  repository?: string;
  ref?: string;
  environment?: string;
  jti?: string;
}

export interface EvidenceCoverageMetrics {
  lines?: number;
  branches?: number;
  functions?: number;
  statements?: number;
}

export interface EvidenceMetrics {
  tests_total?: number;
  tests_passed?: number;
  tests_failed?: number;
  coverage?: EvidenceCoverageMetrics;
  mutation_score?: number;
  duration_ms?: number;
  [key: string]: unknown;
}

export interface EvidenceIntegrity {
  previous_chain_hash: string;
  chain_hash: string;
  sbom_ref?: string;
  bundle_ref?: string;
  verification_policy_ref?: string;
}

export interface CCVSEvidenceEnvelope {
  schema_version: '1.0.0';
  evidence_type: EvidenceType;
  severity_level: EvidenceSeverityLevel;
  subject: EvidenceSubject[];
  run: EvidenceRunContext;
  oidc: EvidenceOIDC;
  metrics: EvidenceMetrics;
  integrity: EvidenceIntegrity;
  policy_version: string;
  nonce?: string;
  expires_at?: string;
  generated_at: string;
}

export interface CollectorOptions {
  evidenceType: EvidenceType;
  subjects: EvidenceSubject[];
  run: EvidenceRunContext;
  oidc: EvidenceOIDC;
  metrics?: EvidenceMetrics;
  policyVersion?: string;
  previousChainHash?: string;
  sbomRef?: string;
  bundleRef?: string;
  verificationPolicyRef?: string;
  nonce?: string;
  ttlSeconds?: number;
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj as object).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize((obj as Record<string, unknown>)[k])).join(',') + '}';
}

export function buildEvidenceEnvelope(opts: CollectorOptions): CCVSEvidenceEnvelope {
  const generatedAt = new Date().toISOString();
  const expiresAt = opts.ttlSeconds
    ? new Date(Date.now() + opts.ttlSeconds * 1000).toISOString()
    : undefined;

  const envelope: CCVSEvidenceEnvelope = {
    schema_version: '1.0.0',
    evidence_type: opts.evidenceType,
    severity_level: EVIDENCE_SEVERITY[opts.evidenceType],
    subject: opts.subjects,
    run: opts.run,
    oidc: opts.oidc,
    metrics: opts.metrics ?? {},
    integrity: {
      previous_chain_hash: opts.previousChainHash ?? '',
      chain_hash: '',
      ...(opts.sbomRef ? { sbom_ref: opts.sbomRef } : {}),
      ...(opts.bundleRef ? { bundle_ref: opts.bundleRef } : {}),
      ...(opts.verificationPolicyRef ? { verification_policy_ref: opts.verificationPolicyRef } : {}),
    },
    policy_version: opts.policyVersion ?? 'v1',
    ...(opts.nonce ? { nonce: opts.nonce } : {}),
    ...(expiresAt ? { expires_at: expiresAt } : {}),
    generated_at: generatedAt,
  };

  const withoutHash = { ...envelope, integrity: { ...envelope.integrity, chain_hash: '' } };
  const canonical = canonicalize(withoutHash);
  const digest = sha256Hex(canonical);
  envelope.integrity.chain_hash = 'sha256:' + digest;

  return envelope;
}

export function verifyEnvelopeIntegrity(envelope: CCVSEvidenceEnvelope): { ok: boolean; expected: string } {
  const withoutHash = { ...envelope, integrity: { ...envelope.integrity, chain_hash: '' } };
  const canonical = canonicalize(withoutHash);
  const expected = 'sha256:' + sha256Hex(canonical);
  return { ok: envelope.integrity.chain_hash === expected, expected };
}

export function buildRunContextFromEnv(): EvidenceRunContext {
  const repo = process.env.GITHUB_REPOSITORY ?? 'local/unknown';
  const commit = process.env.GITHUB_SHA ?? 'unknown';
  const ref = process.env.GITHUB_REF;
  const runId = process.env.GITHUB_RUN_ID ?? 'local-' + Date.now();
  const attempt = process.env.GITHUB_RUN_ATTEMPT ?? '1';

  return {
    repo,
    commit,
    ...(ref ? { ref } : {}),
    workflow_run_id: runId,
    builder_id: 'https://github.com/actions/runner',
    invocation_id: runId + '-' + attempt,
    ...(process.env.RUNNER_OS ? { runner_os: process.env.RUNNER_OS } : {}),
  };
}

export function buildOIDCFromEnv(audience = 'ccvs-evidence'): EvidenceOIDC {
  const repo = process.env.GITHUB_REPOSITORY ?? 'local/unknown';
  const ref = process.env.GITHUB_REF ?? '';
  return {
    issuer: 'https://token.actions.githubusercontent.com',
    audience,
    sub: 'repo:' + repo + ':ref:' + ref,
    repository: repo,
    ref,
  };
}
