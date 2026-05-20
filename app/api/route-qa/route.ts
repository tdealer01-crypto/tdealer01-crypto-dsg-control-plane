import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';

export const dynamic = 'force-dynamic';

const PUBLIC_ROUTES = [
  '/',
  '/proofgate',
  '/enterprise-ready',
  '/finance-governance',
  '/automation',
  '/ai-compliance',
  '/eu-ai-act',
  '/blog',
  '/pricing',
  '/docs',
  '/quickstart',
  '/login',
];

function normalizeTarget(input: unknown, origin: string) {
  const value = String(input || '').trim();
  if (!value) return '';

  if (value.startsWith('http://') || value.startsWith('https://')) {
    const url = new URL(value);
    if (url.origin !== origin) {
      throw new Error('ROUTE_QA_EXTERNAL_URL_BLOCKED');
    }
    return url.toString();
  }

  const path = value.startsWith('/') ? value : `/${value}`;
  return new URL(path, origin).toString();
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractLocalLinks(html: string) {
  const hrefs = Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi))
    .map((match) => String(match[1] || '').trim())
    .filter((href) => href.startsWith('/'))
    .filter((href) => !href.startsWith('/_next/') && !href.startsWith('/api/'));

  return Array.from(new Set(hrefs)).slice(0, 40);
}

async function checkRoute(url: string) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    redirect: 'manual',
  });

  const contentType = response.headers.get('content-type') || '';
  const html = contentType.includes('text/html') ? await response.text() : '';
  const status = response.status;
  const ok = status >= 200 && status < 400;

  return {
    url,
    path: new URL(url).pathname,
    ok,
    status,
    title: html ? extractTitle(html) : '',
    localLinks: html ? extractLocalLinks(html) : [],
    htmlBytes: html.length,
    latencyMs: Date.now() - startedAt,
    checks: {
      routeLoads: ok,
      returnsHtml: contentType.includes('text/html'),
      hasTitle: html ? Boolean(extractTitle(html)) : false,
      hasLocalNavigation: html ? extractLocalLinks(html).length > 0 : false,
    },
  };
}

export async function POST(request: Request) {
  const access = await requireOrgRole(['operator', 'org_admin', 'runtime_auditor']);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const origin = new URL(request.url).origin;
    const all = body?.all === true;
    const targets = all
      ? PUBLIC_ROUTES.map((route) => new URL(route, origin).toString())
      : [normalizeTarget(body?.path || body?.url || '/', origin)];

    const results = [];
    for (const target of targets) {
      results.push(await checkRoute(target));
    }

    const failed = results.filter((result) => !result.ok);

    return NextResponse.json({
      ok: failed.length === 0,
      mode: all ? 'all_public_routes' : 'single_route',
      checkedAt: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.length - failed.length,
        failed: failed.length,
      },
      results,
      truthBoundary: 'Route QA checks server-rendered route status and HTML basics. Browser console and visual layout still require browser runtime evidence.',
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'ROUTE_QA_FAILED';
    const status = code === 'ROUTE_QA_EXTERNAL_URL_BLOCKED' ? 400 : 500;
    return NextResponse.json({ ok: false, error: code }, { status });
  }
}
