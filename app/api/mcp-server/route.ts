import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TOOLS = [
  {
    name: 'create_dsg_job',
    description: 'Create a new DSG job with a goal and optional success criteria.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'The goal for the DSG job.' },
        successCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of success criteria.',
        },
      },
      required: ['goal'],
    },
  },
  {
    name: 'list_templates',
    description: 'List available DSG templates, optionally filtered by category or search term.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter templates by category.' },
        search: { type: 'string', description: 'Search templates by keyword.' },
      },
    },
  },
  {
    name: 'get_job_status',
    description: 'Get the current status of a DSG job by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The ID of the DSG job.' },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'list_jobs',
    description: 'List all DSG jobs for the current workspace.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    'https://tdealer01-crypto-dsg-control-plane.vercel.app'
  );
}

async function getAuthHeader(incomingRequest: Request): Promise<string | null> {
  const incoming = incomingRequest.headers.get('authorization');
  if (incoming) return incoming;

  const serviceToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (serviceToken) return `Bearer ${serviceToken}`;

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return `Bearer ${session.access_token}`;
  } catch {
    // no session available
  }

  return null;
}

async function callTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  authHeader: string | null,
): Promise<unknown> {
  const base = getBaseUrl();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  switch (toolName) {
    case 'create_dsg_job': {
      const res = await fetch(`${base}/api/dsg-bridge/jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal: toolInput.goal,
          successCriteria: toolInput.successCriteria ?? [],
        }),
      });
      return res.json();
    }
    case 'list_templates': {
      const params = new URLSearchParams();
      if (typeof toolInput.category === 'string') params.set('category', toolInput.category);
      if (typeof toolInput.search === 'string') params.set('search', toolInput.search);
      const qs = params.toString();
      const res = await fetch(`${base}/api/dsg-bridge/templates${qs ? `?${qs}` : ''}`, { headers });
      return res.json();
    }
    case 'get_job_status': {
      const { jobId } = toolInput as { jobId: string };
      const res = await fetch(`${base}/api/dsg-bridge/jobs/${encodeURIComponent(jobId)}`, { headers });
      return res.json();
    }
    case 'list_jobs': {
      const res = await fetch(`${base}/api/dsg-bridge/jobs`, { headers });
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
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'dsg-one-mcp', version: '1.0.0' },
        },
      });
    }

    if (method === 'tools/list') {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: { tools: TOOLS },
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name as string;
      const toolInput = (params?.arguments ?? {}) as Record<string, unknown>;
      if (!toolName) {
        return Response.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: 'Invalid params: name is required' },
        });
      }
      const authHeader = await getAuthHeader(request);
      const result = await callTool(toolName, toolInput, authHeader);
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(result) }] },
      });
    }

    return Response.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  } catch (err) {
    return Response.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32700, message: err instanceof Error ? err.message : 'Parse error' },
    });
  }
}

export async function GET() {
  return NextResponse.json({ name: 'dsg-one-mcp', version: '1.0.0', tools: TOOLS.length });
}
