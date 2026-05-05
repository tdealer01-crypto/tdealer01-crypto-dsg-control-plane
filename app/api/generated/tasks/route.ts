import { NextResponse } from 'next/server';

const TABLE = 'dsg_crud_proof_tasks';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('DSG_SUPABASE_ADMIN_ENV_REQUIRED');
  }

  return {
    baseUrl: `${url.replace(/\/$/, '')}/rest/v1/${TABLE}`,
    key,
  };
}

function requireProofSecret(request: Request) {
  const expected = process.env.DSG_CALLBACK_SECRET;
  const actual = request.headers.get('x-dsg-proof-secret');

  if (!expected || !actual || actual !== expected) {
    throw new Error('DSG_CRUD_PROOF_SECRET_REQUIRED');
  }
}

function requireScope(request: Request) {
  const workspaceId = request.headers.get('x-dsg-workspace-id');
  const orgId = request.headers.get('x-dsg-org-id');

  if (!workspaceId || !orgId) {
    throw new Error('DSG_CRUD_SCOPE_REQUIRED');
  }

  return { workspaceId, orgId };
}

function supabaseHeaders(key: string) {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    'content-type': 'application/json',
    prefer: 'return=representation',
  };
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `DSG_SUPABASE_REST_FAILED:${response.status}`);
  }

  return text ? JSON.parse(text) : null;
}

export async function GET(request: Request) {
  try {
    requireProofSecret(request);
    const { workspaceId, orgId } = requireScope(request);
    const { baseUrl, key } = getSupabaseConfig();

    const url = new URL(baseUrl);
    url.searchParams.set('select', '*');
    url.searchParams.set('workspace_id', `eq.${workspaceId}`);
    url.searchParams.set('org_id', `eq.${orgId}`);
    url.searchParams.set('order', 'created_at.desc');

    const response = await fetch(url, {
      method: 'GET',
      headers: supabaseHeaders(key),
      cache: 'no-store',
    });

    const data = await readJsonResponse(response);

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'DSG_CRUD_READ_FAILED' } },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    requireProofSecret(request);
    const { workspaceId, orgId } = requireScope(request);
    const body = await request.json();
    const { baseUrl, key } = getSupabaseConfig();

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: supabaseHeaders(key),
      body: JSON.stringify({
        title: body.title,
        done: body.done === true,
        metadata: body.metadata ?? {},
        workspace_id: workspaceId,
        org_id: orgId,
      }),
      cache: 'no-store',
    });

    const rows = await readJsonResponse(response);
    const data = Array.isArray(rows) ? rows[0] : rows;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'DSG_CRUD_CREATE_FAILED' } },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    requireProofSecret(request);
    const { workspaceId, orgId } = requireScope(request);
    const body = await request.json();
    const id = body?.id;

    if (!id) throw new Error('DSG_CRUD_ID_REQUIRED');

    const { baseUrl, key } = getSupabaseConfig();
    const url = new URL(baseUrl);
    url.searchParams.set('id', `eq.${id}`);
    url.searchParams.set('workspace_id', `eq.${workspaceId}`);
    url.searchParams.set('org_id', `eq.${orgId}`);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: supabaseHeaders(key),
      body: JSON.stringify({
        title: body.title,
        done: body.done === true,
        metadata: body.metadata ?? {},
        updated_at: new Date().toISOString(),
      }),
      cache: 'no-store',
    });

    const rows = await readJsonResponse(response);
    const data = Array.isArray(rows) ? rows[0] : rows;

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'DSG_CRUD_UPDATE_FAILED' } },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    requireProofSecret(request);
    const { workspaceId, orgId } = requireScope(request);
    const id = new URL(request.url).searchParams.get('id');

    if (!id) throw new Error('DSG_CRUD_ID_REQUIRED');

    const { baseUrl, key } = getSupabaseConfig();
    const url = new URL(baseUrl);
    url.searchParams.set('id', `eq.${id}`);
    url.searchParams.set('workspace_id', `eq.${workspaceId}`);
    url.searchParams.set('org_id', `eq.${orgId}`);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: supabaseHeaders(key),
      cache: 'no-store',
    });

    await readJsonResponse(response);

    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'DSG_CRUD_DELETE_FAILED' } },
      { status: 400 },
    );
  }
}
