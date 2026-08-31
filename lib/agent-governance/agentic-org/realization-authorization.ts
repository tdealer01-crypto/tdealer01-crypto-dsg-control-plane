import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const CANDIDATE_REALIZATION_SCHEMA_VERSION = 'dsg-candidate-realization-v1' as const;
export const REALIZATION_AUTHORIZATION_SCHEMA_VERSION = 'dsg-realization-authorization-v1' as const;

export interface CandidateRealizationSpecV1 {
  schemaVersion: typeof CANDIDATE_REALIZATION_SCHEMA_VERSION;
  candidateId: string;
  candidateKind: 'CONFIG_CANDIDATE' | 'CODE_CANDIDATE';
  goalId: string;
  targetRepository: string;
  baselineCommit: string;
  candidateCommit: string;
  approvedPlanHash: string;
  simulationHash: string;
  allowedPaths: string[];
  realization: {
    action: 'CONFIG_PROMOTION' | 'GENERATE_CODE_PATCH';
    capabilityId: string;
    capabilityDescription: string;
    acceptanceCriteria: string[];
  };
  objectiveContract: {
    metricName: string;
    direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
    baselineValue: number;
    candidateValue: number;
  };
  valueContract: {
    metricName: string;
    direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
    baselineValue: number;
    targetValue: number;
    measurementSource: string;
    guardrails: string[];
  } | null;
  requiredEvidence: string[];
  candidateAuthority: 'SIMULATION_ONLY';
  promotionAuthority: 'DSG_CONTROL_PLANE';
  selfPromotionAllowed: false;
  directProductionWriteAllowed: false;
  specSha256: string;
}

interface ApprovedImprovementPlanV1 {
  schemaVersion: 'dsg-approved-improvement-plan-v1';
  goalId: string;
  approvalStatus: string;
  authority: 'DSG_CONTROL_PLANE';
  targetRepository: string;
  allowedPaths: string[];
}

export interface RealizationAuthorizationReceipt {
  schemaVersion: typeof REALIZATION_AUTHORIZATION_SCHEMA_VERSION;
  status: 'ALLOW';
  candidateId: string;
  goalId: string;
  targetRepository: string;
  baselineCommit: string;
  originCandidateCommit: string;
  approvedPlanHash: string;
  specSha256: string;
  allowedPaths: string[];
  allowedOperations: Array<'READ' | 'WRITE' | 'TEST' | 'BUILD' | 'OPEN_PR'>;
  authority: 'DSG_CONTROL_PLANE';
  directProductionWriteAllowed: false;
  issuedAt: string;
  receiptSha256: string;
}

export interface GitHubPlanClient {
  getContent(input: { owner: string; repo: string; path: string; ref: string }): Promise<{ data: unknown }>;
}

const APPROVED_PLAN_PATH_BY_REPOSITORY: Record<string, string> = {
  'tdealer01-crypto/dsg-agi-simulation': 'contracts/agentic-improvement/self-evolution-plan.json',
};

const ALLOWED_REPOSITORIES = new Set([
  'tdealer01-crypto/tdealer01-crypto-dsg-control-plane',
  'tdealer01-crypto/dsg-one-v1',
  'tdealer01-crypto/dsg-agi-simulation',
  'tdealer01-crypto/DSG-Cinema-Proof-Agent',
  'tdealer01-crypto/dsg-unified-data-monitoring',
]);

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function splitRepository(repository: string): { owner: string; repo: string } | null {
  const [owner, repo, extra] = repository.split('/');
  return owner && repo && !extra ? { owner, repo } : null;
}

function validSha(value: string): boolean {
  return /^[0-9a-f]{40}$/i.test(value);
}

function canonicalPath(value: string): boolean {
  if (!value || value.startsWith('/') || value.endsWith('/') || value.includes('\\') || value.includes('\0')) return false;
  return value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function pathInsideScope(path: string, scope: string): boolean {
  if (!canonicalPath(path)) return false;
  if (scope.endsWith('/**')) {
    const root = scope.slice(0, -3);
    return canonicalPath(root) && path.startsWith(`${root}/`);
  }
  return canonicalPath(scope) && path === scope;
}

function requestedScopeInsideApprovedScope(requested: string, approved: string): boolean {
  const requestedRoot = requested.endsWith('/**') ? requested.slice(0, -3) : requested;
  if (!canonicalPath(requestedRoot)) return false;
  if (requested.endsWith('/**')) {
    if (approved.endsWith('/**')) {
      const approvedRoot = approved.slice(0, -3);
      return canonicalPath(approvedRoot) && (requestedRoot === approvedRoot || requestedRoot.startsWith(`${approvedRoot}/`));
    }
    return false;
  }
  return pathInsideScope(requested, approved);
}

function orderedSpecPayload(spec: CandidateRealizationSpecV1) {
  return {
    schemaVersion: spec.schemaVersion,
    candidateId: spec.candidateId,
    candidateKind: spec.candidateKind,
    goalId: spec.goalId,
    targetRepository: spec.targetRepository,
    baselineCommit: spec.baselineCommit,
    candidateCommit: spec.candidateCommit,
    approvedPlanHash: spec.approvedPlanHash,
    simulationHash: spec.simulationHash,
    allowedPaths: spec.allowedPaths,
    objectiveContract: spec.objectiveContract,
    candidateAuthority: spec.candidateAuthority,
    promotionAuthority: spec.promotionAuthority,
    selfPromotionAllowed: spec.selfPromotionAllowed,
    directProductionWriteAllowed: spec.directProductionWriteAllowed,
    realization: spec.realization,
    valueContract: spec.valueContract,
    requiredEvidence: spec.requiredEvidence,
  };
}

export function verifyCandidateRealizationSpecV1(value: unknown): CandidateRealizationSpecV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REALIZATION_SPEC_INVALID');
  const spec = value as CandidateRealizationSpecV1;
  if (spec.schemaVersion !== CANDIDATE_REALIZATION_SCHEMA_VERSION) throw new Error('REALIZATION_SPEC_SCHEMA_INVALID');
  if (spec.candidateKind !== 'CODE_CANDIDATE') throw new Error('REALIZATION_BUILDER_REQUIRES_CODE_CANDIDATE');
  if (spec.realization?.action !== 'GENERATE_CODE_PATCH') throw new Error('REALIZATION_ACTION_INVALID');
  if (spec.candidateAuthority !== 'SIMULATION_ONLY') throw new Error('REALIZATION_SPEC_AUTHORITY_INVALID');
  if (spec.promotionAuthority !== 'DSG_CONTROL_PLANE') throw new Error('REALIZATION_SPEC_PROMOTION_AUTHORITY_INVALID');
  if (spec.selfPromotionAllowed !== false || spec.directProductionWriteAllowed !== false) throw new Error('REALIZATION_SPEC_UNSAFE_AUTHORITY');
  if (!ALLOWED_REPOSITORIES.has(spec.targetRepository)) throw new Error('REALIZATION_TARGET_REPOSITORY_NOT_ALLOWED');
  if (!splitRepository(spec.targetRepository)) throw new Error('REALIZATION_TARGET_REPOSITORY_INVALID');
  if (!validSha(spec.baselineCommit) || !validSha(spec.candidateCommit)) throw new Error('REALIZATION_COMMIT_SHA_INVALID');
  if (!/^[0-9a-f]{64}$/i.test(spec.approvedPlanHash) || !/^[0-9a-f]{64}$/i.test(spec.specSha256)) throw new Error('REALIZATION_DIGEST_INVALID');
  if (!Array.isArray(spec.allowedPaths) || spec.allowedPaths.length === 0 || spec.allowedPaths.some((path) => {
    const root = path.endsWith('/**') ? path.slice(0, -3) : path;
    return !canonicalPath(root);
  })) throw new Error('REALIZATION_PATH_SCOPE_INVALID');
  if (!spec.valueContract) throw new Error('REALIZATION_VALUE_CONTRACT_REQUIRED');
  if (!Array.isArray(spec.realization.acceptanceCriteria) || spec.realization.acceptanceCriteria.length === 0) throw new Error('REALIZATION_ACCEPTANCE_CRITERIA_REQUIRED');
  const actual = sha256(JSON.stringify(orderedSpecPayload(spec)));
  if (actual !== spec.specSha256) throw new Error('REALIZATION_SPEC_HASH_MISMATCH');
  return spec;
}

async function loadApprovedPlan(client: GitHubPlanClient, spec: CandidateRealizationSpecV1): Promise<ApprovedImprovementPlanV1> {
  const repository = splitRepository(spec.targetRepository);
  if (!repository) throw new Error('REALIZATION_TARGET_REPOSITORY_INVALID');
  const path = APPROVED_PLAN_PATH_BY_REPOSITORY[spec.targetRepository];
  if (!path) throw new Error('REALIZATION_APPROVED_PLAN_PATH_UNKNOWN');

  let response: { data: unknown };
  try {
    response = await client.getContent({ ...repository, path, ref: spec.candidateCommit });
  } catch {
    throw new Error('REALIZATION_APPROVED_PLAN_FETCH_FAILED');
  }
  const data = response.data as { content?: string; encoding?: string };
  if (typeof data.content !== 'string' || data.encoding !== 'base64') throw new Error('REALIZATION_APPROVED_PLAN_CONTENT_INVALID');
  const bytes = Buffer.from(data.content, 'base64');
  if (sha256(bytes) !== spec.approvedPlanHash) throw new Error('REALIZATION_APPROVED_PLAN_HASH_MISMATCH');

  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error('REALIZATION_APPROVED_PLAN_CONTENT_INVALID');
  }
  const plan = parsed as ApprovedImprovementPlanV1;
  if (plan.schemaVersion !== 'dsg-approved-improvement-plan-v1') throw new Error('REALIZATION_APPROVED_PLAN_SCHEMA_INVALID');
  if (plan.authority !== 'DSG_CONTROL_PLANE') throw new Error('REALIZATION_APPROVED_PLAN_AUTHORITY_INVALID');
  if (typeof plan.approvalStatus !== 'string' || !plan.approvalStatus.startsWith('APPROVED_')) throw new Error('REALIZATION_APPROVED_PLAN_NOT_APPROVED');
  if (plan.targetRepository !== spec.targetRepository) throw new Error('REALIZATION_APPROVED_PLAN_TARGET_MISMATCH');
  if (plan.goalId !== spec.goalId) throw new Error('REALIZATION_APPROVED_PLAN_GOAL_MISMATCH');
  if (!Array.isArray(plan.allowedPaths) || plan.allowedPaths.length === 0) throw new Error('REALIZATION_APPROVED_PLAN_SCOPE_MISSING');
  return plan;
}

export async function authorizeCandidateRealization(
  client: GitHubPlanClient,
  value: unknown,
  issuedAt = new Date().toISOString(),
): Promise<RealizationAuthorizationReceipt> {
  const spec = verifyCandidateRealizationSpecV1(value);
  const plan = await loadApprovedPlan(client, spec);
  const widened = spec.allowedPaths.filter((requested) => !plan.allowedPaths.some((approved) => requestedScopeInsideApprovedScope(requested, approved)));
  if (widened.length > 0) throw new Error(`REALIZATION_SCOPE_WIDENING_BLOCKED:${widened.join(',')}`);

  const payload = {
    schemaVersion: REALIZATION_AUTHORIZATION_SCHEMA_VERSION,
    status: 'ALLOW' as const,
    candidateId: spec.candidateId,
    goalId: spec.goalId,
    targetRepository: spec.targetRepository,
    baselineCommit: spec.baselineCommit,
    originCandidateCommit: spec.candidateCommit,
    approvedPlanHash: spec.approvedPlanHash,
    specSha256: spec.specSha256,
    allowedPaths: [...spec.allowedPaths],
    allowedOperations: ['READ', 'WRITE', 'TEST', 'BUILD', 'OPEN_PR'] as RealizationAuthorizationReceipt['allowedOperations'],
    authority: 'DSG_CONTROL_PLANE' as const,
    directProductionWriteAllowed: false as const,
    issuedAt,
  };
  return { ...payload, receiptSha256: sha256(JSON.stringify(payload)) };
}

export function signRealizationAuthorizationReceipt(receipt: RealizationAuthorizationReceipt, secret: string): string {
  return createHmac('sha256', secret).update(JSON.stringify(receipt)).digest('hex');
}

export function verifyRealizationAuthorizationSignature(receipt: RealizationAuthorizationReceipt, signature: string, secret: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = signRealizationAuthorizationReceipt(receipt, secret);
  const left = Buffer.from(signature, 'hex');
  const right = Buffer.from(expected, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
