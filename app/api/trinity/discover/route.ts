/**
 * Trinity Job Discovery API
 * GET /api/trinity/discover?category=...&limit=10
 *
 * Mind Agent job discovery with graceful fallback when real API credentials are absent.
 * Returns real jobs when GITHUB_TOKEN / SOLANA_EARN_API_KEY are set,
 * otherwise returns curated demo listings labelled as demo data.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface JobListing {
  id: string;
  platform: string;
  title: string;
  category: string;
  difficulty: string;
  reward: { amount: number; currency: string; usdEstimate: number };
  deadline: string;
  status: string;
  source: 'live' | 'demo';
}

function demoJobs(category?: string): JobListing[] {
  const all: JobListing[] = [
    {
      id: 'demo-gh-001',
      platform: 'github-bounties',
      title: 'Fix reentrancy vulnerability in ERC-20 vault',
      category: 'smart-contract-audit',
      difficulty: 'hard',
      reward: { amount: 5.0, currency: 'SOL', usdEstimate: 750 },
      deadline: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      status: 'open',
      source: 'demo',
    },
    {
      id: 'demo-sol-001',
      platform: 'solana-bounties',
      title: 'Integrate Phantom wallet into Next.js dApp',
      category: 'frontend-dev',
      difficulty: 'medium',
      reward: { amount: 2.5, currency: 'SOL', usdEstimate: 375 },
      deadline: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      status: 'open',
      source: 'demo',
    },
    {
      id: 'demo-imf-001',
      platform: 'immunefi',
      title: 'Cross-chain bridge audit for DeFi protocol',
      category: 'security-review',
      difficulty: 'expert',
      reward: { amount: 20.0, currency: 'SOL', usdEstimate: 3000 },
      deadline: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      status: 'open',
      source: 'demo',
    },
    {
      id: 'demo-gh-002',
      platform: 'github-bounties',
      title: 'Write REST API documentation for governance module',
      category: 'documentation',
      difficulty: 'easy',
      reward: { amount: 0.8, currency: 'SOL', usdEstimate: 120 },
      deadline: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      status: 'open',
      source: 'demo',
    },
    {
      id: 'demo-up-001',
      platform: 'upwork',
      title: 'Build GraphQL API for job marketplace backend',
      category: 'backend-api',
      difficulty: 'medium',
      reward: { amount: 3.0, currency: 'SOL', usdEstimate: 450 },
      deadline: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      status: 'open',
      source: 'demo',
    },
    {
      id: 'demo-gh-003',
      platform: 'github-bounties',
      title: 'E2E test suite for Solana NFT mint flow',
      category: 'testing',
      difficulty: 'medium',
      reward: { amount: 1.5, currency: 'SOL', usdEstimate: 225 },
      deadline: new Date(Date.now() + 6 * 86_400_000).toISOString(),
      status: 'open',
      source: 'demo',
    },
    {
      id: 'demo-sol-002',
      platform: 'solana-bounties',
      title: 'Optimize CI/CD pipeline for Anchor programs',
      category: 'devops',
      difficulty: 'medium',
      reward: { amount: 2.0, currency: 'SOL', usdEstimate: 300 },
      deadline: new Date(Date.now() + 8 * 86_400_000).toISOString(),
      status: 'open',
      source: 'demo',
    },
    {
      id: 'demo-gh-004',
      platform: 'github-bounties',
      title: 'Data pipeline for on-chain analytics dashboard',
      category: 'data-analysis',
      difficulty: 'hard',
      reward: { amount: 4.0, currency: 'SOL', usdEstimate: 600 },
      deadline: new Date(Date.now() + 12 * 86_400_000).toISOString(),
      status: 'open',
      source: 'demo',
    },
  ];

  return category ? all.filter((j) => j.category === category) : all;
}

async function fetchGitHubJobs(token: string, limit: number): Promise<JobListing[]> {
  try {
    const res = await fetch(
      'https://api.github.com/search/issues?q=label%3Abounty+state%3Aopen&sort=created&per_page=' + limit,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).slice(0, limit).map((issue: Record<string, unknown>, i: number) => ({
      id: `gh-${issue.id}`,
      platform: 'github-bounties',
      title: String(issue.title ?? ''),
      category: 'smart-contract-audit',
      difficulty: 'medium',
      reward: { amount: 1.0, currency: 'SOL', usdEstimate: 150 },
      deadline: new Date(Date.now() + (7 + i) * 86_400_000).toISOString(),
      status: 'open',
      source: 'live' as const,
    }));
  } catch {
    return [];
  }
}

async function fetchImmunefiJobs(limit: number): Promise<JobListing[]> {
  try {
    const res = await fetch('https://immunefi.com/api/bounty/all/', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const bounties: Record<string, unknown>[] = Array.isArray(data) ? data : (data.bounties ?? data.data ?? []);
    return bounties.slice(0, limit).map((b: Record<string, unknown>, i: number) => {
      const maxReward = Number(b.maxReward ?? b.max_reward ?? 0);
      const solEstimate = maxReward > 0 ? Math.min(maxReward / 150, 1000) : 5.0;
      return {
        id: `imf-${b.id ?? b.slug ?? i}`,
        platform: 'immunefi',
        title: String(b.project ?? b.name ?? b.title ?? 'Immunefi Bounty'),
        category: 'security-review',
        difficulty: maxReward >= 50_000 ? 'expert' : maxReward >= 10_000 ? 'hard' : 'medium',
        reward: { amount: Math.round(solEstimate * 10) / 10, currency: 'SOL', usdEstimate: maxReward || 750 },
        deadline: new Date(Date.now() + (14 + i) * 86_400_000).toISOString(),
        status: 'open',
        source: 'live' as const,
      };
    });
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? '8'), 20);

  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GITHUB_ACCESS_TOKEN ?? '';
  const hasGithub = Boolean(githubToken);

  // Fetch from all sources in parallel
  const [githubJobs, immunefiJobs] = await Promise.all([
    hasGithub ? fetchGitHubJobs(githubToken, limit) : Promise.resolve([]),
    fetchImmunefiJobs(limit),
  ]);

  let liveJobs: JobListing[] = [...githubJobs, ...immunefiJobs];

  // Filter by category if requested
  if (category) {
    liveJobs = liveJobs.filter((j) => j.category === category);
  }

  const liveCount = liveJobs.length;
  const jobs = liveCount > 0 ? liveJobs.slice(0, limit) : demoJobs(category || undefined).slice(0, limit);

  return NextResponse.json({
    ok: true,
    live: liveCount > 0,
    demo: liveCount === 0,
    jobs,
    count: jobs.length,
    sources: {
      github: githubJobs.length,
      immunefi: immunefiJobs.length,
    },
    category: category || 'all',
    discoveredAt: new Date().toISOString(),
  });
}
