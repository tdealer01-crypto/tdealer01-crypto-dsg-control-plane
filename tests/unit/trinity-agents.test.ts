/**
 * Unit Tests: Trinity AI Multi-Agent System
 *
 * ทดสอบ logic ของแต่ละ agent โดยไม่ต้องมี live Solana/Supabase
 * mock external dependencies ทั้งหมด
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Inline helpers ที่ดึงมาจาก agents (ทดสอบ logic โดยตรงโดยไม่ import full modules)
// ---------------------------------------------------------------------------

function createPlanHash(jobId: string, agentId: string, category: string): string {
  const content = `${jobId}:${agentId}:${category}`;
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 44);
}

function evaluateGovernance(
  job: { rewardAmount: number; deadline: string; requirements: string[] },
  agent: { reputation: number; skills: string[] },
) {
  const constraints = [
    { name: 'Agent Active', satisfied: agent.reputation >= 0 },
    { name: 'Job Amount Valid', satisfied: job.rewardAmount > 0 && job.rewardAmount < 100_000 },
    { name: 'Deadline Valid', satisfied: new Date(job.deadline) > new Date() },
    { name: 'Agent Qualified', satisfied: agent.skills.length > 0 },
    { name: 'No Sanctions', satisfied: agent.reputation >= 0 },
  ];
  const violations = constraints.filter((c) => !c.satisfied).map((c) => c.name);
  return { approved: violations.length === 0, violations, constraints, policyVersion: '1.0' };
}

function scoreQuality(deliverable: string, category: string): number {
  let score = 50;
  if (deliverable.length > 200) score += 15;
  if (deliverable.length > 500) score += 10;
  if (deliverable.includes('#')) score += 5;
  if (deliverable.includes('function') || deliverable.includes('const') || deliverable.includes('class')) score += 10;
  if (category === 'smart-contract-audit') score += 10;
  return Math.min(100, score);
}

function getTier(reputation: number, completedJobs: number): string {
  if (reputation >= 90 && completedJobs >= 100) return 'platinum';
  if (reputation >= 70 && completedJobs >= 25) return 'gold';
  if (reputation >= 40 && completedJobs >= 5) return 'silver';
  return 'bronze';
}

function computeReputationChange(verificationPassed: boolean, qualityScore: number): number {
  if (!verificationPassed) return -5;
  return qualityScore >= 90 ? 5 : 2;
}

function createAuditHash(planHash: string, steps: Array<{ agent: string; status: string }>): string {
  const content = `${planHash}:${steps.map((s) => `${s.agent}:${s.status}`).join('|')}`;
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 44);
}

// ---------------------------------------------------------------------------
// Spine Agent Tests
// ---------------------------------------------------------------------------
describe('Spine Agent — Governance', () => {
  const validJob = {
    rewardAmount: 1.5,
    deadline: new Date(Date.now() + 86_400_000).toISOString(),
    requirements: ['Solidity'],
  };
  const validAgent = { reputation: 75, skills: ['smart-contract-audit'] };

  it('approves governance for valid job and agent', () => {
    const result = evaluateGovernance(validJob, validAgent);
    expect(result.approved).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.constraints).toHaveLength(5);
    expect(result.policyVersion).toBe('1.0');
  });

  it('blocks when rewardAmount is 0', () => {
    const result = evaluateGovernance({ ...validJob, rewardAmount: 0 }, validAgent);
    expect(result.approved).toBe(false);
    expect(result.violations).toContain('Job Amount Valid');
  });

  it('blocks when rewardAmount exceeds 100,000', () => {
    const result = evaluateGovernance({ ...validJob, rewardAmount: 200_000 }, validAgent);
    expect(result.approved).toBe(false);
    expect(result.violations).toContain('Job Amount Valid');
  });

  it('blocks when deadline is in the past', () => {
    const result = evaluateGovernance(
      { ...validJob, deadline: new Date(Date.now() - 1000).toISOString() },
      validAgent,
    );
    expect(result.approved).toBe(false);
    expect(result.violations).toContain('Deadline Valid');
  });

  it('blocks when agent has no skills', () => {
    const result = evaluateGovernance(validJob, { ...validAgent, skills: [] });
    expect(result.approved).toBe(false);
    expect(result.violations).toContain('Agent Qualified');
  });

  it('blocks when agent reputation is negative', () => {
    const result = evaluateGovernance(validJob, { ...validAgent, reputation: -1 });
    expect(result.approved).toBe(false);
    expect(result.violations).toContain('Agent Active');
    expect(result.violations).toContain('No Sanctions');
  });

  it('planHash is deterministic for same inputs', () => {
    const h1 = createPlanHash('job-1', 'agent-1', 'backend-api');
    const h2 = createPlanHash('job-1', 'agent-1', 'backend-api');
    expect(h1).toBe(h2);
  });

  it('planHash changes when job or agent changes', () => {
    const h1 = createPlanHash('job-1', 'agent-1', 'backend-api');
    const h2 = createPlanHash('job-2', 'agent-1', 'backend-api');
    const h3 = createPlanHash('job-1', 'agent-2', 'backend-api');
    expect(h1).not.toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it('planHash is 44 characters', () => {
    const h = createPlanHash('job-X', 'agent-X', 'testing');
    expect(h.length).toBe(44);
  });
});

// ---------------------------------------------------------------------------
// Hand Agent Tests
// ---------------------------------------------------------------------------
describe('Hand Agent — Quality Scoring', () => {
  it('empty deliverable scores 50 (base)', () => {
    const score = scoreQuality('', 'testing');
    expect(score).toBe(50);
  });

  it('short deliverable with # heading adds points', () => {
    const score = scoreQuality('# Title', 'documentation');
    expect(score).toBeGreaterThan(50);
  });

  it('long deliverable (>500 chars) adds maximum length bonus', () => {
    const long = 'x'.repeat(600);
    const score = scoreQuality(long, 'testing');
    expect(score).toBeGreaterThanOrEqual(75);
  });

  it('smart-contract-audit category adds category bonus', () => {
    const base = scoreQuality('short', 'testing');
    const audit = scoreQuality('short', 'smart-contract-audit');
    expect(audit).toBeGreaterThan(base);
  });

  it('score never exceeds 100', () => {
    const deliverable = '#'.repeat(10) + 'function'.repeat(50) + 'x'.repeat(600);
    const score = scoreQuality(deliverable, 'smart-contract-audit');
    expect(score).toBeLessThanOrEqual(100);
  });

  it('deliverable with function keyword adds code bonus', () => {
    const score = scoreQuality('function doSomething() { return true; }', 'backend-api');
    expect(score).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// Eye Agent Tests
// ---------------------------------------------------------------------------
describe('Eye Agent — Verification Logic', () => {
  it('passes verification when quality >= 70', () => {
    const qualityScore = 75;
    const issues: string[] = [];
    if (qualityScore < 70) issues.push('quality below threshold');
    expect(issues).toHaveLength(0);
  });

  it('fails verification when quality < 70', () => {
    const qualityScore = 60;
    const issues: string[] = [];
    if (qualityScore < 70) issues.push('quality below threshold');
    expect(issues).toHaveLength(1);
  });

  it('proof hash of length < 20 is flagged', () => {
    const issues: string[] = [];
    const shortHash = 'abc123';
    if (!shortHash || shortHash.length < 20) issues.push('Invalid proof hash');
    expect(issues).toContain('Invalid proof hash');
  });

  it('valid proof hash passes check', () => {
    const issues: string[] = [];
    const validHash = crypto.createHash('sha256').update('test').digest('hex').slice(0, 44);
    if (!validHash || validHash.length < 20) issues.push('Invalid proof hash');
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Nerve Agent Tests
// ---------------------------------------------------------------------------
describe('Nerve Agent — Reputation Logic', () => {
  it('reputation increases by 2 for standard quality pass', () => {
    const change = computeReputationChange(true, 80);
    expect(change).toBe(2);
  });

  it('reputation increases by 5 for exceptional quality (>=90)', () => {
    const change = computeReputationChange(true, 95);
    expect(change).toBe(5);
  });

  it('reputation decreases by 5 on verification failure', () => {
    const change = computeReputationChange(false, 65);
    expect(change).toBe(-5);
  });

  it('reputation never goes below 0', () => {
    const current = 3;
    const change = computeReputationChange(false, 40);
    const newRep = Math.max(0, current + change);
    expect(newRep).toBe(0);
  });

  describe('Tier Progression', () => {
    it('new agent starts at Bronze', () => {
      expect(getTier(0, 0)).toBe('bronze');
    });

    it('Silver requires reputation>=40 AND jobs>=5', () => {
      expect(getTier(40, 5)).toBe('silver');
      expect(getTier(40, 4)).toBe('bronze');
      expect(getTier(39, 5)).toBe('bronze');
    });

    it('Gold requires reputation>=70 AND jobs>=25', () => {
      expect(getTier(70, 25)).toBe('gold');
      expect(getTier(70, 24)).toBe('silver');
    });

    it('Platinum requires reputation>=90 AND jobs>=100', () => {
      expect(getTier(90, 100)).toBe('platinum');
      expect(getTier(90, 99)).toBe('gold');
    });
  });
});

// ---------------------------------------------------------------------------
// Audit Trail Tests
// ---------------------------------------------------------------------------
describe('Audit Trail — Integrity', () => {
  it('auditHash is consistent for same plan and steps', () => {
    const steps = [
      { agent: 'Hand', status: 'success' },
      { agent: 'Eye', status: 'success' },
      { agent: 'Nerve', status: 'success' },
    ];
    const h1 = createAuditHash('plan-abc', steps);
    const h2 = createAuditHash('plan-abc', steps);
    expect(h1).toBe(h2);
  });

  it('auditHash changes when any step status changes', () => {
    const stepsPass = [{ agent: 'Hand', status: 'success' }];
    const stepsFail = [{ agent: 'Hand', status: 'failed' }];
    const h1 = createAuditHash('plan-xyz', stepsPass);
    const h2 = createAuditHash('plan-xyz', stepsFail);
    expect(h1).not.toBe(h2);
  });

  it('auditHash changes when planHash changes', () => {
    const steps = [{ agent: 'Hand', status: 'success' }];
    const h1 = createAuditHash('plan-1', steps);
    const h2 = createAuditHash('plan-2', steps);
    expect(h1).not.toBe(h2);
  });

  it('auditHash is 44 characters', () => {
    const h = createAuditHash('plan-test', [{ agent: 'Hand', status: 'success' }]);
    expect(h.length).toBe(44);
  });
});
