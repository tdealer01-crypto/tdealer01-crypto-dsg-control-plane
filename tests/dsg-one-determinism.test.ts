/**
 * DSG ONE Determinism Engine - Unit Tests
 *
 * Tests pure determinism functions (no database dependencies):
 * 1. Hash computation (deterministic, same input → same hash)
 * 2. Chain verification (tamper detection)
 * 3. Merkle proofs (compact audit proofs)
 * 4. Ledger export (SARIF format)
 *
 * Database-dependent tests are in integration tests.
 */

import { describe, it, expect } from 'vitest';
import {
  computeRequestHash,
  computeDecisionHash,
  computeChainHash,
  type PolicyExecutionRequest,
  type PolicyExecutionDecision,
} from '../lib/dsg-one/determinism-engine';
import {
  buildMerkleTree,
  generateMerkleProof,
  verifyMerkleProof,
  exportLedgerAsSARIF,
  exportLedgerAsJSON,
} from '../lib/dsg-one/merkle-ledger';

describe('DSG ONE Determinism Engine - Pure Functions', () => {
  // Test data
  const orgId = 'test-org-determinism';
  const testRequest: PolicyExecutionRequest = {
    orgId,
    policyId: 'test-policy-1',
    requestType: 'approval',
    requestData: {
      amount: 100000,
      vendor: 'test-supplier',
      currency: 'USD',
    },
    requesterId: 'user-123',
    requesterRole: 'finance-manager',
    metadata: { test: true },
  };

  const testDecision: PolicyExecutionDecision = {
    decision: 'ALLOW',
    reason: 'Amount below threshold',
    riskScore: 0.2,
    evidence: {
      rule: 'auto-approve-under-100k',
      vendorRisk: 'low',
    },
  };

  describe('Hash Computation (Deterministic)', () => {
    it('should compute same request hash for same input', () => {
      const hash1 = computeRequestHash(testRequest);
      const hash2 = computeRequestHash(testRequest);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('should compute different request hash for different input', () => {
      const hash1 = computeRequestHash(testRequest);

      const modifiedRequest = {
        ...testRequest,
        requestData: { ...testRequest.requestData, amount: 200000 },
      };
      const hash2 = computeRequestHash(modifiedRequest);

      expect(hash1).not.toBe(hash2);
    });

    it('should compute same decision hash for same decision', () => {
      const hash1 = computeDecisionHash(testDecision);
      const hash2 = computeDecisionHash(testDecision);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('should compute different decision hash for different decision', () => {
      const hash1 = computeDecisionHash(testDecision);

      const modifiedDecision = {
        ...testDecision,
        decision: 'BLOCK' as const,
      };
      const hash2 = computeDecisionHash(modifiedDecision);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Chain Hash (Tamper Detection)', () => {
    it('should compute valid chain hash linking previous entry', () => {
      const requestHash = computeRequestHash(testRequest);
      const decisionHash = computeDecisionHash(testDecision);
      const previousHash = 'sha256:abc123def456789abc123def456789abc123def456789abc123def456789abc1';

      const chainHash = computeChainHash(previousHash, requestHash, decisionHash);

      expect(chainHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('should produce different chain hash if previous hash changes', () => {
      const requestHash = computeRequestHash(testRequest);
      const decisionHash = computeDecisionHash(testDecision);
      const prev1 = 'sha256:abc123def456789abc123def456789abc123def456789abc123def456789abc1';
      const prev2 = 'sha256:111111def456789abc123def456789abc123def456789abc123def456789abc1';

      const hash1 = computeChainHash(prev1, requestHash, decisionHash);
      const hash2 = computeChainHash(prev2, requestHash, decisionHash);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle first entry (no previous hash)', () => {
      const requestHash = computeRequestHash(testRequest);
      const decisionHash = computeDecisionHash(testDecision);

      const chainHash = computeChainHash(undefined, requestHash, decisionHash);

      expect(chainHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });

  describe('Merkle Tree', () => {
    it('should build Merkle tree from ledger entries', () => {
      const entries = [
        {
          sequenceNumber: 1n,
          entryId: 'entry-1',
          requestHash: computeRequestHash(testRequest),
          decisionHash: computeDecisionHash(testDecision),
          chainHash: computeChainHash(undefined, computeRequestHash(testRequest), computeDecisionHash(testDecision)),
          timestamp: new Date().toISOString(),
          verified: true,
        },
      ];

      const { rootHash, tree } = buildMerkleTree(entries);

      expect(rootHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(tree).toEqual([]);
    });

    it('should generate valid Merkle proof for entry', () => {
      const entries = Array.from({ length: 5 }, (_, i) => ({
        sequenceNumber: BigInt(i + 1),
        entryId: `entry-${i + 1}`,
        requestHash: computeRequestHash({ ...testRequest, requestData: { id: i } }),
        decisionHash: computeDecisionHash(testDecision),
        chainHash: computeChainHash(
          undefined,
          computeRequestHash({ ...testRequest, requestData: { id: i } }),
          computeDecisionHash(testDecision)
        ),
        timestamp: new Date().toISOString(),
        verified: true,
      }));

      const proof = generateMerkleProof(entries, 'entry-2');

      expect(proof).not.toBeNull();
      if (proof) {
        expect(proof.leafHash).toMatch(/^sha256:[a-f0-9]{64}$/);
        expect(proof.leafIndex).toBe(1);
        expect(proof.rootHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      }
    });

    it('should verify valid Merkle proof', () => {
      const entries = Array.from({ length: 3 }, (_, i) => ({
        sequenceNumber: BigInt(i + 1),
        entryId: `entry-${i + 1}`,
        requestHash: computeRequestHash({ ...testRequest, requestData: { id: i } }),
        decisionHash: computeDecisionHash(testDecision),
        chainHash: computeChainHash(
          undefined,
          computeRequestHash({ ...testRequest, requestData: { id: i } }),
          computeDecisionHash(testDecision)
        ),
        timestamp: new Date().toISOString(),
        verified: true,
      }));

      const proof = generateMerkleProof(entries, 'entry-1');

      if (proof) {
        const isValid = verifyMerkleProof(proof);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Ledger Export', () => {
    it('should export ledger as JSON', () => {
      const entries = [
        {
          sequenceNumber: 1n,
          entryId: 'entry-1',
          requestHash: computeRequestHash(testRequest),
          decisionHash: computeDecisionHash(testDecision),
          chainHash: computeChainHash(undefined, computeRequestHash(testRequest), computeDecisionHash(testDecision)),
          timestamp: new Date().toISOString(),
          verified: true,
          decisionOutcome: 'ALLOW',
          decisionReason: 'Amount below threshold',
          riskScore: 0.2,
        },
      ];

      const { rootHash } = buildMerkleTree(
        entries.map((e) => ({
          sequenceNumber: e.sequenceNumber,
          entryId: e.entryId,
          requestHash: e.requestHash,
          decisionHash: e.decisionHash,
          chainHash: e.chainHash,
          timestamp: e.timestamp,
          verified: e.verified,
        }))
      );

      const jsonExport = exportLedgerAsJSON(orgId, entries);
      const parsed = JSON.parse(jsonExport);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.format).toBe('DSG-DETERMINISM-LEDGER');
      expect(parsed.orgId).toBe(orgId);
      expect(parsed.merkleRootHash).toBe(rootHash);
      expect(parsed.totalEntries).toBe(1);
      expect(parsed.entries).toHaveLength(1);
    });

    it('should export ledger as SARIF', () => {
      const entries = [
        {
          sequenceNumber: 1n,
          entryId: 'entry-1',
          requestHash: computeRequestHash(testRequest),
          decisionHash: computeDecisionHash(testDecision),
          chainHash: computeChainHash(undefined, computeRequestHash(testRequest), computeDecisionHash(testDecision)),
          timestamp: new Date().toISOString(),
          verified: true,
          decisionOutcome: 'ALLOW',
          decisionReason: 'Amount below threshold',
          riskScore: 0.2,
        },
      ];

      const { rootHash } = buildMerkleTree(
        entries.map((e) => ({
          sequenceNumber: e.sequenceNumber,
          entryId: e.entryId,
          requestHash: e.requestHash,
          decisionHash: e.decisionHash,
          chainHash: e.chainHash,
          timestamp: e.timestamp,
          verified: e.verified,
        }))
      );

      const sarifExport = exportLedgerAsSARIF(orgId, entries, rootHash);

      expect((sarifExport as any).version).toBe('2.1.0');
      expect((sarifExport as any).runs).toHaveLength(1);
      expect((sarifExport as any).runs[0].tool.driver.name).toBe('DSG ONE Governance Engine');
      expect((sarifExport as any).runs[0].results).toHaveLength(1);
    });
  });

  describe('Determinism Property Tests', () => {
    it('should demonstrate determinism: same input → same hashes', () => {
      // First execution
      const requestHash1 = computeRequestHash(testRequest);
      const decisionHash1 = computeDecisionHash(testDecision);

      // Replay with same input
      const requestHash2 = computeRequestHash(testRequest);
      const decisionHash2 = computeDecisionHash(testDecision);

      // Verify determinism
      expect(requestHash1).toBe(requestHash2);
      expect(decisionHash1).toBe(decisionHash2);
    });

    it('should detect non-determinism: different input → different hashes', () => {
      // First execution
      const requestHash1 = computeRequestHash(testRequest);
      const decisionHash1 = computeDecisionHash(testDecision);

      // Modified request
      const modifiedRequest = {
        ...testRequest,
        requestData: { ...testRequest.requestData, amount: 200000 },
      };
      const requestHash2 = computeRequestHash(modifiedRequest);

      // Modified decision
      const escalatedDecision: PolicyExecutionDecision = {
        ...testDecision,
        decision: 'REVIEW',
        reason: 'Amount above threshold',
        riskScore: 0.7,
      };
      const decisionHash2 = computeDecisionHash(escalatedDecision);

      // Verify change is detectable
      expect(requestHash1).not.toBe(requestHash2);
      expect(decisionHash1).not.toBe(decisionHash2);
    });
  });
});
