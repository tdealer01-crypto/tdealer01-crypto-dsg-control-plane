import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { RuntimeRouteRoles } from '../../../lib/runtime/permissions';
import { handleApiError } from '../../../lib/security/api-error';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../lib/security/rate-limit';

const SEARCH_RATE_LIMIT = 20;
const SEARCH_WINDOW_MS = 60_000;
const MAX_QUERY_LENGTH = 180;

type DuckInstantTopic = {
  Text?: string;
  FirstURL?: string;
};

function normalizeTopics(topics: unknown[]): DuckInstantTopic[] {
  const out: DuckInstantTopic[] = [];
  for (const topic of topics) {
    if (!topic || typeof topic !== 'object') continue;
    const row = topic as { Text?: unknown; FirstURL?: unknown; Topics?: unknown[] };
    if (Array.isArray(row.Topics)) {
      out.push(...normalizeTopics(row.Topics));
      continue;
    }
    if (typeof row.Text === 'string' && typeof row.FirstURL === 'string') {
      out.push({ Text: row.Text, FirstURL: row.FirstURL });
    }
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'realtime-search'),
      limit: SEARCH_RATE_LIMIT,
      windowMs: SEARCH_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, SEARCH_RATE_LIMIT) },
      );
    }

    const access = await requireOrgRole(RuntimeRouteRoles.monitor);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status, headers: buildRateLimitHeaders(rateLimit, SEARCH_RATE_LIMIT) },
      );
    }

    const url = new URL(request.url);
    const q = String(url.searchParams.get('q') || '').trim();
    if (!q) {
      return NextResponse.json(
        { error: 'q is required' },
        { status: 400, headers: buildRateLimitHeaders(rateLimit, SEARCH_RATE_LIMIT) },
      );
    }
    if (q.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `q is too long (max ${MAX_QUERY_LENGTH})` },
        { status: 400, headers: buildRateLimitHeaders(rateLimit, SEARCH_RATE_LIMIT) },
      );
    }

    const remote = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1`,
      {
        headers: {
          accept: 'application/json',
        },
        cache: 'no-store',
      },
    );

    if (!remote.ok) {
      return NextResponse.json(
        { error: `Search provider error (${remote.status})` },
        { status: 502, headers: buildRateLimitHeaders(rateLimit, SEARCH_RATE_LIMIT) },
      );
    }

    const body = (await remote.json().catch(() => ({}))) as {
      AbstractText?: string;
      AbstractURL?: string;
      Heading?: string;
      RelatedTopics?: unknown[];
    };
    const related = normalizeTopics(Array.isArray(body.RelatedTopics) ? body.RelatedTopics : []).slice(0, 5);

    return NextResponse.json(
      {
        query: q,
        provider: 'duckduckgo-instant-answer',
        heading: body.Heading || '',
        abstract: body.AbstractText || '',
        abstract_url: body.AbstractURL || '',
        results: related.map((item) => ({
          title: item.Text || '',
          url: item.FirstURL || '',
        })),
      },
      { headers: buildRateLimitHeaders(rateLimit, SEARCH_RATE_LIMIT) },
    );
  } catch (error) {
    return handleApiError('api/realtime-search', error);
  }
}
