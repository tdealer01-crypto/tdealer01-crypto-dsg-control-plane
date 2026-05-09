import { NextResponse } from 'next/server';

type SupabaseRequest = { method?: 'GET' | 'POST'; path: string; query?: string; body?: unknown };
type ItemRow = { id: string; app_id: string; title: string; completed: boolean; created_at: string };

const APP_ID = "4144ccfa-6153-4294-8738-a06e287ae62c";

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('GENERATED_APP_SUPABASE_ENV_REQUIRED');
  const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  return { url: normalizedUrl, key };
}

async function supabaseRest<T>(input: SupabaseRequest): Promise<T> {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${input.path}${input.query ?? ''}`, {
    method: input.method ?? 'GET',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : response.statusText;
    throw new Error(message || 'GENERATED_APP_SUPABASE_REQUEST_FAILED');
  }
  return data as T;
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : 'GENERATED_APP_REQUEST_FAILED';
  return NextResponse.json({ ok: false, error: { code: message, message } }, { status: 400 });
}

export async function GET() {
  try {
    const rows = await supabaseRest<ItemRow[]>({
      path: 'generated_app_items',
      query: `?app_id=eq.${encodeURIComponent(APP_ID)}&select=id,title,completed,created_at&order=created_at.desc`,
    });
    return NextResponse.json({ ok: true, data: { appId: APP_ID, items: rows } });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { title?: string };
    const title = body.title?.trim();
    if (!title) throw new Error('GENERATED_APP_TITLE_REQUIRED');
    const rows = await supabaseRest<ItemRow[]>({
      method: 'POST',
      path: 'generated_app_items',
      body: { app_id: APP_ID, title, completed: false },
    });
    return NextResponse.json({ ok: true, data: { item: rows[0] } });
  } catch (error) {
    return fail(error);
  }
}
