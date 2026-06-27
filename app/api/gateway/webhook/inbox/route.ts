import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function header(request: Request, name: string) {
  return request.headers.get(name)?.trim() ?? '';
}

function sanitizeHeaders(request: Request) {
  return {
    orgId: header(request, 'x-dsg-org-id') || header(request, 'x-org-id'),
    actorId: header(request, 'x-dsg-actor-id') || header(request, 'x-actor-id'),
    toolName: header(request, 'x-dsg-tool-name'),
    action: header(request, 'x-dsg-action'),
    contentType: header(request, 'content-type'),
  };
}

export async function POST(request: Request) {
  const receivedAt = new Date().toISOString();
  const body = await request.json().catch(() => ({}));
  const headers = sanitizeHeaders(request);

  return NextResponse.json(
    {
      ok: true,
      service: 'gateway-webhook-inbox',
      receivedAt,
      headers,
      payload: body,
    },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'gateway-webhook-inbox',
      accepts: ['POST'],
    },
    { status: 200 }
  );
}
