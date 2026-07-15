import { NextResponse } from 'next/server';

// ERROR_HANDLER_EXEMPT: MCP JSON-RPC protocol requires structured error responses
export const dynamic = 'force-dynamic';

const TOOLS = [
  {
    name: 'get_proof',
    description: 'Generate a DSG audit+evidence proof for a build goal. Required before Hermes will allow write operations.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'Build goal to bind the proof to (min 8 chars).' },
      },
      required: ['goal'],
    },
  },
  {
    name: 'list_app_builder_jobs',
    description: 'List all App Builder jobs in the current DSG workspace.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_app_builder_job',
    description: 'Create a new App Builder job with a locked goal.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'The build goal for this job.' },
        successCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of measurable success criteria.',
        },
        designStyle: { type: 'string', description: 'Optional UI design style (e.g. minimal, dashboard).' },
        targetUsers: { type: 'string', description: 'Optional description of the target users.' },
      },
      required: ['goal'],
    },
  },
  {
    name: 'create_job_plan',
    description: 'Generate a deterministic build plan for an existing App Builder job.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'App Builder job ID.' },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'route_agent_command',
    description: 'Route a natural language agent command through the DSG agent-runtime and get back a structured action.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Natural language command (e.g. "deploy the app", "run QA on /dashboard").' },
        context: { type: 'string', description: 'Optional page or session context.' },
        userBenefit: { type: 'string', description: 'Optional user-visible benefit of this command.' },
      },
      required: ['command'],
    },
  },
  {
    name: 'get_autonomous_level',
    description: 'Get the current DSG autonomous-level gate status — shows which capability tiers are unlocked.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    'https://dsg-one-v1.vercel.app'
  );
}

function getAuthHeader(incomingRequest: Request): string | null {
  const incoming = incomingRequest.headers.get('authorization');
  if (incoming) return incoming;
  const serviceToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (serviceToken) return `Bearer ${serviceToken}`;
  return null;
}

async function callTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  authHeader: string | null,
  incomingRequest: Request,
): Promise<unknown> {
  const base = getBaseUrl();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;
  const cookie = incomingRequest.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;

  switch (toolName) {
    case 'get_proof': {
      const res = await fetch(`${base}/api/dsg/app-builder/proof`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ goal: toolInput.goal }),
      });
      return res.json();
    }
    case 'list_app_builder_jobs': {
      const res = await fetch(`${base}/api/dsg/app-builder/jobs`, { headers });
      return res.json();
    }
    case 'create_app_builder_job': {
      const res = await fetch(`${base}/api/dsg/app-builder/jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal: toolInput.goal,
          successCriteria: toolInput.successCriteria ?? [],
          designStyle: toolInput.designStyle,
          targetUsers: toolInput.targetUsers,
        }),
      });
      return res.json();
    }
    case 'create_job_plan': {
      const jobId = String(toolInput.jobId ?? '');
      const res = await fetch(`${base}/api/dsg/app-builder/jobs/${encodeURIComponent(jobId)}/plan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      return res.json();
    }
    case 'route_agent_command': {
      const res = await fetch(`${base}/api/dsg/agent-runtime/commands`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          command: toolInput.command,
          context: toolInput.context,
          userBenefit: toolInput.userBenefit,
        }),
      });
      return res.json();
    }
    case 'get_autonomous_level': {
      const res = await fetch(`${base}/api/dsg/autonomous-level/status`, { headers });
      return res.json();
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

export async function POST(request: Request) {
  let id: string | number | null = null;
  try {
    const body = await request.json();
    id = body.id ?? null;
    const { method, params } = body as {
      method: string;
      params?: Record<string, unknown>;
      id?: string | number;
    };

    if (method === 'initialize') {
      return Response.json({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'dsg-one-v1-mcp', version: '1.0.0' },
        },
      });
    }

    if (method === 'tools/list') {
      return Response.json({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    }

    if (method === 'tools/call') {
      const toolName = params?.name as string;
      const toolInput = (params?.arguments ?? {}) as Record<string, unknown>;
      if (!toolName) {
        return Response.json({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Invalid params: name is required' } });
      }
      const authHeader = getAuthHeader(request);
      const result = await callTool(toolName, toolInput, authHeader, request);
      return Response.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } });
    }

    return Response.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch {
    return Response.json({ jsonrpc: '2.0', id, error: { code: -32700, message: 'Internal error' } });
  }
}

export async function GET() {
  return NextResponse.json({ name: 'dsg-one-v1-mcp', version: '1.0.0', tools: TOOLS.length });
}
