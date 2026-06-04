import { describe, it, expect } from 'vitest';
import {
  DSGGatesClient,
  validatePolicy,
  policyHash,
  GatePolicyConfig,
  GateRequest,
} from '../src/index';

describe('@dsg-platform/gates', () => {
  const samplePolicy: GatePolicyConfig = {
    id: 'test-policy',
    version: '1.0.0',
    name: 'Test Policy',
    description: 'Test policy for unit tests',
    constraints: [
      {
        id: 'test-constraint',
        type: 'role_check',
        operator: 'in',
        value: ['admin'],
        description: 'Only admins allowed',
        riskLevel: 'high',
        isBlocker: true,
      },
    ],
    defaultDecision: 'ALLOW',
    requireApproval: false,
    actionPatterns: ['test.*'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleRequest: GateRequest = {
    executionId: 'exec-test-123',
    agentId: 'test-agent',
    orgId: 'test-org',
    action: 'test deployment',
    input: { environment: 'staging' },
    context: {
      source: 'api',
      timestamp: new Date().toISOString(),
    },
  };

  describe('validatePolicy', () => {
    it('should accept valid policy', () => {
      const result = validatePolicy(samplePolicy);
      expect(result).toHaveLength(0);
    });

    it('should reject policy with missing id', () => {
      const invalid = { ...samplePolicy, id: '' };
      const result = validatePolicy(invalid);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].message).toContain('ID is required');
    });

    it('should reject invalid decision', () => {
      const invalid = { ...samplePolicy, defaultDecision: 'INVALID' as any };
      const result = validatePolicy(invalid);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('policyHash', () => {
    it('should generate consistent hash', () => {
      const hash1 = policyHash(samplePolicy);
      const hash2 = policyHash(samplePolicy);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different policies', () => {
      const policy1 = { ...samplePolicy };
      const policy2 = { ...samplePolicy, version: '2.0.0' };
      expect(policyHash(policy1)).not.toBe(policyHash(policy2));
    });

    it('should return SHA-256 hex string', () => {
      const hash = policyHash(samplePolicy);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });
  });

  describe('DSGGatesClient', () => {
    it('should create client with config', () => {
      const client = new DSGGatesClient({
        orgId: 'test-org',
        agentId: 'test-agent',
        apiKey: 'test-key',
      });
      expect(client).toBeDefined();
    });

    it('should validate policy via client', () => {
      const client = new DSGGatesClient();
      const result = client.validatePolicy(samplePolicy);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should get policy hash via client', () => {
      const client = new DSGGatesClient();
      const hash = client.getPolicyHash(samplePolicy);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });

    it('should evaluate gate locally', async () => {
      const client = new DSGGatesClient();
      const response = await client.evaluateGate(sampleRequest, samplePolicy);
      expect(response).toBeDefined();
      expect(response.decision).toBeDefined();
      expect(response.executionId).toBe(sampleRequest.executionId);
      expect(response.proof).toBeDefined();
      expect(response.proof.requestHash).toBeDefined();
    });

    it('should set default policy', () => {
      const client = new DSGGatesClient();
      client.setDefaultPolicy(samplePolicy);
      const config = client.getConfig();
      expect(config.defaultPolicy).toBe(samplePolicy);
    });

    it('should return config', () => {
      const config = {
        orgId: 'test-org',
        agentId: 'test-agent',
        apiKey: 'test-key',
      };
      const client = new DSGGatesClient(config);
      const retrievedConfig = client.getConfig();
      expect(retrievedConfig.orgId).toBe(config.orgId);
      expect(retrievedConfig.agentId).toBe(config.agentId);
    });
  });

  describe('GateResponse proof', () => {
    it('should include cryptographic proofs', async () => {
      const client = new DSGGatesClient();
      const response = await client.evaluateGate(sampleRequest, samplePolicy);

      expect(response.proof).toBeDefined();
      expect(response.proof.timestamp).toBeDefined();
      expect(response.proof.requestHash).toBeDefined();
      expect(response.proof.decisionHash).toBeDefined();
      expect(response.policyHash).toBeDefined();

      // Verify hashes are SHA-256 format
      expect(/^[a-f0-9]{64}$/.test(response.proof.requestHash)).toBe(true);
      expect(/^[a-f0-9]{64}$/.test(response.proof.decisionHash)).toBe(true);
      expect(/^[a-f0-9]{64}$/.test(response.policyHash)).toBe(true);
    });
  });
});
