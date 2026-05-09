import { NextResponse } from 'next/server';
import { sha256, truthBoundary, userBenefitGate, verify } from '@/lib/dsg/app-builder/agent-runtime/decision-frame';
import { evaluateCommandGate, evaluatePathGate, evaluateSecretBoundary, makeAgentBranchName } from '@/lib/dsg/app-builder/agent-runtime/sandbox-gates';
import { getAppBuilderRequestContext } from '@/lib/dsg/server/app-builder/context';
import { recordAppBuilderToolAudit } from '@/lib/dsg/server/app-builder/repository';

type ExecutorInput = { jobId?: string; goal?: string; appId?: string; dryRun?: boolean };

type PlannedFile = { path: string; bytes: number };

function fail(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : 'PR_EXECUTOR_FAILED';
  return NextResponse.json({ ok: false, error: { code: message, message } }, { status: message.startsWith('DSG_') ? 401 : status });
}

function safeId(value: string, fallback: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || fallback;
}

function buildPlannedFiles(appId: string, goal: string): PlannedFile[] {
  const routeCode = `Generated app route for ${appId}: ${goal}`;
  const apiCode = `Generated app API for ${appId}`;
  const migrationCode = `Generated database migration for ${appId}`;
  const runbookCode = `Generated runbook for ${appId}`;
  return [
    { path: `app/generated-apps/${appId}/page.tsx`, bytes: routeCode.length },
    { path: `app/api/generated-apps/${appId}/items/route.ts`, bytes: apiCode.length },
    { path: `supabase/migrations/00000000000000_create_generated_app_items_${appId.slice(0, 12)}.sql`, bytes: migrationCode.length },
    { path: `docs/dsg-generated-apps/${appId}.md`, bytes: runbookCode.length },
  ];
}

export async function POST(req: Request) {
  try {
    const input = (await req.json().catch(() => ({}))) as ExecutorInput;
    const goal = String(input.goal || '').trim();
    const jobId = safeId(String(input.jobId || 'agent-pr'), 'agent-pr');
    const appId = safeId(String(input.appId || jobId), 'generated-app');
    const dryRun = input.dryRun !== false;

    if (!goal) throw new Error('APP_BUILDER_GOAL_REQUIRED');

    const fileWrites = buildPlannedFiles(appId, goal);
    const paths = fileWrites.map((file) => file.path);
    const commands = ['npm run dsg:typecheck', 'npm run build:termux'];
    const inputHash = sha256(JSON.stringify({ goal, jobId, appId, paths, commands, dryRun }));
    const verified = verify({ goal, jobId, appId, paths, commands }, ['sandbox_pr_executor_request']);
    const pathGate = evaluatePathGate(paths);
    const commandGate = evaluateCommandGate(commands);
    const secretGate = evaluateSecretBoundary(JSON.stringify({ goal, paths }));
    const benefit = userBenefitGate({
      userBenefit: 'User sees the exact files, commands, branch name, gates, and next action before any source write.',
      easier: true,
      tangibleOutput: 'gated dry-run PR execution plan',
      nextAction: 'Review the plan, run deterministic checks, then enable a repository write worker outside the serverless request path.',
    });
    const boundary = truthBoundary({ verified: verified.verified, containsSecret: !secretGate.allowed, containsProductionClaim: false, containsLicenseRisk: false });
    const gatesOk = pathGate.allowed && commandGate.allowed && secretGate.allowed && benefit.ok && boundary.ok;
    const branchName = makeAgentBranchName(jobId);

    const result = {
      ok: gatesOk,
      claimStatus: gatesOk ? 'PR_EXECUTOR_DRY_RUN_READY' : 'PR_EXECUTOR_BLOCKED',
      jobId,
      appId,
      goal,
      branchName,
      paths,
      commands,
      inputHash,
      pathGate,
      commandGate,
      secretGate,
      benefit,
      truthBoundary: boundary,
      fileWrites,
      nextActions: gatesOk
        ? ['Review dry-run output', 'Run npm run dsg:typecheck', 'Run npm run build:termux', 'Use a dedicated write worker to open the draft PR']
        : ['Remove blocked paths, commands, or secret-like text', 'Run the dry-run again'],
      productionReadyClaim: false,
    };

    const resultHash = sha256(JSON.stringify(result));
    const ctx = await getAppBuilderRequestContext(req, 'job:control');
    await recordAppBuilderToolAudit({
      ctx,
      jobId,
      toolName: 'dsg.app_builder.pr_executor',
      outcome: gatesOk ? 'DRY_RUN' : 'BLOCK',
      evidenceRefs: [resultHash, inputHash],
      auditEvent: result,
    }).catch(() => null);

    return NextResponse.json({ ...result, planHash: resultHash, resultHash }, { status: gatesOk ? 200 : 403 });
  } catch (error) {
    return fail(error);
  }
}
