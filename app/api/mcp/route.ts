// ERROR_HANDLER_EXEMPT: MCP JSON-RPC protocol requires structured error responses
import { NextRequest, NextResponse } from 'next/server';
import { buildCommandEnvelope } from '@/lib/commands/normalize';
import { TOOL_POLICY } from '@/lib/commands/schema';
import { DSG_TOOL_SCHEMAS, DSG_TOOL_NAMES } from '@/lib/mcp/schemas';
import type { DsgToolName } from '@/lib/mcp/schemas';
import { callDsgTool } from '@/lib/mcp/dsg-tools';
import { HERMES_TOOL_SCHEMAS, HERMES_TOOL_NAMES } from '@/lib/mcp/hermes-tool-schemas';
import { callHermesTool } from '@/lib/mcp/hermes-tools';
import {
  UNIFIED_TOOL_NAMES,
  UNIFIED_TOOL_SCHEMAS,
  callUnifiedTool,
  type UnifiedToolName,
} from '@/lib/mcp/unified-tools';
import {
  validateStoredUnifiedMcpKey,
  type UnifiedAuthContext,
} from '@/lib/mcp/unified-auth';
import { requireOrgRole } from '@/lib/authz';

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
  return NextResponse.json(
    { jsonrpc: '2.0', id: id ?? null, error: { code, message } },
    { status: code === -32601 ? 404 : code === -32001 ? 401 : 400 },
  );
}

function structuredContent(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}

function rpcToolResult(
  id: JsonRpcRequest['id'],
  value: unknown,
  isError = false,
) {
  return rpcResult(id, {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value ?? null),
      },
    ],
    structuredContent: structuredContent(value),
    ...(isError ? { isError: true } : {}),
  });
}

function androidToolList() {
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

function dsgToolList() {
  return DSG_TOOL_NAMES.map((name) => ({ name, ...DSG_TOOL_SCHEMAS[name] }));
}

function unifiedToolList() {
  return UNIFIED_TOOL_NAMES.map((name) => ({ name, ...UNIFIED_TOOL_SCHEMAS[name] }));
}

function hermesToolList() {
  return HERMES_TOOL_SCHEMAS;
}

function toolList() {
  return [...unifiedToolList(), ...androidToolList(), ...dsgToolList(), ...hermesToolList()];
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    server: 'dsg-control-plane-unified-mcp',
    version: '1.0.0',
    tools: toolList(),
    note: 'One MCP front door for DSG Control Plane, AIMO, AWS governed deployment, runtime, and evidence tools.',
  });
}

export async function POST(request: NextRequest) {
  const rpc = (await request.json().catch(() => null)) as JsonRpcRequest | null;
  if (!rpc || rpc.jsonrpc !== '2.0') return rpcError(null, -32600, 'Invalid JSON-RPC request');

  if (rpc.method === 'initialize') {
    return rpcResult(rpc.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'dsg-control-plane-unified-mcp', version: '1.0.0' },
    });
  }

  // MCP initialization is a one-way notification and intentionally has no JSON-RPC response body.
  if (rpc.method === 'notifications/initialized') {
    return new NextResponse(null, { status: 202 });
  }

  if (rpc.method === 'tools/list') {
    return rpcResult(rpc.id, { tools: toolList() });
  }

  if (rpc.method === 'tools/call') {
    const name = rpc.params?.name;
    if (!name) return rpcError(rpc.id, -32602, 'Missing tool name');

    const args = rpc.params?.arguments ?? {};

    if ((UNIFIED_TOOL_NAMES as readonly string[]).includes(name)) {
      const storedKey = await validateStoredUnifiedMcpKey(request, name);
      let auth: UnifiedAuthContext;

      if (storedKey.presented) {
        if (storedKey.valid === false) {
          return rpcError(rpc.id, -32001, storedKey.reason);
        }
        auth = storedKey.context;
      } else {
        const access = await requireOrgRole(['operator', 'org_admin'], request);
        if (!access.ok) {
          return rpcError(rpc.id, -32001, access.error ?? 'Unauthorized');
        }
        auth = {
          source: 'session',
          actorId: access.userId,
          orgId: access.orgId,
          roles: access.grantedRoles,
        };
      }

      const unifiedResult = await callUnifiedTool(name as UnifiedToolName, args, auth);
      if (unifiedResult.ok === false) {
        return rpcToolResult(
          rpc.id,
          { error: { code: unifiedResult.code, message: unifiedResult.message } },
          true,
        );
      }
      return rpcToolResult(rpc.id, unifiedResult.result);
    }

    // Route DSG tools to the existing deterministic control-plane handler.
    if ((DSG_TOOL_NAMES as readonly string[]).includes(name)) {
      const dsgResult = await callDsgTool(name as DsgToolName, args);
      if (dsgResult.ok === false) {
        return rpcToolResult(
          rpc.id,
          { error: { code: dsgResult.code, message: dsgResult.message } },
          true,
        );
      }
      return rpcToolResult(rpc.id, dsgResult.result);
    }

    // Route Hermes agent tools to the Hermes tool handler — requires auth.
    if ((HERMES_TOOL_NAMES as string[]).includes(name)) {
      const access = await requireOrgRole(['operator', 'org_admin'], request);
      if (!access.ok) {
        return rpcError(rpc.id, -32001, access.error ?? 'Unauthorized');
      }
      const hermesResult = await callHermesTool(name, args, request, access.orgId);
      if (hermesResult.ok === false) {
        return rpcToolResult(
          rpc.id,
          { error: { code: hermesResult.code, message: hermesResult.message } },
          true,
        );
      }
      return rpcToolResult(rpc.id, hermesResult.result);
    }

    // Route Android tools to the command envelope builder. Execution still requires owner approval.
    try {
      const command = buildCommandEnvelope({
        sourceKind: 'mcp',
        actorType: 'user',
        actorId: String(args.actorId ?? 'operator:mcp'),
        deviceId: String(args.deviceId ?? 'android.owner.default'),
        toolName: name,
        args,
      });
      return rpcToolResult(rpc.id, {
        commandId: command.commandId,
        executionState: command.executionState,
        requiresOwnerApproval: command.policy.requiresOwnerApproval,
        commandDigest: command.idempotency.digest,
        command,
        note: 'MCP tools/call creates a command proposal only. Android execution still requires owner approval on device.',
      });
    } catch (error) {
      return rpcToolResult(
        rpc.id,
        { error: { code: -32602, message: error instanceof Error ? error.message : 'Invalid tool arguments' } },
        true,
      );
    }
  }

  return rpcError(rpc.id, -32601, 'Method not found');
}
