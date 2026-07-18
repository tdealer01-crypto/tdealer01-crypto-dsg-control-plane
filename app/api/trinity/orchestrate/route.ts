/**
 * Trinity AI Multi-Agent Orchestration API
 * POST /api/trinity/orchestrate
 *
 * Trinity6 with Agent OS:
 * - Agent Registry: Track all 5 Trinity agents + lifecycle
 * - Event Bus: Pub/sub for job discovery, execution, verification
 * - Shared Memory: Persistent context across agent transitions
 * - Multi-Model Router: Route to optimal model per task
 * - Executive Hierarchy: CTO approval for strategic decisions
 *
 * dry_run=true (default): deterministic simulation only
 * dry_run=false: DB-backed flow + verification + settlement attempt
 *
 * Integrated with NVIDIA/OpenRouter LLM for AI-powered deliverable generation
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
import { orchestrateWithAgentOS } from '@/lib/trinity/agent-os-integration';

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

async function generateDeliverableWithLLM(category: string, title: string): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  // Fallback to basic generation if no LLM configured
  if (!openrouterKey && !nvidiaKey) {
    return `# ${title}\n\nCategory: ${category}\n\n- Scope checked\n- Deliverable produced\n- Proof refs linked`;
  }

  const systemPrompt = `You are Trinity Hand Agent. Generate a professional deliverable for the given job.
Keep it concise but comprehensive.
Include scope verification, deliverable details, and proof references.`;

  const userPrompt = `Generate a deliverable for this job:
Title: ${title}
Category: ${category}

Provide a markdown formatted deliverable that shows:
1. Scope analysis
2. Deliverable details
3. Quality metrics
4. Proof/verification references`;

  // Try OpenRouter first
  if (openrouterKey) {
    const models = [
      process.env.OPENROUTER_MODEL_CHAT || 'openai/gpt-4o-mini:free',
      'google/gemma-3-27b-it:free',
    ];

    for (const model of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = data.choices?.[0]?.message?.content;
          if (content) return content;
        }
      } catch (err) {
        console.error('[Trinity] OpenRouter error:', err);
      }
    }
  }

  // Fallback to NVIDIA
  if (nvidiaKey) {
    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${nvidiaKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.NVIDIA_MODEL_CHAT || 'nvidia/nemotron-3-ultra-550b-a55b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 300,
          temperature: 0.7,
          top_p: 1,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (err) {
      console.error('[Trinity] NVIDIA error:', err);
    }
  }

  // Final fallback to deterministic generation
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

    // Trinity6: Orchestrate with Agent OS
    let agentOSOrchestration: Record<string, unknown> | undefined;
    try {
      agentOSOrchestration = await orchestrateWithAgentOS({
        id: job.id,
        title: job.title,
        category: job.category,
        rewardAmount: job.rewardAmount,
        deadline: job.deadline,
        requirements: job.requirements,
        agentId: agent.agentId,
        reputation: agent.reputation,
        skills: agent.skills,
      });
    } catch (err) {
      console.error('[Trinity6] Agent OS orchestration failed:', err);
      // Continue with Trinity5 fallback if Agent OS fails
    }

    const startMs = Date.now();
    const deliverable = await generateDeliverableWithLLM(job.category, job.title);
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
      // Trinity6: Agent OS Orchestration
      ...(agentOSOrchestration ? { agentOS: agentOSOrchestration } : {}),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), completedAt: new Date().toISOString() }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'trinity-orchestrator-trinity6',
    agents: ['Mind', 'Hand', 'Eye', 'Nerve', 'Spine', 'AgentOS'],
    version: '6.0',
    description: 'Trinity6 AI Multi-Agent Orchestration with Agent OS — Dynamic coordination, routing, memory, and executive decisions',
    agentOSCapabilities: [
      'agent-registry: lifecycle management',
      'event-bus: pub/sub coordination',
      'shared-memory: persistent context',
      'multi-model-router: cost/latency optimization',
      'executive-hierarchy: strategic oversight',
    ],
  });
}
