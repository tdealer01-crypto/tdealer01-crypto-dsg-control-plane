// ERROR_HANDLER_EXEMPT: MCP JSON-RPC protocol requires structured error responses
// This route is superseded by /api/mcp-server — kept as redirect for compatibility
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ message: 'MCP server moved to /api/mcp-server' }, { status: 301 });
}

export async function POST() {
  return NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Endpoint moved to /api/mcp-server' } },
    { status: 301 },
  );
}
