import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireActiveProfile } from '../../../../../lib/auth/require-active-profile';
import { logServerError, serverErrorResponse } from '../../../../../lib/security/error-response';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../../lib/security/rate-limit';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';

const AGENT_ROTATE_KEY_RATE_LIMIT = 30;
const AGENT_ROTATE_KEY_RATE_WINDOW_MS = 60 * 1000;

function buildApiKey() {
  return `dsg_live_${randomUUID().replace(/-/g, '')}`;
}

function buildPreview(apiKey: string) {
  return `${apiKey.slice(0, 12)}...`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'agents-rotate-key'),
    limit: AGENT_ROTATE_KEY_RATE_LIMIT,
    windowMs: AGENT_ROTATE_KEY_RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, AGENT_ROTATE_KEY_RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers });
    }

    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const newApiKey = buildApiKey();
    const apiKeyHash = createHash('sha256').update(newApiKey).digest('hex');

    const { data: updated, error } = await supabase
      .from('agents')
      .update({ api_key_hash: apiKeyHash, updated_at: new Date().toISOString() })
      .eq('org_id', access.orgId)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      logServerError(error, 'agents-id-rotate-key');
      return serverErrorResponse({ headers });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404, headers });
    }

    return NextResponse.json({
      agent_id: updated.id,
      api_key: newApiKey,
      api_key_preview: buildPreview(newApiKey),
      rotated: true,
    }, { headers });
  } catch (error) {
    logServerError(error, 'agents-id-rotate-key');
    return serverErrorResponse({ headers });
  }
}
