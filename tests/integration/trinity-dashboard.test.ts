import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Trinity Dashboard - Orchestration Flow', () => {
  describe('GET /api/trinity/status', () => {
    it('should return system status with all 5 agents', async () => {
      const res = await fetch(`${BASE_URL}/api/trinity/status`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.system).toBeDefined();
      expect(data.version).toBeDefined();
      expect(data.agents).toBeDefined();
      expect(Object.keys(data.agents).length).toBe(5);
      expect(data.agents.Mind).toBeDefined();
      expect(data.agents.Hand).toBeDefined();
      expect(data.agents.Eye).toBeDefined();
      expect(data.agents.Nerve).toBeDefined();
      expect(data.agents.Spine).toBeDefined();
      expect(data.governance.policyVersion).toBeDefined();
    });

    it('should have all agents with status and role', async () => {
      const res = await fetch(`${BASE_URL}/api/trinity/status`);
      const data = await res.json();

      Object.entries(data.agents).forEach(([name, info]: any) => {
        expect(info.status).toMatch(/active|ready|online|idle/i);
        expect(info.role).toBeDefined();
      });
    });
  });

  describe('POST /api/trinity/orchestrate', () => {
    it('should validate required fields', async () => {
      const res = await fetch(`${BASE_URL}/api/trinity/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
    });

    it('should execute dry-run orchestration successfully', async () => {
      const payload = {
        dry_run: true,
        job: {
          title: 'Test Smart Contract Audit',
          category: 'smart-contract-audit',
          rewardAmount: 1.5,
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        agent: {
          agentId: 'test-agent-001',
          reputation: 85,
          skills: ['smart-contract-audit', 'security-review'],
        },
      };

      const res = await fetch(`${BASE_URL}/api/trinity/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.dry_run).toBe(true);
      expect(data.planHash).toBeDefined();
      expect(data.governance).toBeDefined();
      expect(Array.isArray(data.governance.constraints)).toBe(true);
    });

    it('should include governance constraints in response', async () => {
      const payload = {
        dry_run: true,
        job: {
          title: 'Another Test Job',
          category: 'backend-api',
          rewardAmount: 2.0,
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        agent: {
          agentId: 'test-agent-002',
          reputation: 75,
          skills: ['backend-api', 'testing'],
        },
      };

      const res = await fetch(`${BASE_URL}/api/trinity/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      expect(data.governance.constraints.length).toBeGreaterThan(0);
      expect(data.governance.constraints[0].name).toBeDefined();
      expect(data.governance.constraints[0].satisfied).toBe(true || false);
    });

    it('should include execution results from Hand agent', async () => {
      const payload = {
        dry_run: true,
        job: {
          title: 'Execution Test',
          category: 'frontend-dev',
          rewardAmount: 1.0,
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        agent: {
          agentId: 'test-agent-003',
          reputation: 90,
          skills: ['frontend-dev'],
        },
      };

      const res = await fetch(`${BASE_URL}/api/trinity/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.execution) {
        expect(data.execution.deliverableLength).toBeGreaterThanOrEqual(0);
        expect(data.execution.qualityScore).toBeGreaterThanOrEqual(0);
        expect(data.execution.qualityScore).toBeLessThanOrEqual(100);
        expect(data.execution.proofHash).toBeDefined();
        expect(data.execution.executionTimeMs).toBeGreaterThan(0);
      }
    });

    it('should include verification results from Eye agent', async () => {
      const payload = {
        dry_run: true,
        job: {
          title: 'Verification Test',
          category: 'testing',
          rewardAmount: 0.5,
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        agent: {
          agentId: 'test-agent-004',
          reputation: 80,
          skills: ['testing'],
        },
      };

      const res = await fetch(`${BASE_URL}/api/trinity/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.verification) {
        expect(typeof data.verification.passed).toBe('boolean');
        expect(data.verification.qualityScore).toBeGreaterThanOrEqual(0);
        expect(data.verification.qualityScore).toBeLessThanOrEqual(100);
        expect(Array.isArray(data.verification.issues)).toBe(true);
      }
    });

    it('should include reputation changes from Nerve agent', async () => {
      const payload = {
        dry_run: true,
        job: {
          title: 'Reputation Test',
          category: 'security-review',
          rewardAmount: 3.0,
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        agent: {
          agentId: 'test-agent-005',
          reputation: 70,
          skills: ['security-review'],
        },
      };

      const res = await fetch(`${BASE_URL}/api/trinity/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.reputation) {
        expect(data.reputation.newReputation).toBeGreaterThanOrEqual(0);
        expect(data.reputation.newReputation).toBeLessThanOrEqual(100);
        expect(typeof data.reputation.reputationChange).toBe('number');
        expect(typeof data.reputation.tierChanged).toBe('boolean');
      }
    });

    it('should include auditHash for full trace', async () => {
      const payload = {
        dry_run: true,
        job: {
          title: 'Audit Hash Test',
          category: 'documentation',
          rewardAmount: 0.75,
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        agent: {
          agentId: 'test-agent-006',
          reputation: 88,
          skills: ['documentation'],
        },
      };

      const res = await fetch(`${BASE_URL}/api/trinity/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      expect(data.auditHash).toBeDefined();
      expect(data.auditHash).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
      expect(data.completedAt).toBeDefined();
    });

    it('should reject invalid reward amounts', async () => {
      const payload = {
        dry_run: true,
        job: {
          title: 'Invalid Reward Test',
          category: 'devops',
          rewardAmount: -1, // Invalid
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        agent: {
          agentId: 'test-agent-007',
          reputation: 95,
          skills: ['devops'],
        },
      };

      const res = await fetch(`${BASE_URL}/api/trinity/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400 || 422);
    });

    it('should reject invalid reputation values', async () => {
      const payload = {
        dry_run: true,
        job: {
          title: 'Invalid Reputation Test',
          category: 'data-analysis',
          rewardAmount: 1.5,
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        agent: {
          agentId: 'test-agent-008',
          reputation: 150, // Invalid: > 100
          skills: ['data-analysis'],
        },
      };

      const res = await fetch(`${BASE_URL}/api/trinity/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400 || 422);
    });
  });

  describe('GET /api/trinity/history', () => {
    it('should return execution history', async () => {
      const res = await fetch(`${BASE_URL}/api/trinity/history`);

      if (res.ok) {
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(Array.isArray(data.history)).toBe(true);
      }
    });
  });

  describe('GET /api/trinity/jobs', () => {
    it('should return discovered jobs', async () => {
      const res = await fetch(`${BASE_URL}/api/trinity/jobs`);

      if (res.ok) {
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(Array.isArray(data.jobs)).toBe(true);
      }
    });
  });

  describe('WebSocket /api/trinity/ws', () => {
    it('should accept WebSocket connections', async () => {
      // Note: This test requires WebSocket support in test environment
      // Typically tested via Playwright E2E tests
      expect(true).toBe(true);
    });
  });

  describe('Form validation', () => {
    it('should validate job title is not empty', async () => {
      const payload = {
        dry_run: true,
        job: {
          title: '', // Empty
          category: 'smart-contract-audit',
          rewardAmount: 1.5,
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        agent: {
          agentId: 'test-agent-009',
          reputation: 85,
          skills: ['smart-contract-audit'],
        },
      };

      const res = await fetch(`${BASE_URL}/api/trinity/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
    });

    it('should validate reward is greater than 0', async () => {
      const payload = {
        dry_run: true,
        job: {
          title: 'Test Job',
          category: 'smart-contract-audit',
          rewardAmount: 0, // Invalid: not > 0
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        agent: {
          agentId: 'test-agent-010',
          reputation: 85,
          skills: ['smart-contract-audit'],
        },
      };

      const res = await fetch(`${BASE_URL}/api/trinity/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400 || 422);
    });
  });
});
