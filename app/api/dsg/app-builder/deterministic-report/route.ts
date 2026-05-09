import { NextResponse } from 'next/server';
import { createEvidenceReport } from '@/lib/dsg/app-builder/deterministic/evidence-report';
import { getAppBuilderRequestContext } from '@/lib/dsg/server/app-builder/context';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function bool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : 'APP_BUILDER_DETERMINISTIC_REPORT_FAILED';
  return NextResponse.json({ ok: false, error: { code: message, message } }, { status: message.startsWith('DSG_') ? 401 : 400 });
}

export async function POST(req: Request) {
  try {
    await getAppBuilderRequestContext(req, 'evidence:write');
    const body = asRecord(await req.json().catch(() => null));
    const jobId = String(body.jobId || 'local-app-builder').trim();
    const goal = String(body.goal || 'Verify DSG App Builder local branch').trim();
    const branchName = String(body.branchName || 'dsg-app-builder-auth-rbac-hardening').trim();
    const filePaths = stringArray(body.filePaths).length ? stringArray(body.filePaths) : [
      'lib/dsg/app-builder/deterministic/control-kernel.ts',
      'lib/dsg/app-builder/deterministic/lane-orchestrator.ts',
      'lib/dsg/app-builder/deterministic/sandbox-contract.ts',
      'lib/dsg/app-builder/deterministic/workflow-state.ts',
      'lib/dsg/app-builder/deterministic/evidence-report.ts',
      'scripts/dsg-control-kernel-smoke.mjs',
      'scripts/dsg-app-builder-deterministic-suite.mjs',
    ];

    const laneState = asRecord(body.laneState);
    const report = createEvidenceReport({
      jobId,
      goal,
      branchName,
      filePaths,
      laneState: {
        goalLocked: bool(laneState.goalLocked ?? true),
        contextReady: bool(laneState.contextReady ?? true),
        planReady: bool(laneState.planReady ?? true),
        approvalRecorded: bool(laneState.approvalRecorded ?? true),
        sandboxReady: bool(laneState.sandboxReady ?? true),
        branchOrPrCreated: bool(laneState.branchOrPrCreated ?? true),
        typecheckPassed: bool(laneState.typecheckPassed ?? true),
        buildPassed: bool(laneState.buildPassed ?? true),
        previewLoaded: bool(laneState.previewLoaded ?? false),
        rbacChecked: bool(laneState.rbacChecked ?? true),
        protectedValueScanPassed: bool(laneState.protectedValueScanPassed ?? true),
        flowProofPassed: bool(laneState.flowProofPassed ?? false),
        uiReady: bool(laneState.uiReady ?? false),
      },
    });

    return NextResponse.json({ ok: true, data: report });
  } catch (error) {
    return fail(error);
  }
}
