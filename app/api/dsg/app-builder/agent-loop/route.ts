import { NextResponse } from 'next/server';
import { verify, samadhi, kilesa, parami, userBenefitGate, truthBoundary, sha256 } from '@/lib/dsg/app-builder/agent-runtime/decision-frame';
import { getAppBuilderRequestContext } from '@/lib/dsg/server/app-builder/context';
import { recordAppBuilderToolAudit } from '@/lib/dsg/server/app-builder/repository';
import { createContextPack, ingestMemory, searchMemory } from '@/lib/dsg/server/memory/repository';
import type { DsgMemoryRequestContext } from '@/lib/dsg/server/memory/context';
import type { DsgMemoryEvent } from '@/lib/dsg/server/memory/types';

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : 'APP_BUILDER_AGENT_LOOP_FAILED';
  const status = message.startsWith('DSG_') ? 401 : 400;
  return NextResponse.json({ ok: false, error: { code: message, message } }, { status });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function memoryCtxFromVerifiedActor(input: {
  workspaceId: string;
  actorId: string;
  actorRole: string;
}): DsgMemoryRequestContext {
  return {
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    permissions: ['memory:read', 'memory:write'],
  };
}

function summarizeMemory(memories: DsgMemoryEvent[]) {
  return memories.slice(0, 8).map((memory) => ({
    id: memory.id,
    kind: memory.memoryKind,
    trust: memory.trustLevel,
    status: memory.status,
    summary: memory.normalizedSummary || memory.rawText.slice(0, 180),
  }));
}

export async function POST(req: Request) {
  try {
    const body = asRecord(await req.json().catch(() => null));
    const goal = String(body.goal || '').trim();
    const jobId = String(body.jobId || 'adhoc-agent-loop').trim();
    const phase = String(body.phase || 'planning').trim();
    const errorText = typeof body.errorText === 'string' ? body.errorText.trim() : '';
    const successCriteria = stringArray(body.successCriteria);
    const history = stringArray(body.history);

    if (!goal) throw new Error('APP_BUILDER_GOAL_REQUIRED');
    const appCtx = await getAppBuilderRequestContext(req, 'job:plan');
    const memoryCtx = memoryCtxFromVerifiedActor(appCtx);

    const target = samadhi('app-builder-agent', goal);
    const memories = await searchMemory(memoryCtx, { query: goal.slice(0, 80), jobId: body.jobId ? jobId : undefined, limit: 12 }).catch(() => []);
    const contextPack = await createContextPack(memoryCtx, {
      memories,
      scope: { purpose: phase === 'verification' ? 'verification' : 'planning', jobId, requireVerifiedEvidence: false },
    }).catch(() => null);

    const verifiedInput = verify({ goal, phase, successCriteria, errorText }, [
      `memory_count:${memories.length}`,
      contextPack ? `context_pack:${contextPack.id}` : 'context_pack:unavailable',
    ]);

    const riskFlags = [
      /secret|token|service_role|api[_-]?key/i.test(`${goal}\n${errorText}`) ? 'secret' : '',
      /production verified|certified|guaranteed/i.test(`${goal}\n${errorText}`) ? 'production_claim' : '',
    ].filter(Boolean);

    const risk = kilesa(goal, verifiedInput.verified, riskFlags);
    const stats = parami([...history, phase, memories.length ? 'memory_used' : 'memory_empty']);
    const benefit = userBenefitGate({
      userBenefit: 'User can turn a command into a governed plan with memory context, next action, and proof boundary.',
      easier: true,
      tangibleOutput: 'agent-loop decision, context pack, next actions, and audit memory entry',
      nextAction: risk.state === 'blocked' ? 'Remove blocked secret/claim input before execution.' : 'Run PRD, Plan, Handoff, then Engine preview/generate flow.',
    });
    const boundary = truthBoundary({
      verified: verifiedInput.verified,
      containsSecret: riskFlags.includes('secret'),
      containsProductionClaim: riskFlags.includes('production_claim'),
      containsLicenseRisk: false,
    });

    const nextActions = boundary.ok
      ? ['Generate PRD with memory context', 'Run Plan + Observer', 'Create approval handoff', 'Run engine preview', 'Write files only through sandbox/PR executor when available']
      : ['Stop execution', 'Redact secret or unsupported claim', 'Re-run agent loop after verification'];

    const decision = {
      ok: boundary.ok && risk.state !== 'blocked' && benefit.ok,
      jobId,
      phase,
      target,
      verifiedInput,
      risk,
      stats,
      benefit,
      truthBoundary: boundary,
      contextPack: contextPack ? {
        id: contextPack.id,
        contextHash: contextPack.contextHash,
        gateStatus: contextPack.gateStatus,
        gateReasons: contextPack.gateReasons,
        contextText: contextPack.contextText,
      } : null,
      memories: summarizeMemory(memories),
      nextActions,
      productionReadyClaim: false,
    };

    const rawText = JSON.stringify(decision, null, 2);
    const contentHash = sha256(rawText);
    await ingestMemory(memoryCtx, {
      jobId,
      sourceType: 'agent_step',
      memoryKind: boundary.ok ? 'decision' : 'risk',
      rawText,
      normalizedSummary: `Agent loop ${decision.ok ? 'PASS' : 'BLOCK_OR_REVIEW'} for ${phase}: ${goal.slice(0, 120)}`,
      trustLevel: 'observed',
      status: boundary.ok ? 'active' : 'conflicted',
      containsSecret: riskFlags.includes('secret'),
      containsProductionClaim: riskFlags.includes('production_claim'),
      contentHash,
      metadata: { phase, contextPackId: contextPack?.id || null },
    }).catch(() => null);

    await recordAppBuilderToolAudit({
      ctx: appCtx,
      jobId,
      toolName: 'dsg.app_builder.agent_loop',
      outcome: decision.ok ? 'PASS' : 'BLOCK_OR_REVIEW',
      evidenceRefs: [contentHash, contextPack?.contextHash].filter(Boolean) as string[],
      auditEvent: decision,
    }).catch(() => null);

    return NextResponse.json(decision);
  } catch (error) {
    return fail(error);
  }
}
