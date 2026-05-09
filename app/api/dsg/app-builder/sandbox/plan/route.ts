import { NextResponse } from 'next/server';
import { sha256, truthBoundary, userBenefitGate, verify } from '@/lib/dsg/app-builder/agent-runtime/decision-frame';
import { evaluateCommandGate, evaluatePathGate, evaluateSecretBoundary, makeAgentBranchName } from '@/lib/dsg/app-builder/agent-runtime/sandbox-gates';
import { getAppBuilderRequestContext } from '@/lib/dsg/server/app-builder/context';
import { recordAppBuilderToolAudit } from '@/lib/dsg/server/app-builder/repository';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : 'SANDBOX_PLAN_FAILED';
  const status = message.startsWith('DSG_') ? 401 : 400;
  return NextResponse.json({ ok: false, error: { code: message, message } }, { status });
}

function inferWritePaths(goal: string, jobId: string) {
  const appId = jobId.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'generated-app';
  return [
    `app/generated-apps/${appId}/page.tsx`,
    `app/api/generated-apps/${appId}/items/route.ts`,
    `supabase/migrations/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_create_generated_app_items_${appId.slice(0, 12)}.sql`,
    `docs/dsg-generated-apps/${appId}.md`,
  ];
}

export async function POST(req: Request) {
  try {
    const body = asRecord(await req.json().catch(() => null));
    const goal = String(body.goal || '').trim();
    const jobId = String(body.jobId || 'adhoc-sandbox').trim();
    const commands = stringArray(body.commands).length ? stringArray(body.commands) : ['npm run dsg:typecheck', 'npm run build:termux'];
    const requestedPaths = stringArray(body.paths).length ? stringArray(body.paths) : inferWritePaths(goal, jobId);

    if (!goal) throw new Error('APP_BUILDER_GOAL_REQUIRED');

    const ctx = await getAppBuilderRequestContext(req, 'job:control');
    const serialized = JSON.stringify({ goal, jobId, requestedPaths, commands });
    const input = verify({ goal, jobId, requestedPaths, commands }, ['ui_request', 'sandbox_preview_only']);
    const secretGate = evaluateSecretBoundary(serialized);
    const pathGate = evaluatePathGate(requestedPaths);
    const commandGate = evaluateCommandGate(commands);
    const branchName = makeAgentBranchName(jobId);
    const boundary = truthBoundary({ verified: input.verified, containsSecret: !secretGate.allowed, containsProductionClaim: false, containsLicenseRisk: false });
    const benefit = userBenefitGate({
      userBenefit: 'User can see exactly which files and commands the agent wants before any write or PR action.',
      easier: true,
      tangibleOutput: 'sandbox branch plan, allowed file list, command gate, secret gate, and next actions',
      nextAction: pathGate.allowed && commandGate.allowed && secretGate.allowed ? 'Approve sandbox PR executor after review.' : 'Fix blocked paths, commands, or secret-like content first.',
    });

    const allowed = pathGate.allowed && commandGate.allowed && secretGate.allowed && boundary.ok && benefit.ok;
    const plan = {
      ok: allowed,
      jobId,
      goal,
      branchName,
      inputHash: input.hash,
      claimStatus: allowed ? 'SANDBOX_PLAN_READY' : 'SANDBOX_PLAN_BLOCKED',
      fileWrites: requestedPaths.map((path) => ({ path, mode: 'create_or_update', gate: pathGate.status })),
      commands: commands.map((command) => ({ command, gate: commandGate.status, execution: 'manual_or_sandbox_runner_only' })),
      gates: { secretGate, pathGate, commandGate, benefit, truthBoundary: boundary },
      nextActions: allowed
        ? ['Review generated file list', 'Run sandbox executor only on a branch', 'Open PR after build/test evidence exists']
        : ['Remove blocked path/command/secret-like input', 'Re-run sandbox plan', 'Keep production claim blocked'],
      productionReadyClaim: false,
    };

    const planHash = sha256(JSON.stringify(plan));
    await recordAppBuilderToolAudit({
      ctx,
      jobId,
      toolName: 'dsg.app_builder.sandbox_plan',
      outcome: allowed ? 'PASS' : 'BLOCK',
      evidenceRefs: [planHash, input.hash],
      auditEvent: plan,
    }).catch(() => null);

    return NextResponse.json({ ...plan, planHash });
  } catch (error) {
    return fail(error);
  }
}
