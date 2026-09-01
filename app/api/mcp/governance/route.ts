// ERROR_HANDLER_EXEMPT: MCP JSON-RPC protocol requires structured error responses.
import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { governAction, type GovernancePreflightInput } from '@/lib/dsg/governance-plugin';
import {
  validateStoredUnifiedMcpKey,
  type UnifiedAuthContext,
} from '@/lib/mcp/unified-auth';

export const dynamic = 'force-dynamic';

const TOOL_NAME = 'dsg.governance.preflight';
const TOOL = {
  name: TOOL_NAME,
  description:
    'Verify an existing agent action against an approved DSG plan. The organization owns Observe/Enforce mode; the agent cannot change it. Unsupported claims remain UNVERIFIED without blocking a plan-authorized action.',
  inputSchema: {
    type: 'object',
    properties: {
      eventId: { type: 'string' },
      planHash: { type: 'string', pattern: '^[0-9a-fA-F]{64}$' },
      agentId: { type: 'string' },
      sessionId: { type: 'string' },
      actionType: {
        type: 'string',
        enum: ['observe', 'read', 'write', 'delete', 'payment', 'deploy', 'admin'],
      },
      targetSystemId: { type: 'string' },
      operationName: { type: 'string' },
      riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      payloadHash: { type: 'string' },
      idempotencyKey: { type: 'string' },
      rollbackPlanId: { type: 'string' },
      evidenceManifestId: { type: 'string' },
      policySnapshotHash: { type: 'string' },
      claimedOutcome: { type: 'string' },
      evidenceRefs: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'eventId',
      'planHash',
      'agentId',
      'sessionId',
      'actionType',
      'targetSystemId',
      'operationName',
      'riskLevel',
    ],
    additionalProperties: false,
  },
} as const;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
};

function result(id: JsonRpcRequest['id'], value: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, result: value });
}

function error(id: JsonRpcRequest['id'], code: number, message: string) {
  return NextResponse.json(
    { jsonrpc: '2.0', id: id ?? null, error: { code, message } },
    { status: code === -32001 ? 401 : code === -32601 ? 404 : 400 },
  );
}

function toolResult(id: JsonRpcRequest['id'], value: unknown, isError = false) {
  return result(id, {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent:
      value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : { value },
    ...(isError ? { isError: true } : {}),
  });
}

async function resolveAuth(
  request: NextRequest,
): Promise<UnifiedAuthContext | NextResponse> {
  const stored = await validateStoredUnifiedMcpKey(request, TOOL_NAME);
  if (stored.presented) {
    if (stored.valid === false) return error(null, -32001, stored.reason);
    return stored.context;
  }

  const access = await requireOrgRole(['operator', 'org_admin'], request);
  if (!access.ok) return error(null, -32001, access.error ?? 'Unauthorized');
  return {
    source: 'session',
    actorId: access.userId,
    orgId: access.orgId,
    roles: access.grantedRoles,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    server: 'dsg-governance-plugin',
    version: '1.0.0',
    transport: 'MCP JSON-RPC over HTTP',
    tools: [TOOL],
    modes: ['observe', 'enforce'],
    modeAuthority: 'DSG organization setting; callers cannot override mode',
    statuses: ['PASS', 'BLOCKED', 'WAITING_PERMISSION', 'UNVERIFIED'],
    truthBoundary:
      'Observe never blocks. Enforce blocks out-of-plan or unauthorized execution. UNVERIFIED blocks unsupported claims, not plan-authorized actions.',
  });
}

export async function POST(request: NextRequest) {
  const rpc = (await request.json().catch(() => null)) as JsonRpcRequest | null;
  if (!rpc || rpc.jsonrpc !== '2.0') return error(null, -32600, 'Invalid JSON-RPC request');

  if (rpc.method === 'initialize') {
    return result(rpc.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'dsg-governance-plugin', version: '1.0.0' },
    });
  }

  if (rpc.method === 'notifications/initialized') {
    return new NextResponse(null, { status: 202 });
  }

  if (rpc.method === 'tools/list') return result(rpc.id, { tools: [TOOL] });

  if (rpc.method === 'tools/call') {
    if (rpc.params?.name !== TOOL_NAME) return error(rpc.id, -32601, 'Unknown tool');
    const auth = await resolveAuth(request);
    if (auth instanceof NextResponse) return auth;

    const governed = await governAction(
      (rpc.params.arguments ?? {}) as unknown as GovernancePreflightInput,
      auth,
    );
    if (governed.ok === false) return toolResult(rpc.id, governed, true);
    return toolResult(rpc.id, governed);
  }

  return error(rpc.id, -32601, 'Method not found');
}
