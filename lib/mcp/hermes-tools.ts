import { DSG_TOOLS } from '@/lib/agent/tools';
import { executeToolSafely } from '@/lib/agent/executor';
import type { AgentContext } from '@/lib/agent/context';
import type { NextRequest } from 'next/server';

export type HermesToolResult =
  | { ok: true; result: unknown }
  | { ok: false; code: number; message: string };

function buildAgentContext(request: NextRequest, args: Record<string, unknown>): AgentContext {
  const authHeader = request.headers.get('authorization') ?? '';
  const cookieHeader = request.headers.get('cookie') ?? '';
  const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const orgId = String(args.org_id ?? args.orgId ?? 'mcp:default').trim();
  const rawRole = String(args.role ?? 'operator');
  const role: AgentContext['role'] = rawRole === 'org_admin' ? 'org_admin' : 'operator';
  const approvalToken = typeof args.approvalToken === 'string' ? args.approvalToken : undefined;

  return { orgId, role, origin, authHeader, cookieHeader, approvalToken };
}

export async function callHermesTool(
  name: string,
  args: Record<string, unknown>,
  request: NextRequest,
): Promise<HermesToolResult> {
  const toolId = name.replace(/^hermes\./, '');
  const tool = DSG_TOOLS.find((t) => t.id === toolId);

  if (!tool) {
    return { ok: false, code: -32601, message: `Unknown Hermes tool: ${name}` };
  }

  try {
    const context = buildAgentContext(request, args);
    const result = await executeToolSafely(tool, args, context);
    return { ok: true, result };
  } catch (caught) {
    return {
      ok: false,
      code: -32603,
      message: caught instanceof Error ? caught.message : 'Hermes tool error',
    };
  }
}
