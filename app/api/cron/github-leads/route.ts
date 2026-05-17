// GitHub Signal — daily cron that finds repos actively building AI agents.
// Searches for repos using LangChain, AutoGen, CrewAI, OpenAI Agents SDK.
// Saves maintainer contact as a lead for founder outreach.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const FRAMEWORKS = [
  { name: 'langchain', query: 'langchain tool filename:requirements.txt', lang: 'python' },
  { name: 'langchain-js', query: 'langchain filename:package.json', lang: 'javascript' },
  { name: 'autogen', query: 'pyautogen filename:requirements.txt', lang: 'python' },
  { name: 'crewai', query: 'crewai filename:requirements.txt', lang: 'python' },
  { name: 'openai-agents', query: 'openai-agents filename:requirements.txt', lang: 'python' },
  { name: 'openai-agents-js', query: '"@openai/agents" filename:package.json', lang: 'javascript' },
  { name: 'pydantic-ai', query: 'pydantic-ai filename:requirements.txt', lang: 'python' },
];

type GHRepo = {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  updated_at: string;
  owner: { login: string; email?: string | null };
};

type GHUser = {
  login: string;
  email?: string | null;
  name?: string | null;
  company?: string | null;
};

async function searchGitHub(query: string, token?: string): Promise<GHRepo[]> {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&sort=indexed&per_page=20`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];

  const data = await res.json() as { items?: Array<{ repository: GHRepo }> };
  return (data.items ?? []).map(i => i.repository);
}

async function getGitHubUser(login: string, token?: string): Promise<GHUser | null> {
  const headers: Record<string, string> = { accept: 'application/vnd.github+json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com/users/${login}`, { headers });
  if (!res.ok) return null;
  return res.json() as Promise<GHUser>;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  const supabase = getSupabaseAdmin();
  const cutoffDate = new Date(Date.now() - 30 * 86_400_000).toISOString();

  let found = 0;
  let saved = 0;
  const errors: string[] = [];

  for (const fw of FRAMEWORKS) {
    try {
      const repos = await searchGitHub(fw.query, token);

      for (const repo of repos) {
        found++;
        // Only recently active repos
        if (repo.updated_at < cutoffDate) continue;
        // Skip low-signal repos
        if (repo.stargazers_count < 2) continue;

        const ownerLogin = repo.owner?.login;
        if (!ownerLogin) continue;

        // Fetch public user profile for email
        const user = await getGitHubUser(ownerLogin, token);
        const email = user?.email;
        if (!email || !email.includes('@')) continue;

        const intentScore = Math.min(
          40 + Math.floor(repo.stargazers_count / 10),
          95,
        );

        const { error: upsertErr } = await (supabase as any).from('leads').upsert(
          {
            email,
            source: 'github-signal',
            intent: 'high',
            intent_score: intentScore,
            framework: fw.name,
            github_repo: repo.full_name,
            github_stars: repo.stargazers_count,
            company: user?.company ?? null,
            messages: [{
              role: 'system',
              content: `Found via GitHub: ${repo.html_url} (${repo.stargazers_count}★) — uses ${fw.name}`,
            }],
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'email,source,github_repo' },
        );
        if (!upsertErr) saved++;
        else errors.push(upsertErr.message);
      }

      // Respect GitHub rate limit
      await new Promise(r => setTimeout(r, 1200));
    } catch {
      // continue to next framework
    }
  }

  return NextResponse.json({ ok: true, frameworks_searched: FRAMEWORKS.length, repos_found: found, leads_saved: saved, errors: errors.slice(0, 3) });
}
