import { NextResponse } from 'next/server';

const allowedHosts = new Set(['en.wikipedia.org', 'wikipedia.org']);

function allowedUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (!allowedHosts.has(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { action?: unknown; params?: Record<string, unknown> } | null;
    const action = typeof body?.action === 'string' ? body.action : '';
    const params = body?.params && typeof body.params === 'object' ? body.params : {};

    if (action === 'navigate') {
      const target = typeof params.url === 'string' ? params.url : 'https://en.wikipedia.org';
      const url = allowedUrl(target);
      if (!url) return NextResponse.json({ ok: false, error: { code: 'FLOW_STUDIO_HOST_NOT_ALLOWED' } }, { status: 403 });
      const head = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return NextResponse.json({ ok: true, data: { action, status: head.status, message: `Allowlisted host reached: ${url.hostname}` } });
    }

    if (action === 'type' || action === 'click') {
      return NextResponse.json({ ok: true, data: { action, message: `Tracked UI action ${action}`, params } });
    }

    if (action === 'extract') {
      const query = typeof params.query === 'string' && params.query.trim() ? params.query.trim().slice(0, 120) : 'Technology';
      const url = new URL('https://en.wikipedia.org/w/api.php');
      url.searchParams.set('action', 'query');
      url.searchParams.set('list', 'search');
      url.searchParams.set('srsearch', query);
      url.searchParams.set('utf8', '');
      url.searchParams.set('format', 'json');

      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`WIKIPEDIA_HTTP_${response.status}`);
      const json = await response.json() as { query?: { search?: { title?: string; snippet?: string }[] } };
      const first = json.query?.search?.[0];
      const snippet = first?.snippet?.replace(/<\/?[^>]+(>|$)/g, '') ?? '';
      return NextResponse.json({ ok: true, data: { action, query, title: first?.title ?? null, snippet } });
    }

    return NextResponse.json({ ok: false, error: { code: 'FLOW_STUDIO_ACTION_NOT_ALLOWED' } }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FLOW_STUDIO_MCP_FAILED';
    return NextResponse.json({ ok: false, error: { code: message, message } }, { status: 500 });
  }
}
