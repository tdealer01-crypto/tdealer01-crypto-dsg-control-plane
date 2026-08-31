import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  authorizeCandidateRealization,
  verifyCandidateRealizationSpecV1,
  type CandidateRealizationSpecV1,
  type GitHubPlanClient,
} from '../../../lib/agent-governance/agentic-org/realization-authorization';

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex');
}

function approvedPlan() {
  return {
    schemaVersion: 'dsg-approved-improvement-plan-v1',
    goalId: 'goal-code-1',
    approvalStatus: 'APPROVED_BY_USER_2026-08-31',
    authority: 'DSG_CONTROL_PLANE',
    targetRepository: 'tdealer01-crypto/dsg-agi-simulation',
    allowedPaths: ['src/**', 'tests/**'],
  };
}

function buildSpec(planBytes: Buffer): CandidateRealizationSpecV1 {
  const payload = {
    schemaVersion: 'dsg-candidate-realization-v1' as const,
    candidateId: 'candidate-code-1',
    candidateKind: 'CODE_CANDIDATE' as const,
    goalId: 'goal-code-1',
    targetRepository: 'tdealer01-crypto/dsg-agi-simulation',
    baselineCommit: 'a'.repeat(40),
    candidateCommit: 'b'.repeat(40),
    approvedPlanHash: sha256(planBytes),
    simulationHash: 'c'.repeat(64),
    allowedPaths: ['src/**'],
    objectiveContract: {
      metricName: 'fitness_composite',
      direction: 'HIGHER_IS_BETTER' as const,
      baselineValue: 0.7,
      candidateValue: 0.8,
    },
    candidateAuthority: 'SIMULATION_ONLY' as const,
    promotionAuthority: 'DSG_CONTROL_PLANE' as const,
    selfPromotionAllowed: false as const,
    directProductionWriteAllowed: false as const,
    realization: {
      action: 'GENERATE_CODE_PATCH' as const,
      capabilityId: 'capability-1',
      capabilityDescription: 'Improve deterministic checkpoint recovery.',
      acceptanceCriteria: ['checkpoint recovery test passes'],
    },
    valueContract: {
      metricName: 'recovery_success_rate',
      direction: 'HIGHER_IS_BETTER' as const,
      baselineValue: 0.8,
      targetValue: 0.9,
      measurementSource: 'canary replay test',
      guardrails: ['no regression in verification'],
    },
    requiredEvidence: ['CODE_PATCH', 'TEST_OUTPUT', 'BUILD_OUTPUT'],
  };
  return { ...payload, specSha256: sha256(JSON.stringify(payload)) };
}

function clientFor(planBytes: Buffer, files = ['src/checkpoint.ts']): GitHubPlanClient {
  return {
    getContent: async () => ({
      data: { content: planBytes.toString('base64'), encoding: 'base64' },
    }),
    compareCommits: async () => ({
      data: { status: 'ahead', files: files.map((filename) => ({ filename })) },
    }),
  };
}

describe('candidate realization authorization', () => {
  it('authorizes only a code candidate bound to the approved GitHub plan and commit lineage', async () => {
    const planBytes = Buffer.from(`${JSON.stringify(approvedPlan(), null, 2)}\n`);
    const receipt = await authorizeCandidateRealization(clientFor(planBytes), buildSpec(planBytes), '2026-08-31T00:00:00.000Z');
    expect(receipt.status).toBe('ALLOW');
    expect(receipt.authority).toBe('DSG_CONTROL_PLANE');
    expect(receipt.originCandidateCommit).toBe('b'.repeat(40));
    expect(receipt.directProductionWriteAllowed).toBe(false);
  });

  it('blocks a modified realization spec digest', () => {
    const planBytes = Buffer.from(`${JSON.stringify(approvedPlan(), null, 2)}\n`);
    const spec = buildSpec(planBytes);
    spec.realization.capabilityDescription = 'tampered';
    expect(() => verifyCandidateRealizationSpecV1(spec)).toThrow('REALIZATION_SPEC_HASH_MISMATCH');
  });

  it('blocks scope widening beyond the approved plan', async () => {
    const planBytes = Buffer.from(`${JSON.stringify(approvedPlan(), null, 2)}\n`);
    const spec = buildSpec(planBytes);
    spec.allowedPaths = ['app/**'];
    const { specSha256: _old, ...rest } = spec;
    spec.specSha256 = sha256(JSON.stringify(rest));
    await expect(authorizeCandidateRealization(clientFor(planBytes), spec)).rejects.toThrow('REALIZATION_SCOPE_WIDENING_BLOCKED');
  });

  it('blocks a GitHub diff outside the candidate scope', async () => {
    const planBytes = Buffer.from(`${JSON.stringify(approvedPlan(), null, 2)}\n`);
    const spec = buildSpec(planBytes);
    await expect(authorizeCandidateRealization(clientFor(planBytes, ['tests/outside.ts']), spec)).rejects.toThrow('REALIZATION_CANDIDATE_DIFF_OUTSIDE_SCOPE');
  });

  it('blocks a non-descendant origin candidate', async () => {
    const planBytes = Buffer.from(`${JSON.stringify(approvedPlan(), null, 2)}\n`);
    const client = clientFor(planBytes);
    client.compareCommits = async () => ({ data: { status: 'diverged', files: [{ filename: 'src/checkpoint.ts' }] } });
    await expect(authorizeCandidateRealization(client, buildSpec(planBytes))).rejects.toThrow('REALIZATION_BASELINE_NOT_ANCESTOR');
  });

  it('blocks traversal in requested scope', () => {
    const planBytes = Buffer.from(`${JSON.stringify(approvedPlan(), null, 2)}\n`);
    const spec = buildSpec(planBytes);
    spec.allowedPaths = ['src/../app/**'];
    expect(() => verifyCandidateRealizationSpecV1(spec)).toThrow('REALIZATION_PATH_SCOPE_INVALID');
  });

  it('does not route configuration candidates into the Builder', () => {
    const planBytes = Buffer.from(`${JSON.stringify(approvedPlan(), null, 2)}\n`);
    const spec = buildSpec(planBytes);
    spec.candidateKind = 'CONFIG_CANDIDATE';
    expect(() => verifyCandidateRealizationSpecV1(spec)).toThrow('REALIZATION_BUILDER_REQUIRES_CODE_CANDIDATE');
  });
});
