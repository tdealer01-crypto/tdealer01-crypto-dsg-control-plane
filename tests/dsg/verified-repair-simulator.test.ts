import { describe, expect, it } from 'vitest';
import { sha256Json } from '@/lib/dsg/runtime/hash';
import {
  buildRepairQubo,
  runVerifiedRepair,
  verifyRepairAssignment,
} from '@/lib/dsg/verified-repair';
import type { VerifiedRepairRequest } from '@/lib/dsg/verified-repair';

function request(overrides: Partial<VerifiedRepairRequest> = {}): VerifiedRepairRequest {
  return {
    jobId: 'repair-test-001',
    actorId: 'test-actor',
    source: 'test',
    createdAt: '2026-08-09T00:00:00.000Z',
    finding: {
      id: 'finding-001',
      summary: 'The bounded branch uses the wrong constant.',
      severity: 'LOW',
      executionRisk: 'LOW',
      affectedFiles: ['src/example.ts'],
      evidence: [
        {
          id: 'scan-001',
          type: 'scan_output',
          contentHash: sha256Json('scan output'),
          summary: 'Deterministic scan output',
        },
      ],
    },
    allowedFiles: ['src/example.ts'],
    candidates: [
      {
        id: 'candidate-a',
        changeGroup: 'fix-constant',
        file: 'src/example.ts',
        expected: 'const value = 1;',
        replacement: 'const value = 2;',
        rationale: 'Matches the verified finding.',
        score: 90,
      },
      {
        id: 'candidate-b',
        changeGroup: 'fix-constant',
        file: 'src/example.ts',
        expected: 'const value = 1;',
        replacement: 'const value = 3;',
        rationale: 'Alternative candidate for the same change group.',
        score: 10,
      },
    ],
    solver: { mode: 'pinned', seed: 7 },
    execute: false,
    ...overrides,
  };
}

describe('Verified Repair Simulator', () => {
  it('selects a binary candidate plan, passes exact Z3, and stops before mutation', async () => {
    const result = await runVerifiedRepair(request());

    expect(result.status).toBe('READY_FOR_CONTROLLED_EXECUTION');
    expect(result.verdict).toBe('REVIEW');
    expect(result.planningOnly).toBe(true);
    expect(result.selectedCandidateIds).toHaveLength(1);
    expect(result.exactVerification?.status).toBe('sat');
    expect(result.exactVerification?.valid).toBe(true);
    expect(result.evidencePack?.replay.status).toBe('PASS');
    expect(result.evidencePack?.audit.chainValid).toBe(true);
    expect(result.userOutcome).toContain('พร้อม');
  }, 30_000);

  it('replays pinned planning deterministically for the same input', async () => {
    const first = await runVerifiedRepair(request());
    const second = await runVerifiedRepair(request());

    expect(first.selectedCandidateIds).toEqual(second.selectedCandidateIds);
    expect(first.evidencePack?.planHash).toBe(second.evidencePack?.planHash);
    expect(first.evidencePack?.exactVerification.proofHash).toBe(second.evidencePack?.exactVerification.proofHash);
    expect(first.evidencePack?.replay.replayHash).toBe(second.evidencePack?.replay.replayHash);
    expect(first.evidencePack?.determinism.status).toBe('PASS');
  }, 30_000);

  it('blocks a candidate outside the approved scope before solver execution', async () => {
    const result = await runVerifiedRepair(request({
      candidates: [{
        ...request().candidates[0],
        file: '../outside.ts',
      }],
    }));

    expect(result.status).toBe('BLOCKED');
    expect(result.gate.finalDecision).toBe('BLOCK_INPUT_VALIDATION');
    expect(result.counterexample?.join(',')).toContain('INVALID_CANDIDATE_FILE');
  });

  it('blocks a plan without scan or reproduction evidence', async () => {
    const base = request();
    const result = await runVerifiedRepair({
      ...base,
      finding: { ...base.finding, evidence: [{ ...base.finding.evidence[0], type: 'manual_note' }] },
    });

    expect(result.status).toBe('BLOCKED');
    expect(result.counterexample?.join(',')).toContain('REPRO_OR_SCAN_EVIDENCE_REQUIRED');
  });

  it('uses Z3 as the authority for conflict constraints', async () => {
    const candidates = [
      { ...request().candidates[0], id: 'left', changeGroup: 'left', conflictsWith: ['right'] },
      { ...request().candidates[0], id: 'right', changeGroup: 'right', conflictsWith: ['left'] },
    ];
    const qubo = buildRepairQubo(candidates);
    const result = await verifyRepairAssignment(
      qubo,
      candidates,
      { repair_0: 1, repair_1: 1 },
    );

    expect(result.status).toBe('unsat');
    expect(result.valid).toBe(false);
    expect(result.counterexample).toContain('CONFLICT_left_right');
  }, 30_000);

  it('fails closed when live NVIDIA Ising mode has no configured endpoint', async () => {
    const previous = process.env.NVIDIA_ISING_API_URL;
    delete process.env.NVIDIA_ISING_API_URL;
    try {
      const result = await runVerifiedRepair(request({ solver: { mode: 'live' } }));
      expect(result.status).toBe('BLOCKED');
      expect(result.counterexample?.join(',')).toContain('NVIDIA_ISING_API_URL_REQUIRED_FOR_LIVE_SOLVER');
    } finally {
      if (previous === undefined) delete process.env.NVIDIA_ISING_API_URL;
      else process.env.NVIDIA_ISING_API_URL = previous;
    }
  });
});
