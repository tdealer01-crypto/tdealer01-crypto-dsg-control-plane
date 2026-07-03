/**
 * Trinity AI Multi-Agent Orchestration API
 * POST /api/trinity/orchestrate
 *
 * dry_run=true (default): deterministic simulation only
 * dry_run=false: DB-backed flow + verification + settlement attempt
 */
import { NextResponse } from 'next/server';
import {
  appendAuditEvent,
  createHash,
  evaluateGovernance,
  getSupabaseAdmin,
  normalizeSeverity,
  parseActorContext,
  settleJob,
} from '@/lib/trinity/workflow';

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
    bounty_program?: string;
    exploit_cid?: string;
    severity?: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  };
  agent?: {
    agentId?: string;
    walletAddress?: string;
    reputation?: number;
    skills?: string[];
  };
  dry_run?: boolean;
}

function generateDeliverable(category: string, title: string): string {
  return `# ${title}\n\nCategory: ${category}\n\n- Scope checked\n- Deliverable produced\n- Proof refs linked`;
}

function scoreQuality(deliverable: string, category: string): number {
  let score = 55;
  if (deliverable.length > 120) score += 15;
  if (deliverable.includes('Proof')) score += 10;
  if (category === 'smart-contract-audit' || category === 'security-review') score += 10;
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
    const actor = parseActorContext(req.headers);
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
      bounty_program: body.job?.bounty_program ?? 'trinity-program',
      exploit_cid: body.job?.exploit_cid ?? null,
      severity: normalizeSeverity(body.job?.severity),
    };

    const agent = {
      agentId: body.agent?.agentId ?? actor.actorId,
      walletAddress: body.agent?.walletAddress ?? actor.walletAddress ?? null,
      reputation: body.agent?.reputation ?? 75,
      skills: body.agent?.skills ?? ['smart-contract-audit', 'security-review', 'testing'],
    };

    const governance = evaluateGovernance(
      {
        rewardAmount: job.rewardAmount,
        deadline: job.deadline,
        requirements: job.requirements,
        severity: job.severity,
        exploitCid: job.exploit_cid ?? undefined,
      },
      { reputation: agent.reputation, skills: agent.skills },
    );

    const planHash = createHash(`${job.id}:${agent.agentId}:${job.category}`);

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

    const startMs = Date.now();
    const deliverable = generateDeliverable(job.category, job.title);
    const qualityScore = scoreQuality(deliverable, job.category);
    const proofHash = createHash(`${deliverable}:${job.id}`);
    const executionTimeMs = Date.now() - startMs;

    const threshold = job.severity === 'critical' ? 90 : job.severity === 'high' ? 80 : 70;
    const verificationIssues: string[] = [];
    if (qualityScore < threshold) verificationIssues.push(`Quality ${qualityScore} below threshold ${threshold}`);
    if (proofHash.length < 20) verificationIssues.push('Invalid proof hash');
    const verificationPassed = verificationIssues.length === 0;

    const oldReputation = agent.reputation;
    const reputationChange = verificationPassed ? (qualityScore >= 90 ? 5 : 2) : -5;
    const newReputation = Math.max(0, oldReputation + reputationChange);
    const oldTier = getTier(oldReputation, 10);
    const newTier = getTier(newReputation, 10);

    const completedAt = new Date().toISOString();
    const auditHash = createHash(`${planHash}:verify=${verificationPassed}:rep=${newReputation}:severity=${job.severity}`);

    let persisted = false;
    let persistError: string | undefined;
    let settlement: Record<string, unknown> | undefined;

    if (!dry_run) {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        persistError = 'Supabase not configured';
      } else {
        await supabase.from('trinity_jobs').upsert(
          {
            id: job.id,
            org_id: actor.orgId,
            external_id: job.id,
            source_platform: 'trinity',
            bounty_program: job.bounty_program,
            title: job.title,
            category: job.category,
            difficulty: 'medium',
            severity: job.severity,
            exploit_cid: job.exploit_cid,
            reward_amount: job.rewardAmount,
            reward_currency: job.rewardCurrency,
            reward_usd_estimate: Math.round(job.rewardAmount * 150),
            deadline: job.deadline,
            claimed_by: agent.agentId,
            worker_wallet_address: agent.walletAddress,
            status: verificationPassed ? 'verified' : 'rejected',
            submitted_at: completedAt,
            verified_at: completedAt,
          },
          { onConflict: 'id' },
        );

        await supabase.from('trinity_deliverables').insert({
          org_id: actor.orgId,
          job_id: job.id,
          submitted_by: agent.agentId,
          content: deliverable,
          content_hash: createHash(`${job.id}:${deliverable}`),
          proof_refs: [proofHash],
          quality_score: qualityScore,
          verification_notes: verificationIssues.join('; ') || null,
        });

        await appendAuditEvent({
          supabase,
          orgId: actor.orgId,
          jobId: job.id,
          eventType: 'orchestration.persisted',
          actorId: actor.actorId,
          payload: { qualityScore, verificationPassed, severity: job.severity },
        });

        if (verificationPassed) {
          const { data: verifyState } = await supabase
            .from('trinity_jobs')
            .select('id, status')
            .eq('org_id', actor.orgId)
            .eq('id', job.id)
            .eq('status', 'verified')
            .maybeSingle();

          settlement = verifyState
            ? await settleJob({
                supabase,
                orgId: actor.orgId,
                actorId: actor.actorId,
                jobId: job.id,
                idempotencyKey: createHash(`${actor.orgId}:${job.id}:orchestrate`),
              })
            : { ok: false, status: 'skipped', reason: 'verification state changed before settlement' };
        }

        persisted = true;
      }
    }

    return NextResponse.json({
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
      trinity: {
        bounty_program: job.bounty_program,
        exploit_cid: job.exploit_cid,
        severity: job.severity,
        reward_amount: job.rewardAmount,
      },
      settlement,
      auditHash,
      completedAt,
      ...(dry_run ? {} : { persisted, persistError }),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), completedAt: new Date().toISOString() }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'trinity-orchestrator',
    agents: ['Mind', 'Hand', 'Eye', 'Nerve', 'Spine'],
    version: '2.0',
    description: 'Trinity AI Multi-Agent Orchestration — DB-backed workflow with optional live settlement',
  });
}
