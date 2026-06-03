// ERROR_HANDLER_EXEMPT: MCP JSON-RPC protocol requires structured error responses
import { NextRequest, NextResponse } from 'next/server';
import { buildCommandEnvelope } from '@/lib/commands/normalize';
import { TOOL_POLICY } from '@/lib/commands/schema';

export const dynamic = 'force-dynamic';

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
};

function rpcResult(id: JsonRpcRequest['id'], result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, result });
}

function rpcError(id: JsonRpcRequest['id'], code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status: code === -32601 ? 404 : 400 });
}

function toolList() {
  return Object.entries(TOOL_POLICY).map(([name, policy]) => ({
    name,
    description: `Queue ${name} for Android owner-agent review. Class=${policy.class}; owner approval is always required before device execution.`,
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        url: { type: 'string' },
        packageName: { type: 'string' },
        screen: { type: 'string' },
        direction: { type: 'string', enum: ['down'] },
      },
      required: ['deviceId'],
      additionalProperties: true,
    },
    outputSchema: {
      type: 'object',
      properties: {
        commandId: { type: 'string' },
        executionState: { type: 'string' },
        requiresOwnerApproval: { type: 'boolean' },
        commandDigest: { type: 'string' },
      },
      required: ['commandId', 'executionState', 'requiresOwnerApproval', 'commandDigest'],
    },
  }));
}

export async function GET() {
  return NextResponse.json({ ok: true, tools: toolList(), note: 'Use POST JSON-RPC tools/list or tools/call.' });
}

export async function POST(request: NextRequest) {
  const rpc = (await request.json().catch(() => null)) as JsonRpcRequest | null;
  if (!rpc || rpc.jsonrpc !== '2.0') return rpcError(null, -32600, 'Invalid JSON-RPC request');

  if (rpc.method === 'tools/list') {
    return rpcResult(rpc.id, { tools: toolList() });
  }

  if (rpc.method === 'tools/call') {
    const name = rpc.params?.name;
    if (!name) return rpcError(rpc.id, -32602, 'Missing tool name');
    try {
      const args = rpc.params?.arguments ?? {};
      const command = buildCommandEnvelope({
        sourceKind: 'mcp',
        actorType: 'user',
        actorId: String(args.actorId ?? 'operator:mcp'),
        deviceId: String(args.deviceId ?? 'android.owner.default'),
        toolName: name,
        args,
      });
      return rpcResult(rpc.id, {
        commandId: command.commandId,
        executionState: command.executionState,
        requiresOwnerApproval: command.policy.requiresOwnerApproval,
        commandDigest: command.idempotency.digest,
        command,
        note: 'MCP tools/call creates a command proposal only. Android execution still requires owner approval on device.',
      });
    } catch (error) {
      return rpcError(rpc.id, -32602, error instanceof Error ? error.message : 'Invalid tool arguments');
    }
  }

  return rpcError(rpc.id, -32601, 'Method not found');
}
