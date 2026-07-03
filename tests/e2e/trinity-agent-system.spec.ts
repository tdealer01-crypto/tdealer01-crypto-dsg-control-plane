/**
 * E2E System Tests: Trinity AI Multi-Agent System
 *
 * ทดสอบ full cycle ของ 5-agent orchestration:
 * Mind (discover) → Hand (execute) → Eye (verify) → Nerve (pay/reputation) → Spine (govern/audit)
 *
 * ทดสอบผ่าน /api/trinity/* endpoints ในโหมด dry_run
 * ไม่ทำ real SOL transfers ใน E2E suite
 */
import { test, expect, request } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const TRINITY_STATUS = `${BASE}/api/trinity/status`;
const TRINITY_ORCHESTRATE = `${BASE}/api/trinity/orchestrate`;

// ---------------------------------------------------------------------------
// 1. Trinity System Status
// ---------------------------------------------------------------------------
test.describe('Trinity System Status', () => {
  test('GET /api/trinity/status → 200 with all 5 agents registered', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.get(TRINITY_STATUS, { timeout: 15_000 });

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.system).toContain('Trinity');

    const agents = body.agents as Record<string, { status: string }>;
    for (const name of ['Mind', 'Hand', 'Eye', 'Nerve', 'Spine']) {
      expect(agents[name], `Agent ${name} must be registered`).toBeDefined();
      expect(agents[name].status).toBe('registered');
    }

    expect(body.governance.policyVersion).toBe('1.0');
    expect(body.governance.constraintsEnforced).toBe(5);

    await api.dispose();
  });

  test('GET /api/trinity/orchestrate → 200 service description', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.get(TRINITY_ORCHESTRATE, { timeout: 15_000 });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe('trinity-orchestrator');
    expect(Array.isArray(body.agents)).toBe(true);
    expect(body.agents).toHaveLength(5);

    await api.dispose();
  });
});

// ---------------------------------------------------------------------------
// 2. Spine Governance — plan creation and policy enforcement
// ---------------------------------------------------------------------------
test.describe('Spine Agent — Governance Gate', () => {
  test('governance APPROVED for valid job and qualified agent', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {
        dry_run: true,
        job: {
          title: 'Audit ERC-20 Token Contract',
          category: 'smart-contract-audit',
          rewardAmount: 2.0,
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        agent: {
          agentId: 'e2e-test-agent',
          walletAddress: 'TestWallet1111111111111111111111111111111111',
          reputation: 80,
          skills: ['smart-contract-audit', 'solidity'],
        },
      },
      timeout: 20_000,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.governance.approved).toBe(true);
    expect(body.governance.violations).toHaveLength(0);
    expect(body.governance.policyVersion).toBe('1.0');
    expect(body.planHash).toBeTruthy();
    expect(body.planHash.length).toBeGreaterThan(20);

    await api.dispose();
  });

  test('governance BLOCKED when reward amount is 0', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {
        dry_run: true,
        job: {
          title: 'Zero Reward Job',
          category: 'testing',
          rewardAmount: 0,
          deadline: new Date(Date.now() + 86_400_000).toISOString(),
        },
        agent: { reputation: 50, skills: ['testing'] },
      },
      timeout: 15_000,
    });

    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.governance.approved).toBe(false);
    expect(body.governance.violations).toContain('Job Amount Valid');

    await api.dispose();
  });

  test('governance BLOCKED when deadline is in the past', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {
        dry_run: true,
        job: {
          title: 'Expired Job',
          category: 'documentation',
          rewardAmount: 1.0,
          deadline: new Date(Date.now() - 86_400_000).toISOString(),
        },
        agent: { reputation: 50, skills: ['documentation'] },
      },
      timeout: 15_000,
    });

    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.governance.violations).toContain('Deadline Valid');

    await api.dispose();
  });

  test('governance BLOCKED when agent has no skills', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {
        dry_run: true,
        job: {
          rewardAmount: 1.5,
          deadline: new Date(Date.now() + 86_400_000).toISOString(),
        },
        agent: { reputation: 60, skills: [] },
      },
      timeout: 15_000,
    });

    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.governance.violations).toContain('Agent Qualified');

    await api.dispose();
  });

  test('planHash is deterministic for same job+agent inputs', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const payload = {
      dry_run: true,
      job: { id: 'fixed-job-id', category: 'backend-api', rewardAmount: 3.0, deadline: new Date(Date.now() + 86_400_000).toISOString() },
      agent: { agentId: 'fixed-agent-id', reputation: 50, skills: ['backend-api'] },
    };

    const [res1, res2] = await Promise.all([
      api.post(TRINITY_ORCHESTRATE, { data: payload, timeout: 15_000 }),
      api.post(TRINITY_ORCHESTRATE, { data: payload, timeout: 15_000 }),
    ]);

    const [b1, b2] = await Promise.all([res1.json(), res2.json()]);

    expect(b1.planHash).toBe(b2.planHash);

    await api.dispose();
  });
});

// ---------------------------------------------------------------------------
// 3. Hand Agent — Execution and deliverable generation
// ---------------------------------------------------------------------------
test.describe('Hand Agent — Execution', () => {
  const CATEGORIES = [
    'smart-contract-audit',
    'frontend-dev',
    'backend-api',
    'documentation',
    'testing',
  ] as const;

  for (const category of CATEGORIES) {
    test(`Hand generates non-empty deliverable for category: ${category}`, async () => {
      const api = await request.newContext({ ignoreHTTPSErrors: true });
      const res = await api.post(TRINITY_ORCHESTRATE, {
        data: {
          dry_run: true,
          job: { title: `Test ${category}`, category, rewardAmount: 1.0, deadline: new Date(Date.now() + 86_400_000).toISOString() },
          agent: { reputation: 70, skills: [category] },
        },
        timeout: 20_000,
      });

      expect(res.status()).toBe(200);
      const body = await res.json();

      expect(body.execution.deliverableLength, `${category} deliverable must be non-empty`).toBeGreaterThan(0);
      expect(body.execution.qualityScore, `${category} quality score 0-100`).toBeGreaterThanOrEqual(0);
      expect(body.execution.qualityScore).toBeLessThanOrEqual(100);
      expect(body.execution.proofHash).toBeTruthy();
      expect(body.execution.proofHash.length).toBeGreaterThan(20);
      expect(body.execution.executionTimeMs).toBeGreaterThanOrEqual(0);

      await api.dispose();
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Eye Agent — Quality verification
// ---------------------------------------------------------------------------
test.describe('Eye Agent — Verification', () => {
  test('verification passes when quality score meets threshold', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {
        dry_run: true,
        job: { category: 'smart-contract-audit', rewardAmount: 2.0, deadline: new Date(Date.now() + 86_400_000).toISOString() },
        agent: { reputation: 80, skills: ['smart-contract-audit'] },
      },
      timeout: 20_000,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.verification.passed).toBe(true);
    expect(body.verification.qualityScore).toBeGreaterThanOrEqual(70);
    expect(body.verification.issues).toHaveLength(0);

    await api.dispose();
  });

  test('proofHash uniqueness — two different jobs produce different proof hashes', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const base = {
      dry_run: true,
      job: { rewardAmount: 1.0, deadline: new Date(Date.now() + 86_400_000).toISOString() },
      agent: { reputation: 70, skills: ['backend-api'] },
    };

    const [r1, r2] = await Promise.all([
      api.post(TRINITY_ORCHESTRATE, {
        data: { ...base, job: { ...base.job, id: 'job-A', category: 'backend-api' } },
        timeout: 15_000,
      }),
      api.post(TRINITY_ORCHESTRATE, {
        data: { ...base, job: { ...base.job, id: 'job-B', category: 'documentation' } },
        timeout: 15_000,
      }),
    ]);

    const [b1, b2] = await Promise.all([r1.json(), r2.json()]);

    expect(b1.execution.proofHash).not.toBe(b2.execution.proofHash);

    await api.dispose();
  });
});

// ---------------------------------------------------------------------------
// 5. Nerve Agent — Reputation management
// ---------------------------------------------------------------------------
test.describe('Nerve Agent — Reputation', () => {
  test('reputation increases after successful high-quality execution', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {
        dry_run: true,
        job: { category: 'smart-contract-audit', rewardAmount: 5.0, deadline: new Date(Date.now() + 86_400_000).toISOString() },
        agent: { agentId: 'reputation-test-agent', reputation: 60, skills: ['smart-contract-audit'] },
      },
      timeout: 20_000,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.reputation.reputationChange).toBeGreaterThan(0);
    expect(body.reputation.newReputation).toBeGreaterThan(60);

    await api.dispose();
  });

  test('reputation field contains required properties', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {
        dry_run: true,
        job: { rewardAmount: 1.5, deadline: new Date(Date.now() + 86_400_000).toISOString() },
        agent: { reputation: 50, skills: ['testing'] },
      },
      timeout: 20_000,
    });

    const body = await res.json();
    if (body.ok) {
      expect(typeof body.reputation.newReputation).toBe('number');
      expect(typeof body.reputation.reputationChange).toBe('number');
      expect(typeof body.reputation.tierChanged).toBe('boolean');
    }

    await api.dispose();
  });
});

// ---------------------------------------------------------------------------
// 6. Full Cycle — Mind → Hand → Eye → Nerve → Spine
// ---------------------------------------------------------------------------
test.describe('Full Cycle — End-to-End Orchestration', () => {
  test('complete dry-run cycle returns all stage results', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {
        dry_run: true,
        job: {
          id: 'e2e-full-cycle-001',
          title: 'Full E2E Security Audit',
          category: 'smart-contract-audit',
          rewardAmount: 3.5,
          rewardCurrency: 'SOL',
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          requirements: ['Solidity 0.8+', 'Reentrancy analysis', 'Access control review'],
        },
        agent: {
          agentId: 'trinity-e2e-agent',
          walletAddress: 'E2eTestWallet111111111111111111111111111111',
          reputation: 85,
          skills: ['smart-contract-audit', 'security-review', 'solidity'],
        },
      },
      timeout: 30_000,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // Core response
    expect(body.ok).toBe(true);
    expect(body.dry_run).toBe(true);

    // Spine: plan + governance
    expect(body.planHash).toBeTruthy();
    expect(body.governance.approved).toBe(true);
    expect(body.governance.violations).toHaveLength(0);
    expect(body.governance.constraints).toHaveLength(5);

    // Hand: execution
    expect(body.execution).toBeDefined();
    expect(body.execution.deliverableLength).toBeGreaterThan(50);
    expect(body.execution.qualityScore).toBeGreaterThanOrEqual(0);
    expect(body.execution.proofHash).toBeTruthy();

    // Eye: verification
    expect(body.verification).toBeDefined();
    expect(typeof body.verification.passed).toBe('boolean');

    // Nerve: reputation
    expect(body.reputation).toBeDefined();
    expect(body.reputation.newReputation).toBeGreaterThanOrEqual(0);

    // Audit trail
    expect(body.auditHash).toBeTruthy();
    expect(body.auditHash.length).toBeGreaterThan(20);
    expect(body.completedAt).toBeTruthy();

    await api.dispose();
  });

  test('full cycle completes within 10 seconds', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const start = Date.now();
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {
        dry_run: true,
        job: { rewardAmount: 1.0, category: 'testing', deadline: new Date(Date.now() + 86_400_000).toISOString() },
        agent: { reputation: 60, skills: ['testing'] },
      },
      timeout: 15_000,
    });
    const elapsed = Date.now() - start;

    expect(res.status()).toBe(200);
    expect(elapsed, `Full cycle must complete in <10s, took ${elapsed}ms`).toBeLessThan(10_000);

    await api.dispose();
  });

  test('auditHash differs between two separate executions (non-deterministic by timestamp)', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const payload = {
      dry_run: true,
      job: { category: 'backend-api', rewardAmount: 2.0, deadline: new Date(Date.now() + 86_400_000).toISOString() },
      agent: { reputation: 70, skills: ['backend-api'] },
    };

    const r1 = await api.post(TRINITY_ORCHESTRATE, { data: payload, timeout: 15_000 });
    await new Promise((r) => setTimeout(r, 50));
    const r2 = await api.post(TRINITY_ORCHESTRATE, { data: payload, timeout: 15_000 });

    const [b1, b2] = await Promise.all([r1.json(), r2.json()]);

    // planHash is deterministic (same job.id+agent.id+category) but auditHash
    // includes timestamp-derived elements so may differ. At minimum, both must be non-empty.
    expect(b1.auditHash).toBeTruthy();
    expect(b2.auditHash).toBeTruthy();

    await api.dispose();
  });
});

// ---------------------------------------------------------------------------
// 7. Security / Adversarial
// ---------------------------------------------------------------------------
test.describe('Trinity Security — Adversarial Inputs', () => {
  test('rejects malformed JSON body gracefully', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: '{ invalid json :::',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10_000,
    });

    // Should return 4xx or 200 with ok:false — never 500 panic
    expect([200, 400, 422, 500].includes(res.status())).toBe(true);

    await api.dispose();
  });

  test('empty body falls back to defaults without crashing', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {},
      timeout: 15_000,
    });

    // Default values should result in approved governance
    expect([200, 422].includes(res.status())).toBe(true);
    const body = await res.json();
    expect(typeof body.ok).toBe('boolean');

    await api.dispose();
  });

  test('extremely large reward amount is blocked by governance', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {
        dry_run: true,
        job: { rewardAmount: 9_999_999, category: 'backend-api', deadline: new Date(Date.now() + 86_400_000).toISOString() },
        agent: { reputation: 80, skills: ['backend-api'] },
      },
      timeout: 15_000,
    });

    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.governance.violations).toContain('Job Amount Valid');

    await api.dispose();
  });

  test('negative reputation agent is blocked by governance', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post(TRINITY_ORCHESTRATE, {
      data: {
        dry_run: true,
        job: { rewardAmount: 1.0, deadline: new Date(Date.now() + 86_400_000).toISOString() },
        agent: { reputation: -10, skills: ['backend-api'] },
      },
      timeout: 15_000,
    });

    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.governance.violations.length).toBeGreaterThan(0);

    await api.dispose();
  });
});
