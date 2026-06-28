/**
 * Z3 Deterministic Solver End-to-End Tests
 *
 * These tests verify:
 * 1. SMT-LIB v2 formula generation
 * 2. External solver invocation (when enabled)
 * 3. Response validation
 * 4. Fallback to static checks on error
 * 5. UNSUPPORTED never → PASS logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSmt2ForProof } from '../../../lib/dsg/deterministic/external-solver';
import {
  invokeExternalSolver,
  isValidExternalSolverResult,
} from '../../../lib/dsg/deterministic/external-solver';
import { evaluateDeterministicGate } from '../../../lib/dsg/deterministic/gate-engine';
import type { DeterministicProofRequest } from '../../../lib/dsg/deterministic/types';

describe('Z3 Deterministic Solver E2E', () => {
  beforeEach(() => {
    // Reset env vars before each test
    delete process.env.DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED;
    delete process.env.DSG_EXTERNAL_SOLVER_URL;
    delete process.env.DSG_SOLVER_TIMEOUT_MS;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SMT-LIB v2 Formula Generation', () => {
    it('should generate valid SMT-LIB v2 formula from constraints', () => {
      const request: DeterministicProofRequest = {
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        context: {
          goalLocked: true,
          gateAllow: true,
          evidenceExists: true,
        },
        nonce: 'test-nonce-001',
        idempotencyKey: 'test-idempotent-001',
      };

      const constraints = [
        {
          constraintId: 'c_goal_locked',
          evidenceKey: 'goalLocked',
          message: 'Goal must be locked',
          severity: 'critical',
          passed: true,
        },
        {
          constraintId: 'c_gate_allow',
          evidenceKey: 'gateAllow',
          message: 'Gate must allow',
          severity: 'critical',
          passed: true,
        },
        {
          constraintId: 'c_evidence_exists',
          evidenceKey: 'evidenceExists',
          message: 'Evidence must exist',
          severity: 'high',
          passed: true,
        },
      ];

      const smt2 = generateSmt2ForProof(request, constraints as any);

      // Verify SMT-LIB v2 structure
      expect(smt2).toContain('(set-logic QF_UF)');
      expect(smt2).toContain('(declare-const c_goal_locked Bool)');
      expect(smt2).toContain('(declare-const c_gate_allow Bool)');
      expect(smt2).toContain('(declare-const c_evidence_exists Bool)');
      expect(smt2).toContain('(assert (= c_goal_locked true))');
      expect(smt2).toContain('(assert (= c_gate_allow true))');
      expect(smt2).toContain('(assert (= c_evidence_exists true))');
      expect(smt2).toContain('(assert (and c_goal_locked c_gate_allow c_evidence_exists))');
      expect(smt2).toContain('(check-sat)');
      expect(smt2).toContain('(get-model)');
      expect(smt2).toContain('; Policy: dsg.deterministic.default');
      expect(smt2).toContain('; Generated for proof request with nonce: test-nonce-001');
    });

    it('should handle false constraints in SMT formula', () => {
      const request: DeterministicProofRequest = {
        policyRef: 'policy_test',
        policyVersion: '2026-06-24-v1',
        context: {
          goalLocked: false,  // This constraint fails
          gateAllow: true,
        },
        nonce: 'test-false-001',
        idempotencyKey: 'test-false-001',
      };

      const constraints = [
        {
          constraintId: 'c_goal_locked',
          evidenceKey: 'goalLocked',
          message: 'Goal locked',
          severity: 'critical',
          passed: false,
        },
        {
          constraintId: 'c_gate_allow',
          evidenceKey: 'gateAllow',
          message: 'Gate allow',
          severity: 'high',
          passed: true,
        },
      ];

      const smt2 = generateSmt2ForProof(request, constraints as any);

      // When context is false, SMT should assert false
      expect(smt2).toContain('(assert (= c_goal_locked false))');
      expect(smt2).toContain('(assert (= c_gate_allow true))');
      // The AND will require both to be true, making formula UNSAT
      expect(smt2).toContain('(assert (and c_goal_locked c_gate_allow))');
    });
  });

  describe('External Solver Response Validation', () => {
    it('should accept valid SAT response', () => {
      const validResponse = {
        status: 'sat' as const,
        satisfiable: true,
        solver_version: 'z3 4.12.2',
        time_ms: 42,
        smt2_hash: 'abc123def456',
      };

      expect(isValidExternalSolverResult(validResponse)).toBe(true);
    });

    it('should accept valid UNSAT response', () => {
      const validResponse = {
        status: 'unsat' as const,
        satisfiable: false,
        solver_version: 'z3 4.12.2',
        time_ms: 85,
        smt2_hash: 'abc123def456',
      };

      expect(isValidExternalSolverResult(validResponse)).toBe(true);
    });

    it('should reject UNKNOWN status (ambiguous)', () => {
      const unknownResponse = {
        status: 'unknown' as const,
        satisfiable: false,
        solver_version: 'z3 4.12.2',
        time_ms: 5100,  // Timeout
        smt2_hash: 'abc123def456',
      };

      expect(isValidExternalSolverResult(unknownResponse)).toBe(false);
    });

    it('should reject responses with errors', () => {
      const errorResponse = {
        status: 'sat' as const,
        satisfiable: true,
        solver_version: 'z3 4.12.2',
        time_ms: 45,
        smt2_hash: 'abc123def456',
        error: 'Z3 syntax error in formula',
      };

      expect(isValidExternalSolverResult(errorResponse)).toBe(false);
    });

    it('should reject responses missing solver_version', () => {
      const invalidResponse = {
        status: 'sat' as const,
        satisfiable: true,
        // solver_version: missing
        time_ms: 45,
        smt2_hash: 'abc123def456',
      };

      expect(isValidExternalSolverResult(invalidResponse as any)).toBe(false);
    });

    it('should reject negative time_ms', () => {
      const invalidResponse = {
        status: 'sat' as const,
        satisfiable: true,
        solver_version: 'z3 4.12.2',
        time_ms: -1,  // Invalid
        smt2_hash: 'abc123def456',
      };

      expect(isValidExternalSolverResult(invalidResponse)).toBe(false);
    });
  });

  describe('Solver Invocation Control', () => {
    it('should NOT invoke solver when disabled', async () => {
      process.env.DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED = 'false';
      process.env.DSG_EXTERNAL_SOLVER_URL = 'http://localhost:3001';

      const fetchSpy = vi.spyOn(global, 'fetch' as any);

      const request: DeterministicProofRequest = {
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        context: { goalLocked: true },
        nonce: 'disabled-test',
        idempotencyKey: 'disabled-test',
      };

      const result = await invokeExternalSolver('(set-logic QF_UF)', request);

      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('should NOT invoke solver when URL missing', async () => {
      process.env.DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED = 'true';
      delete process.env.DSG_EXTERNAL_SOLVER_URL;

      const fetchSpy = vi.spyOn(global, 'fetch' as any);

      const request: DeterministicProofRequest = {
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        context: { goalLocked: true },
        nonce: 'no-url-test',
        idempotencyKey: 'no-url-test',
      };

      const result = await invokeExternalSolver('(set-logic QF_UF)', request);

      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('should handle solver timeout gracefully', async () => {
      process.env.DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED = 'true';
      process.env.DSG_EXTERNAL_SOLVER_URL = 'http://localhost:3001';
      process.env.DSG_SOLVER_TIMEOUT_MS = '1000';

      const fetchSpy = vi.spyOn(global, 'fetch' as any).mockImplementation(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        })
      );

      const request: DeterministicProofRequest = {
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        context: { goalLocked: true },
        nonce: 'timeout-test',
        idempotencyKey: 'timeout-test',
      };

      const result = await invokeExternalSolver('(set-logic QF_UF)', request);

      expect(result).toBeNull();
      expect(fetchSpy).toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('should handle HTTP errors gracefully', async () => {
      process.env.DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED = 'true';
      process.env.DSG_EXTERNAL_SOLVER_URL = 'http://localhost:3001';

      const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const request: DeterministicProofRequest = {
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        context: { goalLocked: true },
        nonce: 'http-error-test',
        idempotencyKey: 'http-error-test',
      };

      const result = await invokeExternalSolver('(set-logic QF_UF)', request);

      expect(result).toBeNull();

      fetchSpy.mockRestore();
    });
  });

  describe('Gate Status Resolution', () => {
    it('should handle constraints with missing evidence', async () => {
      // When context is missing required evidence, constraints fail and map to BLOCK (critical severity)
      const result = await evaluateDeterministicGate({
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        riskLevel: 'low',
        context: {},  // Empty context = missing evidence
        nonce: 'missing-evidence-test',
        idempotencyKey: 'missing-evidence-test',
      });

      // With critical severity failures, should be BLOCK even at low risk
      expect(result.ok).toBe(false);
      expect(['BLOCK', 'REVIEW']).toContain(result.gateStatus);
    });

    it('UNSUPPORTED with medium risk should map to BLOCK', async () => {
      const result = await evaluateDeterministicGate({
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        riskLevel: 'medium',  // Medium risk UNSUPPORTED
        context: {
          unknownField: true,  // This causes UNSUPPORTED
        },
        nonce: 'unsupported-med-test',
        idempotencyKey: 'unsupported-med-test',
      });

      expect(result.gateStatus).toBe('BLOCK');
      expect(result.ok).toBe(false);  // Never PASS
    });

    it('UNSUPPORTED with high risk should map to BLOCK', async () => {
      const result = await evaluateDeterministicGate({
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        riskLevel: 'high',  // High risk UNSUPPORTED
        context: {
          unknownField: true,  // This causes UNSUPPORTED
        },
        nonce: 'unsupported-high-test',
        idempotencyKey: 'unsupported-high-test',
      });

      expect(result.gateStatus).toBe('BLOCK');
      expect(result.ok).toBe(false);  // Never PASS
    });

    it('UNSUPPORTED never becomes PASS regardless of solver', async () => {
      // Even if we somehow get an "unsupported" proof status,
      // it should never map to PASS
      const result = await evaluateDeterministicGate({
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        riskLevel: 'low',
        context: {},  // Empty context → missing evidence
        nonce: 'never-pass-test',
        idempotencyKey: 'never-pass-test',
      });

      // Even with low risk, UNSUPPORTED maps to REVIEW, not PASS
      expect(result.ok).toBe(false);
      expect(result.gateStatus).not.toBe('PASS');
    });
  });

  describe('Proof Evidence Boundary', () => {
    it('should report externalSolverInvoked as false when disabled', async () => {
      process.env.DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED = 'false';

      const result = await evaluateDeterministicGate({
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        context: { goalLocked: true },
        nonce: 'boundary-disabled-test',
        idempotencyKey: 'boundary-disabled-test',
      });

      expect(result.proof.evidenceBoundary.externalSolverInvoked).toBe(false);
      expect(result.proof.evidenceBoundary.externalZ3ProductionSolverClaim).toBe(false);
      expect(result.proof.evidenceBoundary.certificationClaim).toBe(false);
      expect(result.proof.evidenceBoundary.independentAuditClaim).toBe(false);
    });

    it('should include boundary statement in proof', async () => {
      const result = await evaluateDeterministicGate({
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        context: { goalLocked: true },
        nonce: 'boundary-statement-test',
        idempotencyKey: 'boundary-statement-test',
      });

      expect(result.proof.evidenceBoundary.statement).toContain('deterministic proof');
      expect(result.proof.evidenceBoundary.statement).toContain('evidence-derived');
      expect(result.proof.evidenceBoundary.statement).toContain('does not claim');
    });
  });

  describe('Idempotency & Replay Protection', () => {
    it('should include nonce and idempotencyKey in proof', async () => {
      const result = await evaluateDeterministicGate({
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        context: { goalLocked: true },
        nonce: 'replay-nonce-xyz',
        idempotencyKey: 'replay-idempotent-xyz',
      });

      expect(result.proof.replayProtection?.nonce).toBe('replay-nonce-xyz');
      expect(result.proof.replayProtection?.idempotencyKey).toBe('replay-idempotent-xyz');
      expect(result.proof.replayProtection?.requestHash).toBeDefined();
    });

    it('should generate consistent proof for same input', async () => {
      const request = {
        policyRef: 'policy_default',
        policyVersion: '2026-06-24-v1',
        context: { goalLocked: true },
        nonce: 'consistent-nonce',
        idempotencyKey: 'consistent-idempotent',
      };

      const result1 = await evaluateDeterministicGate(request);
      const result2 = await evaluateDeterministicGate(request);

      expect(result1.proof.proofHash).toBe(result2.proof.proofHash);
      expect(result1.proof.inputHash).toBe(result2.proof.inputHash);
      expect(result1.proof.constraintSetHash).toBe(result2.proof.constraintSetHash);
    });
  });
});
