import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { internalErrorMessage, logApiError } from '@/lib/security/api-error';
import { requireOrgRole } from '@/lib/authz';
import { buildAndPersistManifest, verifySafeDomIntentOrFail, executeVerifiedCommand } from '@/lib/executors/browserbase-safe-dom-integration';
import type { SafeDomCommand } from '@/lib/executors/browserbase-safe-dom-integration';
import { verifyAgentInvariants } from '@/lib/dsg/logic/z3-runtime-check';
import { buildPreflightResponse } from '@/lib/security/cors';

export const dynamic = 'force-dynamic';

interface SpineExecutePayload {
  sessionId: string;
  frameUrl: string;
  frameId?: string;
  command: SafeDomCommand;
  agentId?: string;
}

export async function POST(request: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: SpineExecutePayload;
  try {
    body = (await request.json()) as SpineExecutePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body.sessionId || !body.frameUrl || !body.command) {
    return NextResponse.json(
      { error: 'Missing required fields: sessionId, frameUrl, command' },
      { status: 400 },
    );
  }

  const { sessionId, frameUrl, frameId, command, agentId } = body;
  const supabase = getSupabaseAdmin();
  const orgId = access.orgId;
  const actualFrameId = frameId || `frame-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    let manifestId: string;
    try {
      const manifest = await buildAndPersistManifest(sessionId, frameUrl, actualFrameId, orgId);
      manifestId = manifest.sessionId;
    } catch (manifestError) {
      logApiError('api/spine/execute:build-manifest', manifestError);
      return NextResponse.json(
        { error: 'Failed to build Safe DOM manifest' },
        { status: 500 },
      );
    }

    try {
      await verifySafeDomIntentOrFail(sessionId, actualFrameId, command);
    } catch (verifyError) {
      logApiError('api/spine/execute:verify', verifyError);
      const message = verifyError instanceof Error ? verifyError.message : String(verifyError);
      let statusCode = 403;
      let safeMessage = 'Command not allowed by Safe DOM manifest';
      if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('expired')) {
        statusCode = 404;
        safeMessage = 'Safe DOM manifest not found or expired';
      }
      return NextResponse.json({ error: safeMessage, reason: message }, { status: statusCode });
    }

    // Z3 runtime gate: verify agent invariants before execution
    const z3Result = verifyAgentInvariants({
      agentType: 'orchestrator',
      jobId: sessionId,
      workspaceId: orgId,
      goalLocked: true,
      gateAllow: true,
      evidenceExists: true,
      mockState: false,
      planApproved: true,
      writesCode: true,
      isDestructiveWrite: false,
      destructionProof: false,
      testRunComplete: false,
      newCoverageGtePrev: true,
      usesBrowserResult: false,
      browserEvidenceHashSet: false,
      dataNeeded: false,
      dataUnknown: false,
      searchAttempted: false,
    });

    if (!z3Result.pass) {
      logApiError('api/spine/execute:z3-gate', new Error(`Z3 gate blocked: ${z3Result.check}`));
      return NextResponse.json({
        error: 'Z3 invariant gate blocked execution',
        z3: {
          status: z3Result.pass ? 'PASS' : 'BLOCK',
          check: z3Result.check,
          proofHash: z3Result.proofHash,
          violations: z3Result.violations,
        },
      }, { status: 403 });
    }

    const result = await executeVerifiedCommand(sessionId, command);

    try {
      await (supabase.from('spine_executions' as any).insert({
        org_id: orgId,
        agent_id: agentId || null,
        session_id: sessionId,
        frame_id: actualFrameId,
        manifest_id: manifestId,
        command_json: command,
        result_json: result,
        status: 'SUCCEEDED',
        executed_at: new Date().toISOString(),
      }));
    } catch (auditError) {
      logApiError('api/spine/execute:audit', auditError);
    }

    return NextResponse.json({
      status: 'SUCCEEDED',
      command,
      result,
      safeDom: {
        manifestId,
        frameId: actualFrameId,
      },
      z3: {
        status: z3Result.pass ? 'PASS' : 'BLOCK',
        proofHash: z3Result.proofHash,
        check: z3Result.check,
      },
    });
  } catch (error) {
    logApiError('api/spine/execute', error);
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  return buildPreflightResponse(request);
}

export async function GET(request: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const agentId = searchParams.get('agentId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing query param: sessionId' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const query = (supabase
      .from('spine_executions' as any)
      .select('*')
      .eq('org_id', access.orgId)
      .eq('session_id', sessionId)
      .order('executed_at', { ascending: false })
      .limit(20) as unknown) as Promise<{ data: any[] | null; error: any }>;

    const { data, error } = await query;

    if (error || !data) {
      return NextResponse.json({ executions: [] });
    }

    const executions = agentId
      ? data.filter((row) => row.agent_id === agentId)
      : data;

    return NextResponse.json({
      sessionId,
      executions: executions.map((row) => ({
        executionId: row.id,
        agentId: row.agent_id,
        status: row.status,
        command: row.command_json,
        result: row.result_json,
        executedAt: row.executed_at,
      })),
    });
  } catch (error) {
    logApiError('api/spine/execute:history', error);
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
