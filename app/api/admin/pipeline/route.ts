import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { getRateLimitKey, applyRateLimit, buildRateLimitHeaders } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Rate limit: 10 calls per minute per IP
  const rateLimitKey = getRateLimitKey(request, 'admin:pipeline');
  const rateLimitResult = await applyRateLimit({
    key: rateLimitKey,
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult, 10),
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token')
    ?? request.headers.get('authorization')?.replace('Bearer ', '');

  const validTokens = [process.env.CRON_SECRET, process.env.PIPELINE_TOKEN].filter(Boolean);
  if (!validTokens.length || !validTokens.includes(token ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: leads } = await (admin as any)
    .from('leads')
    .select('id,email,source,intent,intent_score,framework,github_repo,company,outreach_sent,outreach_sent_at,messages,last_seen_at')
    .order('intent_score', { ascending: false })
    .limit(200);

  const all = (leads ?? []) as Array<{
    id: string;
    email: string;
    source: string;
    intent: string;
    intent_score: number;
    framework: string | null;
    github_repo: string | null;
    company: string | null;
    outreach_sent: boolean;
    outreach_sent_at: string | null;
    messages: Array<{ role: string; sent_at?: string }> | null;
    last_seen_at: string;
  }>;

  const replied = all.filter(l =>
    l.messages?.some(m => m.role === 'reply')
  );
  const followedUp = all.filter(l =>
    l.messages?.some(m => m.role === 'followup')
  );
  const invited = all.filter(l =>
    l.messages?.some(m => m.role === 'trial_invite')
  );

  return NextResponse.json({
    ok: true,
    summary: {
      total: all.length,
      outreach_sent: all.filter(l => l.outreach_sent).length,
      replied: replied.length,
      followed_up: followedUp.length,
      trial_invited: invited.length,
      unsubscribed: all.filter(l => l.intent === 'unsubscribed').length,
    },
    replied_leads: replied.map(l => ({
      email: l.email,
      company: l.company,
      framework: l.framework,
      intent_score: l.intent_score,
      last_seen_at: l.last_seen_at,
    })),
    top_leads: all.slice(0, 20).map(l => ({
      email: l.email,
      company: l.company,
      framework: l.framework,
      intent_score: l.intent_score,
      outreach_sent: l.outreach_sent,
      intent: l.intent,
      replied: l.messages?.some(m => m.role === 'reply') ?? false,
    })),
  });
}
