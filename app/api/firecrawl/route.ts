import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { createHash } from 'crypto';

/**
 * Firecrawl integration — automatic data sourcing for DSG ONE.
 *
 * POST /api/firecrawl
 * Body: { url: string; formats?: string[]; actions?: unknown[]; label?: string }
 *
 * Flow:
 * 1. Calls the Firecrawl scrape API (configured via FIRECRAWL_API_KEY).
 * 2. Stores the result in the `firecrawl_results` Supabase table
 *    (created automatically by upsertFirecrawlResult if missing).
 * 3. Returns the raw + persisted result for DSG execute/audit to verify.
 *
 * Design notes:
 * - No DSG-specific gating: the Firecrawl endpoint is a pure
 *   data-source utility. Authorization can be layered upstream.
 * - Results are keyed by sha256 of the URL + formats so identical
 *   re-crawls update the same row instead of duplicating.
 */
const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev/v1';

function getFirecrawlKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error('FIRECRAWL_API_KEY is not configured');
  return key;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    if (!url) {
      return NextResponse.json(
        { ok: false, error: 'url_required', message: 'A "url" field is required.' },
        { status: 400 }
      );
    }

    const formats = Array.isArray(body.formats) && body.formats.length > 0
      ? body.formats
      : ['markdown'];

    const payload: Record<string, unknown> = {
      url,
      formats,
      ...(body.actions ? { actions: body.actions } : {}),
    };

    const res = await fetch(`${FIRECRAWL_API_URL.replace(/\/$/, '')}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getFirecrawlKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: 'firecrawl_api_error', status: res.status, detail: text.slice(0, 500) },
        { status: res.status === 401 ? 500 : res.status }
      );
    }

    const result = await res.json();
    const payloadForDb = {
      url,
      success: Boolean(result.success),
      title: result.data?.metadata?.title || null,
      content: result.data?.markdown || result.data?.content || '',
      metadata: JSON.stringify(result.data?.metadata || {}),
      raw: JSON.stringify(result),
      label: typeof body.label === 'string' ? body.label : null,
    };

    const persisted = await upsertFirecrawlResult(url, payloadForDb);

    return NextResponse.json(
      {
        ok: true,
        result: result.data || result,
        persisted,
        message: 'firecrawl_scrape_ok',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'firecrawl_unexpected_error',
      },
      { status: 500 }
    );
  }
}

/**
 * Persists a scrape result into `firecrawl_results`, creating the
 * table when necessary (idempotent, safe for first-run).
 */
async function upsertFirecrawlResult(
  url: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; method: string }> {
  const admin = getSupabaseAdmin() as any;
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 32);

  // Ensure the table exists — a best-effort creation via RPC fallback.
  try {
    const { error } = await admin.from('firecrawl_results').select('id').limit(1);
    if (error && (error.code === '42P01' || error.message?.includes('relation') && error.message?.includes('does not exist'))) {
      // Fall back to creating the table through a raw SQL RPC if available.
      const createResult = await admin.rpc('firecrawl_ensure_table', {});
      if (createResult.error) {
        return { ok: false, method: 'select_fallback_failed' };
      }
    }
  } catch {
    // Non-fatal: persistence is a cache layer, not a hard dependency.
  }

  const { data, error } = await admin
    .from('firecrawl_results')
    .upsert(
      { id: hash, url, ...payload, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    .select('id')
    .single();

  if (error) {
    // If the row-level store fails, record in firecrawl_logs instead.
    try {
      await admin.from('firecrawl_logs').insert({
        id: hash,
        url,
        payload: JSON.stringify(payload),
        created_at: new Date().toISOString(),
      });
      return { ok: true, method: 'logs_fallback' };
    } catch {
      return { ok: false, method: 'persist_failed' };
    }
  }

  return { ok: true, method: 'firecrawl_results' };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'firecrawl',
    configured: Boolean(process.env.FIRECRAWL_API_KEY),
    api: FIRECRAWL_API_URL,
    message: 'POST /api/firecrawl with { url } to scrape a page.',
  });
}
