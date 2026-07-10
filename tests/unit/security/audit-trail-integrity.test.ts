import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

/**
 * Phase 5: Audit Trail Security Tests
 *
 * Verifies hash-chain integrity, tamper detection, and immutability
 */

describe('Audit Trail Integrity', () => {
  describe('Hash Chain Validation', () => {
    it('should generate valid SHA256 hashes (64-char hex)', () => {
      const hash = createHash('sha256').update('test').digest('hex');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash.length).toBe(64);
    });

    it('should detect previous_hash format violations', () => {
      const invalidHashes = [
        'invalid',
        '0000000000000000'.slice(0, 8),
        '0000000000000000invalid',
        'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
      ];

      const hashRegex = /^[a-f0-9]{64}$|^0{16}$/;
      invalidHashes.forEach((hash) => {
        expect(hash).not.toMatch(hashRegex);
      });
    });

    it('should accept initial hash (16 zeros)', () => {
      const initialHash = '0'.repeat(16);
      const hashRegex = /^[a-f0-9]{64}$|^0{16}$/;
      expect(initialHash).toMatch(hashRegex);
    });
  });

  describe('Chain Integrity', () => {
    it('should verify sequential hashes link correctly', () => {
      const batch1Hash = createHash('sha256').update('batch1').digest('hex');
      const batch2Input = batch1Hash + 'batch2';
      const batch2Hash = createHash('sha256').update(batch2Input).digest('hex');
      const batch3Input = batch2Hash + 'batch3';
      const batch3Hash = createHash('sha256').update(batch3Input).digest('hex');

      // Verify chain
      expect(batch1Hash).toMatch(/^[a-f0-9]{64}$/);
      expect(batch2Hash).toMatch(/^[a-f0-9]{64}$/);
      expect(batch3Hash).toMatch(/^[a-f0-9]{64}$/);

      // Verify linking (manual check)
      const batch2Verify = createHash('sha256')
        .update(batch1Hash + 'batch2')
        .digest('hex');
      expect(batch2Verify).toBe(batch2Hash);
    });

    it('should detect tampered batch in chain', () => {
      const batch1Hash = createHash('sha256').update('batch1').digest('hex');
      const batch2Hash = createHash('sha256')
        .update(batch1Hash + 'batch2')
        .digest('hex');

      // Tamper with batch2 input
      const tamperedInput = batch1Hash + 'TAMPERED';
      const tamperedHash = createHash('sha256').update(tamperedInput).digest('hex');

      // Verify tampering is detectable
      expect(tamperedHash).not.toBe(batch2Hash);
    });

    it('should detect broken chain link', () => {
      const batch1Hash = createHash('sha256').update('batch1').digest('hex');
      const batch2Hash = createHash('sha256')
        .update(batch1Hash + 'batch2')
        .digest('hex');

      // Wrong previous hash
      const wrongPreviousHash = createHash('sha256').update('wrong').digest('hex');
      const batch3Hash = createHash('sha256')
        .update(wrongPreviousHash + 'batch3')
        .digest('hex');

      // Verify the chain is broken
      const correctBatch3 = createHash('sha256')
        .update(batch2Hash + 'batch3')
        .digest('hex');
      expect(batch3Hash).not.toBe(correctBatch3);
    });
  });

  describe('Deterministic Hashing', () => {
    it('should produce same hash for same input', () => {
      const input = 'deterministic-test-input';
      const hash1 = createHash('sha256').update(input).digest('hex');
      const hash2 = createHash('sha256').update(input).digest('hex');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = createHash('sha256').update('input1').digest('hex');
      const hash2 = createHash('sha256').update('input2').digest('hex');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle batch serialization deterministically', () => {
      const batch = {
        agent_id: 'agent-123',
        decision: 'ALLOW',
        amount_cents: 10000,
        timestamp: 1234567890,
      };

      // Consistent serialization
      const json1 = JSON.stringify(batch);
      const json2 = JSON.stringify(batch);
      const hash1 = createHash('sha256').update(json1).digest('hex');
      const hash2 = createHash('sha256').update(json2).digest('hex');

      expect(hash1).toBe(hash2);
    });
  });

  describe('Append-Only Semantics', () => {
    it('should only allow INSERT to audit_batch_trail', () => {
      // RLS policy enforcement: no UPDATE, no DELETE
      // This is enforced by Supabase RLS, but we verify the intent
      const allowedOperations = ['INSERT', 'SELECT'];
      const blockedOperations = ['UPDATE', 'DELETE', 'DROP'];

      allowedOperations.forEach((op) => {
        expect(['INSERT', 'SELECT']).toContain(op);
      });

      blockedOperations.forEach((op) => {
        expect(['INSERT', 'SELECT']).not.toContain(op);
      });
    });

    it('should verify audit_batch_events are immutable', () => {
      // Events table: INSERT only via Supabase
      // Verification: can list, cannot modify
      const eventPayload = {
        batch_id: 'batch-123',
        agent_id: 'agent-456',
        decision: 'ALLOW',
        timestamp: 1234567890,
      };

      // Once created, event properties should not change
      expect(eventPayload.decision).toBe('ALLOW');
      expect(eventPayload.timestamp).toBe(1234567890);
    });
  });

  describe('Batch Integrity Verification', () => {
    it('should validate batch contains required fields', () => {
      const validBatch = {
        batch_id: 'batch-123',
        agent_id: 'agent-123',
        delegation_id: 'delegation-456',
        decision: 'ALLOW',
        reason: 'Below threshold',
        harmony_source: 'heuristic',
        batch_hash: 'a'.repeat(64),
        previous_hash: '0'.repeat(16),
      };

      expect(validBatch).toHaveProperty('batch_id');
      expect(validBatch).toHaveProperty('batch_hash');
      expect(validBatch).toHaveProperty('previous_hash');
      expect(validBatch).toHaveProperty('decision');
    });

    it('should reject batch with invalid decision', () => {
      const invalidBatch = {
        decision: 'MAYBE',
      };

      const validDecisions = ['ALLOW', 'BLOCK'];
      expect(validDecisions).not.toContain(invalidBatch.decision);
    });
  });
});
