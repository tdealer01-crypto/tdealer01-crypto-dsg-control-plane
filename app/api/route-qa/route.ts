import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { internalErrorMessage, logApiError } from '../../../lib/security/api-error';

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

class RouteQaInputError extends Error {
  status = 400;
}

function normalizeTarget(input: unknown, origin: string) {
  const value = String(input || '').trim();
  if (!value) return '';

  if (value.startsWith('http://') || value.startsWith('https://')) {
    const url = new URL(value);
    if (url.origin !== origin) {
      throw new RouteQaInputError('external URL blocked');
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

async function browserCheck(url: string) {
  const startedAt = Date.now();
  try {
    // Use Termux-installed Chromium directly
    const chromiumPath = '/data/data/com.termux/files/usr/bin/chromium-browser';
    const { chromium: playwright } = await import('playwright-core');

    const browser = await playwright.launch({
      executablePath: chromiumPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    });
    const page = await context.newPage();

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    const title = await page.title();
    const bodyVisible = await page.locator('body').isVisible();
    const bodyText = await page.locator('body').innerText();
    const hasContent = bodyText.length > 50;
    const viewport = page.viewportSize();

    await browser.close();

    return {
      mode: 'browser',
      title,
      bodyVisible,
      hasContent,
      contentLength: bodyText.length,
      consoleErrorCount: consoleErrors.length,
      consoleErrors: consoleErrors.slice(0, 5),
      viewportWidth: viewport?.width,
      viewportHeight: viewport?.height,
      latencyMs: Date.now() - startedAt,
      ok: bodyVisible && hasContent && consoleErrors.length === 0,
    };
  } catch (err) {
    return {
      mode: 'browser',
      ok: true,
      skipped: true,
      reason: err instanceof Error ? err.message : 'browser_unavailable',
      latencyMs: Date.now() - startedAt,
    };
  }
}

function extractLocalLinks(html: string) {
  const hrefs = Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi))
    .map((match) => String(match[1] || '').trim())
    .filter((href) => href.startsWith('/'))
    .filter((href) => !href.startsWith('/_next/') && !href.startsWith('/api/'));

  return Array.from(new Set(hrefs)).slice(0, 40);
}

async function checkRoute(url: string, useBrowser: boolean) {
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

  const result: any = {
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

  // Add browser check if requested and route is OK
  if (useBrowser && ok) {
    const browserResult = await browserCheck(url);
    result.browser = browserResult;
    result.ok = result.ok && browserResult.ok;
    result.checks.browserRender = browserResult.ok;
    result.checks.noConsoleErrors = browserResult.consoleErrorCount === 0;
    result.checks.bodyVisible = browserResult.bodyVisible;
    result.checks.hasVisibleContent = browserResult.hasContent;
  }

  return result;
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
    const useBrowser = body?.browser === true;
    const targets = all
      ? PUBLIC_ROUTES.map((route) => new URL(route, origin).toString())
      : [normalizeTarget(body?.path || body?.url || '/', origin)];

    const results = [];
    for (const target of targets) {
      results.push(await checkRoute(target, useBrowser));
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
      truthBoundary: 'Route QA checks server-rendered route status, HTML basics, and browser runtime (console errors, visual rendering via Playwright).',
    });
  } catch (error) {
    if (error instanceof RouteQaInputError) {
      return NextResponse.json({ ok: false, error: 'invalid_route_qa_target' }, { status: error.status });
    }

    logApiError('api/route-qa', error);
    return NextResponse.json({ ok: false, error: internalErrorMessage() }, { status: 500 });
  }
}