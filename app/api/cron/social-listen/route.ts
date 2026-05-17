// Social Listening — daily cron that monitors Reddit & HackerNews for
// people describing problems that DSG solves.
// High-intent signals: "AI agent did something unexpected", "how to audit LLM"
// Saves as leads + sends founder alert for hot signals.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { sendFounderAlertFirstBlock } from '../../../../lib/email/sales';

export const dynamic = 'force-dynamic';

const REDDIT_SUBS = ['MachineLearning', 'LangChain', 'LocalLLaMA', 'OpenAI', 'AIAssistants', 'artificial'];

const HOT_KEYWORDS = [
  'agent went rogue', 'agent did unexpected', 'llm tool call', 'agent audit',
  'control my agent', 'ai agent governance', 'agent access control',
  'agent safety', 'tool use control', 'llm did something', 'agent behavior',
  'monitor ai agent', 'log agent actions', 'agent oversight',
];

const BUY_SIGNALS = [
  'how do i', 'how to', 'is there a tool', 'any library', 'looking for',
  'does anyone know', 'what do you use', 'recommendation', 'best way to',
];

type RedditPost = {
  title: string;
  selftext: string;
  author: string;
  url: string;
  score: number;
  created_utc: number;
  permalink: string;
};

type HNItem = {
  objectID: string;
  title: string;
  url?: string;
  author: string;
  points: number;
  created_at: string;
  story_text?: string;
};

function scorePost(title: string, body: string): { score: number; matched: string[] } {
  const text = (title + ' ' + body).toLowerCase();
  const matched: string[] = [];
  let score = 0;

  for (const kw of HOT_KEYWORDS) {
    if (text.includes(kw)) { score += 30; matched.push(kw); }
  }
  for (const bs of BUY_SIGNALS) {
    if (text.includes(bs)) { score += 20; matched.push(bs); }
  }

  return { score: Math.min(score, 100), matched };
}

async function fetchReddit(subreddit: string): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=25&t=day`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DSGGrowthBot/1.0' },
  });
  if (!res.ok) return [];
  const data = await res.json() as { data?: { children?: Array<{ data: RedditPost }> } };
  return (data.data?.children ?? []).map(c => c.data);
}

async function fetchHN(): Promise<HNItem[]> {
  const queries = ['ai agent governance', 'llm tool control', 'agent audit trail'];
  const results: HNItem[] = [];

  for (const q of queries) {
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=story&numericFilters=created_at_i>${Math.floor(Date.now() / 1000) - 86400}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json() as { hits?: HNItem[] };
    results.push(...(data.hits ?? []).slice(0, 10));
  }

  return results;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const alerts: string[] = [];
  let saved = 0;

  // ── Reddit ────────────────────────────────────────────────────────────────
  for (const sub of REDDIT_SUBS) {
    try {
      const posts = await fetchReddit(sub);
      for (const post of posts) {
        const { score, matched } = scorePost(post.title, post.selftext);
        if (score < 30) continue;

        const fakeEmail = `reddit_${post.author}@social-lead.dsg.internal`;

        await (supabase as any).from('leads').upsert(
          {
            email: fakeEmail,
            source: 'reddit-signal',
            intent: score >= 60 ? 'high' : 'browse',
            intent_score: score,
            framework: 'reddit',
            company: `r/${sub}`,
            messages: [{
              role: 'system',
              content: `Reddit r/${sub}: "${post.title}" — score ${score} — matched: ${matched.join(', ')} — ${post.url}`,
            }],
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'email,source,github_repo' },
        );
        saved++;

        if (score >= 60) {
          alerts.push(`[Reddit r/${sub}] "${post.title}" score=${score}`);
        }
      }
      await new Promise(r => setTimeout(r, 500));
    } catch { /* skip failed subreddit */ }
  }

  // ── HackerNews ────────────────────────────────────────────────────────────
  try {
    const hnItems = await fetchHN();
    for (const item of hnItems) {
      const { score, matched } = scorePost(item.title, item.story_text ?? '');
      if (score < 30) continue;

      const fakeEmail = `hn_${item.author}@social-lead.dsg.internal`;
      await (supabase as any).from('leads').upsert(
        {
          email: fakeEmail,
          source: 'hn-signal',
          intent: score >= 60 ? 'high' : 'browse',
          intent_score: score,
          framework: 'hackernews',
          messages: [{
            role: 'system',
            content: `HN: "${item.title}" — score ${score} — matched: ${matched.join(', ')} — https://news.ycombinator.com/item?id=${item.objectID}`,
          }],
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'email,source,github_repo' },
      );
      saved++;

      if (score >= 60) {
        alerts.push(`[HN] "${item.title}" score=${score}`);
      }
    }
  } catch { /* skip HN failure */ }

  // ── Founder alert if hot signals found ───────────────────────────────────
  if (alerts.length > 0 && process.env.FOUNDER_EMAIL) {
    void sendFounderAlertFirstBlock({
      orgId: 'social-listen',
      workspaceName: `${alerts.length} hot signal(s) today`,
      email: process.env.FOUNDER_EMAIL,
      action: alerts.slice(0, 3).join(' | '),
      reason: 'Social listening detected high-intent posts — reach out now',
    });
  }

  return NextResponse.json({ ok: true, leads_saved: saved, hot_alerts: alerts.length, alerts });
}
