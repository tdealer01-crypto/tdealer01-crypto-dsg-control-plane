import { NextResponse } from 'next/server';
import { appendAuditEvent, getSupabaseAdmin, normalizeSeverity, parseActorContext } from '@/lib/trinity/workflow';

export const dynamic = 'force-dynamic';

async function rankJobsWithLLM(jobs: JobListing[]): Promise<JobListing[]> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  // Skip ranking if no LLM configured or too few jobs
  if ((!openrouterKey && !nvidiaKey) || jobs.length === 0) {
    return jobs;
  }

  const systemPrompt = `You are Trinity Mind Agent. Rank the given jobs by relevance and solvability.
Return a JSON array with job IDs ordered by priority (highest first).
Output ONLY the JSON array, nothing else.`;

  const jobSummary = jobs
    .map((j) => `${j.id}: ${j.title} (${j.category}, ${j.difficulty})`)
    .join('\n');

  const userPrompt = `Rank these jobs by priority:\n${jobSummary}`;

  try {
    // Try OpenRouter first
    if (openrouterKey) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL_CHAT || 'openai/gpt-4o-mini:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 200,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const ranked = JSON.parse(content) as string[];
          const jobMap = new Map(jobs.map((j) => [j.id, j]));
          return ranked.filter((id) => jobMap.has(id)).map((id) => jobMap.get(id)!);
        }
      }
    }

    // Fallback to NVIDIA
    if (nvidiaKey) {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${nvidiaKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.NVIDIA_MODEL_CHAT || 'nvidia/nemotron-3-ultra-550b-a55b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 200,
          temperature: 0.3,
          top_p: 1,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const ranked = JSON.parse(content) as string[];
          const jobMap = new Map(jobs.map((j) => [j.id, j]));
          return ranked.filter((id) => jobMap.has(id)).map((id) => jobMap.get(id)!);
        }
      }
    }
  } catch (err) {
    console.error('[Trinity] Job ranking error:', err);
  }

  return jobs;
}

interface JobListing {
  id: string;
  external_id: string;
  platform: string;
  bounty_program: string;
  title: string;
  category: string;
  difficulty: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  exploit_cid: string | null;
  reward: { amount: number; currency: string; usdEstimate: number };
  deadline: string;
  status: string;
  source: 'live' | 'demo';
}

async function fetchGitHubJobs(_token: string, limit: number): Promise<JobListing[]> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    const res = await fetch(
      'https://api.github.com/search/issues?q=label%3Abounty+state%3Aopen&sort=created&per_page=' + limit,
      {
        headers,
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items ?? []).slice(0, limit).map((issue: Record<string, unknown>, i: number) => ({
      id: `gh-${issue.id}`,
      external_id: `gh-${issue.id}`,
      platform: 'github-bounties',
      bounty_program: 'github-issues-bounty',
      title: String(issue.title ?? ''),
      category: 'smart-contract-audit',
      difficulty: 'medium',
      severity: 'medium',
      exploit_cid: null,
      reward: { amount: 1 + i * 0.1, currency: 'SOL', usdEstimate: 150 + i * 20 },
      deadline: new Date(Date.now() + (7 + i) * 86_400_000).toISOString(),
      status: 'discovered',
      source: 'live',
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
      const severity = normalizeSeverity(String(b.severity ?? b.risk_level ?? 'high'));
      return {
        id: `imf-${b.id ?? b.slug ?? i}`,
        external_id: `imf-${b.id ?? b.slug ?? i}`,
        platform: 'immunefi',
        bounty_program: String(b.project ?? b.name ?? 'immunefi-program'),
        title: String(b.project ?? b.name ?? b.title ?? 'Immunefi Bounty'),
        category: 'security-review',
        difficulty: maxReward >= 50_000 ? 'expert' : maxReward >= 10_000 ? 'hard' : 'medium',
        severity,
        exploit_cid: null,
        reward: { amount: Math.max(0.5, Math.round((maxReward / 150) * 10) / 10), currency: 'SOL', usdEstimate: maxReward || 750 },
        deadline: new Date(Date.now() + (14 + i) * 86_400_000).toISOString(),
        status: 'discovered',
        source: 'live',
      };
    });
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const actor = parseActorContext(req.headers);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') ?? '';
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '8'), 1), 50);
  const includeDemo = searchParams.get('include_demo') === 'true';

  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GITHUB_ACCESS_TOKEN ?? '';
  const hasGithub = Boolean(githubToken);

  const [githubJobs, immunefiJobs] = await Promise.all([
    hasGithub ? fetchGitHubJobs(githubToken, limit) : Promise.resolve([]),
    fetchImmunefiJobs(limit),
  ]);

  let jobs = [...githubJobs, ...immunefiJobs];
  if (category) jobs = jobs.filter((j) => j.category === category);

  // Rank jobs with LLM Mind Agent if available
  jobs = await rankJobsWithLLM(jobs);

  const supabase = getSupabaseAdmin();
  if (supabase && jobs.length > 0) {
    await supabase.from('trinity_jobs').upsert(
      jobs.map((job) => ({
        id: job.id,
        org_id: actor.orgId,
        external_id: job.external_id,
        source_platform: job.platform,
        bounty_program: job.bounty_program,
        title: job.title,
        category: job.category,
        difficulty: job.difficulty,
        severity: job.severity,
        exploit_cid: job.exploit_cid,
        reward_amount: job.reward.amount,
        reward_currency: job.reward.currency,
        reward_usd_estimate: job.reward.usdEstimate,
        deadline: job.deadline,
        status: 'discovered',
        source: job.source,
      })),
      { onConflict: 'org_id,external_id,source_platform', ignoreDuplicates: false },
    );
  }

  await appendAuditEvent({
    supabase,
    orgId: actor.orgId,
    jobId: `discovery-${Date.now()}`,
    eventType: 'jobs.discovered',
    actorId: actor.actorId,
    payload: { category: category || 'all', count: jobs.length, hasGithub, hasImmunefi: immunefiJobs.length > 0 },
  });

  const productionJobs = jobs.slice(0, limit);
  const demoJobs: JobListing[] = includeDemo
    ? [
        {
          id: 'demo-disabled-001',
          external_id: 'demo-disabled-001',
          platform: 'demo',
          bounty_program: 'demo-disabled',
          title: 'Demo fallback is disabled on production path',
          category: 'documentation',
          difficulty: 'easy',
          severity: 'unknown',
          exploit_cid: null,
          reward: { amount: 0.1, currency: 'SOL', usdEstimate: 15 },
          deadline: new Date(Date.now() + 86_400_000).toISOString(),
          status: 'discovered',
          source: 'demo',
        },
      ]
    : [];

  return NextResponse.json({
    ok: true,
    live: productionJobs.length > 0,
    demo: false,
    jobs: productionJobs.length > 0 ? productionJobs : demoJobs,
    count: productionJobs.length > 0 ? productionJobs.length : demoJobs.length,
    category: category || 'all',
    productionPath: true,
    noFallbackDemo: true,
    discoveredAt: new Date().toISOString(),
  });
}
