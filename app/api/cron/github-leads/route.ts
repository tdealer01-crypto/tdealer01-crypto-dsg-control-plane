// GitHub Signal — daily cron that finds repos actively building AI agents.
// Searches for repos using LangChain, AutoGen, CrewAI, OpenAI Agents SDK.
// Saves maintainer contact as a lead for founder outreach.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { requireCronAuth } from '../../../../lib/security/cron-auth';

export const dynamic = 'force-dynamic';

const FRAMEWORKS = [
  { name: 'langchain', query: 'langchain tool filename:requirements.txt', lang: 'python' },
  { name: 'langchain-js', query: 'langchain filename:package.json', lang: 'javascript' },
  { name: 'autogen', query: 'pyautogen filename:requirements.txt', lang: 'python' },
  { name: 'crewai', query: 'crewai filename:requirements.txt', lang: 'python' },
  { name: 'openai-agents', query: 'openai-agents filename:requirements.txt', lang: 'python' },
  { name: 'openai-agents-js', query: '"@openai/agents" filename:package.json', lang: 'javascript' },
  { name: 'pydantic-ai', query: 'pydantic-ai filename:requirements.txt', lang: 'python' },
] as const;

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

type LeadInsert = {
  email: string;
  source: 'github-signal';
  intent: 'high';
  intent_score: number;
  framework: string;
  github_repo: string;
  github_stars: number;
  company: string | null;
  messages: Array<{ role: 'system'; content: string }>;
  last_seen_at: string;
};

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidRepoName(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 255 && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
}

function validateLead(input: {
  email: unknown;
  framework: string;
  repo: GHRepo;
  user: GHUser;
  intentScore: number;
}): LeadInsert | null {
  if (!isValidEmail(input.email)) return null;
  if (!isValidRepoName(input.repo.full_name)) return null;

  const stars = Number(input.repo.stargazers_count);
  if (!Number.isInteger(stars) || stars < 0) return null;

  return {
    email: input.email,
    source: 'github-signal',
    intent: 'high',
    intent_score: Math.max(0, Math.min(100, Math.trunc(input.intentScore))),
    framework: input.framework.slice(0, 50),
    github_repo: input.repo.full_name,
    github_stars: stars,
    company: truncate(input.user.company, 255),
    messages: [{
      role: 'system',
      content: `Found via GitHub: ${input.repo.html_url} (${stars}★) — uses ${input.framework}`.slice(0, 1000),
    }],
    last_seen_at: new Date().toISOString(),
  };
}

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
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers });
  if (!res.ok) return null;
  return res.json() as Promise<GHUser>;
}

export async function GET(request: Request) {
  const auth = requireCronAuth(request, 'github-leads');
  if (!auth.ok) return auth.response;

  const token = process.env.GITHUB_TOKEN;
  const supabase = getSupabaseAdmin() as any;
  const cutoffDate = new Date(Date.now() - 30 * 86_400_000).toISOString();

  let found = 0;
  let saved = 0;
  const errors: string[] = [];

  for (const fw of FRAMEWORKS) {
    try {
      const repos = await searchGitHub(fw.query, token);

      for (const repo of repos) {
        found++;
        if (repo.updated_at < cutoffDate) continue;
        if (repo.stargazers_count < 20) continue;

        const ownerLogin = repo.owner?.login;
        if (!ownerLogin) continue;

        const user = await getGitHubUser(ownerLogin, token);
        if (!user) continue;

        const intentScore = Math.min(40 + Math.floor(repo.stargazers_count / 10), 95);
        const validated = validateLead({
          email: user.email,
          framework: fw.name,
          repo,
          user,
          intentScore,
        });
        if (!validated) continue;

        const { error: insertErr } = await supabase.from('leads').insert(validated);
        if (!insertErr) saved++;
        else if (insertErr.code !== '23505') errors.push(String(insertErr.message ?? 'insert failed'));
      }

      await new Promise(r => setTimeout(r, 1200));
    } catch {
      // Continue to next framework without leaking provider details.
    }
  }

  return NextResponse.json(
    { ok: true, frameworks_searched: FRAMEWORKS.length, repos_found: found, leads_saved: saved, errors: errors.slice(0, 3) },
    { headers: auth.headers },
  );
}
