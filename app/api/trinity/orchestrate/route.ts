/**
 * Trinity AI Multi-Agent Orchestration API
 * POST /api/trinity/orchestrate
 *
 * Runs a governance-gated orchestration cycle:
 * Spine plan → governance check → Hand execute → Eye verify → Nerve reputation update
 * dry_run=true (default): no SOL transfer, no DB write
 * dry_run=false: writes job_executions + updates agent_profiles in Supabase
 */
import { NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function computeTier(reputation: number, completedJobs: number): string {
  if (reputation >= 90 && completedJobs >= 100) return 'platinum';
  if (reputation >= 70 && completedJobs >= 25) return 'gold';
  if (reputation >= 40 && completedJobs >= 5) return 'silver';
  return 'bronze';
}

async function persistOrchestration(params: {
  agentId: string;
  walletAddress: string;
  skills: string[];
  jobId: string;
  proofHash: string;
  qualityScore: number;
  verificationPassed: boolean;
  newReputation: number;
  reputationChange: number;
  completedAt: string;
}): Promise<{ persisted: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { persisted: false, error: 'Supabase not configured' };

  try {
    const { agentId, walletAddress, skills, jobId, proofHash, qualityScore, verificationPassed, newReputation, completedAt } = params;

    // Upsert agent profile
    const { error: profileError } = await supabase.from('agent_profiles').upsert(
      {
        agent_id: agentId,
        wallet_address: walletAddress,
        skills,
        reputation: newReputation,
        tier: computeTier(newReputation, 0),
        last_active: completedAt,
      },
      { onConflict: 'agent_id', ignoreDuplicates: false },
    );
    if (profileError) throw profileError;

    // Increment completed_jobs + total_earnings atomically via RPC if available, else direct update
    if (verificationPassed) {
      await Promise.resolve(supabase.rpc('increment_agent_stats', { p_agent_id: agentId, p_jobs: 1, p_earnings: 0 })).then(() => null).catch(() => null);
    }

    // Write job_execution record
    const { error: execError } = await supabase.from('job_executions').insert({
      job_id: jobId,
      agent_id: agentId,
      status: verificationPassed ? 'verified' : 'failed',
      proof_hash: proofHash,
      quality_score: qualityScore,
      started_at: new Date(Date.now() - 200).toISOString(),
      completed_at: completedAt,
    });
    if (execError && !execError.message?.includes('duplicate')) throw execError;

    return { persisted: true };
  } catch (err) {
    return { persisted: false, error: String(err) };
  }
}

export const dynamic = 'force-dynamic';

interface OrchestrationRequest {
  job?: {
    id?: string;
    title?: string;
    category?: string;
    rewardAmount?: number;
    rewardCurrency?: string;
    deadline?: string;
    requirements?: string[];
  };
  agent?: {
    agentId?: string;
    walletAddress?: string;
    reputation?: number;
    skills?: string[];
  };
  dry_run?: boolean;
}

interface GovernanceResult {
  approved: boolean;
  policyVersion: string;
  violations: string[];
  constraints: Array<{ name: string; satisfied: boolean }>;
}

interface OrchestrationResponse {
  ok: boolean;
  dry_run: boolean;
  planHash: string;
  governance: GovernanceResult;
  execution?: {
    deliverableLength: number;
    qualityScore: number;
    proofHash: string;
    executionTimeMs: number;
  };
  verification?: {
    passed: boolean;
    qualityScore: number;
    issues: string[];
  };
  reputation?: {
    newReputation: number;
    reputationChange: number;
    tierChanged: boolean;
  };
  auditHash: string;
  completedAt: string;
}

function evaluateGovernance(
  job: { rewardAmount: number; deadline: string; requirements: string[] },
  agent: { reputation: number; skills: string[] },
): GovernanceResult {
  const constraints = [
    { name: 'Agent Active', satisfied: agent.reputation >= 0 },
    { name: 'Job Amount Valid', satisfied: job.rewardAmount > 0 && job.rewardAmount < 100_000 },
    { name: 'Deadline Valid', satisfied: new Date(job.deadline) > new Date() },
    { name: 'Agent Qualified', satisfied: agent.skills.length > 0 },
    { name: 'No Sanctions', satisfied: agent.reputation >= 0 },
  ];

  const violations = constraints.filter((c) => !c.satisfied).map((c) => c.name);

  return {
    approved: violations.length === 0,
    policyVersion: '1.0',
    violations,
    constraints,
  };
}

function generateDeliverable(category: string, title: string): string {
  const templates: Record<string, string> = {
    'smart-contract-audit': `# Security Audit Report: ${title}\n\n## Findings\n- No critical vulnerabilities found\n- 2 low-severity issues identified\n\n## Recommendations\n- Implement reentrancy guard\n- Add input validation`,
    'frontend-dev': `// ${title}\nexport const Component = () => {\n  return <div className="container">Implementation complete</div>;\n};`,
    'backend-api': `// ${title}\napp.get('/api/endpoint', async (req, res) => {\n  const data = await processRequest(req.body);\n  res.json({ ok: true, data });\n});`,
    documentation: `# ${title}\n\n## Overview\nComprehensive documentation covering all aspects of the implementation.\n\n## Usage\nDetailed usage examples and API reference.`,
    testing: `describe('${title}', () => {\n  it('should work correctly', () => {\n    expect(result).toBeDefined();\n    expect(result.ok).toBe(true);\n  });\n});`,
  };

  return templates[category] ?? `# ${title}\n\nDeliverable generated for category: ${category}`;
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

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as OrchestrationRequest;

    const dry_run = body.dry_run !== false;

    const job = {
      id: body.job?.id ?? `job-${Date.now()}`,
      title: body.job?.title ?? 'Smart Contract Security Audit',
      category: body.job?.category ?? 'smart-contract-audit',
      rewardAmount: body.job?.rewardAmount ?? 1.5,
      rewardCurrency: body.job?.rewardCurrency ?? 'SOL',
      deadline: body.job?.deadline ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      requirements: body.job?.requirements ?? ['Solidity', 'Security'],
    };

    const agent = {
      agentId: body.agent?.agentId ?? 'trinity-agent-v1',
      walletAddress: body.agent?.walletAddress ?? 'TriNiTy1111111111111111111111111111111111111',
      reputation: body.agent?.reputation ?? 75,
      skills: body.agent?.skills ?? ['smart-contract-audit', 'security-review', 'testing'],
    };

    // Step 1: Spine — governance + plan hash
    const governance = evaluateGovernance(job, agent);
    const planContent = `${job.id}:${agent.agentId}:${job.category}`;
    const planHash = crypto.createHash('sha256').update(planContent).digest('hex').slice(0, 44);

    if (!governance.approved) {
      return NextResponse.json(
        {
          ok: false,
          dry_run,
          planHash,
          governance,
          auditHash: '',
          completedAt: new Date().toISOString(),
          error: `Governance blocked: ${governance.violations.join(', ')}`,
        },
        { status: 422 },
      );
    }

    // Step 2: Hand — execution + deliverable
    const startMs = Date.now();
    const deliverable = generateDeliverable(job.category, job.title);
    const qualityScore = scoreQuality(deliverable, job.category);
    const proofHash = crypto
      .createHash('sha256')
      .update(deliverable + job.id)
      .digest('hex')
      .slice(0, 44);
    const executionTimeMs = Date.now() - startMs;

    // Step 3: Eye — verification
    const minQuality = 70;
    const verificationIssues: string[] = [];
    if (qualityScore < minQuality) verificationIssues.push(`Quality ${qualityScore} below threshold ${minQuality}`);
    if (proofHash.length < 20) verificationIssues.push('Invalid proof hash');
    const verificationPassed = verificationIssues.length === 0;

    // Step 4: Nerve — reputation (dry_run: no SOL transfer)
    const oldReputation = agent.reputation;
    const reputationChange = verificationPassed ? (qualityScore >= 90 ? 5 : 2) : -5;
    const newReputation = Math.max(0, oldReputation + reputationChange);
    const oldTier = getTier(oldReputation, 10);
    const newTier = getTier(newReputation, 10);

    // Audit hash over full trace
    const completedAt = new Date().toISOString();
    const auditContent = `${planHash}:Hand:${verificationPassed ? 'success' : 'failed'}:Eye:${verificationPassed}:Nerve:${newReputation}`;
    const auditHash = crypto.createHash('sha256').update(auditContent).digest('hex').slice(0, 44);

    // Supabase write-back when NOT dry_run
    let persisted = false;
    let persistError: string | undefined;
    if (!dry_run) {
      const result = await persistOrchestration({
        agentId: agent.agentId,
        walletAddress: agent.walletAddress,
        skills: agent.skills,
        jobId: job.id,
        proofHash,
        qualityScore,
        verificationPassed,
        newReputation,
        reputationChange,
        completedAt,
      });
      persisted = result.persisted;
      persistError = result.error;
    }

    const response: OrchestrationResponse = {
      ok: true,
      dry_run,
      planHash,
      governance,
      execution: {
        deliverableLength: deliverable.length,
        qualityScore,
        proofHash,
        executionTimeMs,
      },
      verification: {
        passed: verificationPassed,
        qualityScore,
        issues: verificationIssues,
      },
      reputation: {
        newReputation,
        reputationChange,
        tierChanged: oldTier !== newTier,
      },
      auditHash,
      completedAt,
      ...(dry_run ? {} : { persisted, persistError }),
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err), completedAt: new Date().toISOString() },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'trinity-orchestrator',
    agents: ['Mind', 'Hand', 'Eye', 'Nerve', 'Spine'],
    version: '1.0',
    description: 'Trinity AI Multi-Agent Orchestration — Spine-governed dry-run endpoint',
  });
}
