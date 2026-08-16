/**
 * Trinity job integrations backed by external APIs and persisted DSG records.
 * No synthetic jobs, rewards, approvals, audit IDs, or transaction proofs are
 * returned when a source is unavailable.
 */

import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null | undefined;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient !== undefined) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    supabaseClient = null;
    return supabaseClient;
  }

  try {
    const parsed = new URL(supabaseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      supabaseClient = null;
      return supabaseClient;
    }
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  } catch {
    supabaseClient = null;
  }
  return supabaseClient;
}

const cache = new Map<string, { data: unknown; expiry: number }>();

async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 5 * 60 * 1000,
): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiry) return cached.data as T;
  const data = await fetcher();
  cache.set(key, { data, expiry: Date.now() + ttlMs });
  return data;
}

function parseExplicitReward(body: unknown): number | null {
  if (typeof body !== 'string') return null;
  const match = body.match(/(?:reward|bounty|prize)\s*[:\-]?\s*\$\s*([0-9]+(?:\.[0-9]+)?)/i)
    ?? body.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*(?:reward|bounty|prize)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function inferDifficulty(labels: Array<{ name?: string }>): 'easy' | 'medium' | 'hard' | 'unspecified' {
  const names = labels.map((label) => label.name?.toLowerCase() ?? '');
  if (names.some((name) => name.includes('hard') || name.includes('advanced'))) return 'hard';
  if (names.some((name) => name.includes('medium') || name.includes('intermediate'))) return 'medium';
  if (names.some((name) => name.includes('easy') || name.includes('beginner') || name.includes('good first issue'))) return 'easy';
  return 'unspecified';
}

export async function discoverJobsReal(
  category?: string,
  difficulty?: string,
  minReward?: number,
): Promise<any> {
  const jobs: any[] = [];
  const sourceErrors: string[] = [];

  try {
    if (!category || category.includes('smart-contract') || category.includes('github')) {
      const githubJobs = await getCachedOrFetch('github-bounties', async () => {
        try {
          const headers: Record<string, string> = {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'dsg-control-plane',
          };
          const token = process.env.GITHUB_TOKEN;
          if (token) headers.Authorization = `Bearer ${token}`;

          const response = await fetch(
            'https://api.github.com/search/issues?q=label:bounty+state:open&sort=updated&order=desc&per_page=10',
            { headers, cache: 'no-store' },
          );
          if (!response.ok) {
            throw new Error(`GITHUB_HTTP_${response.status}`);
          }

          const data = await response.json();
          return (data.items || []).map((issue: any) => ({
            id: `gh-${issue.id}`,
            title: issue.title,
            platform: 'GitHub',
            reward: parseExplicitReward(issue.body),
            reward_currency: parseExplicitReward(issue.body) === null ? null : 'USD',
            difficulty: inferDifficulty(issue.labels || []),
            url: issue.html_url,
            source: issue.repository_url,
          }));
        } catch (error) {
          sourceErrors.push(`github:${error instanceof Error ? error.message : String(error)}`);
          return [];
        }
      });
      jobs.push(...githubJobs);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: dsgJobs, error } = await supabase
          .from('dsg_jobs')
          .select('id,title,reward_sol,difficulty,active')
          .eq('active', true)
          .limit(50);
        if (error) throw error;
        jobs.push(...(dsgJobs || []).map((job: any) => ({
          id: `dsg-${job.id}`,
          title: job.title,
          platform: 'DSG Internal',
          reward: typeof job.reward_sol === 'number' ? job.reward_sol : null,
          reward_currency: typeof job.reward_sol === 'number' ? 'SOL' : null,
          difficulty: job.difficulty || 'unspecified',
          source: 'supabase:dsg_jobs',
        })));
      } catch (error) {
        sourceErrors.push(`supabase:${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      sourceErrors.push('supabase:not_configured');
    }

    let filtered = jobs;
    if (difficulty) filtered = filtered.filter((job) => job.difficulty === difficulty);
    if (minReward !== undefined) {
      filtered = filtered.filter((job) => typeof job.reward === 'number' && job.reward >= minReward);
    }

    return {
      count: filtered.length,
      category: category || 'all',
      jobs: filtered.slice(0, 50),
      source_status: sourceErrors.length === 0 ? 'complete' : 'partial',
      source_errors: sourceErrors,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: 'Failed to discover jobs',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/** Deterministic heuristic only; this is not an external quality certification. */
export function scoreDeliverableQuality(deliverable: string, category?: string): number {
  let score = 60;
  if (deliverable.length > 120) score += 10;
  if (deliverable.includes('Evidence')) score += 10;
  if (category === 'smart-contract-audit' || category === 'security-review') score += 10;
  return Math.min(100, score);
}

export async function executeJobReal(
  jobId: string,
  deliverable: string,
  _executionTimeTarget?: number,
): Promise<any> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: 'Database not configured' };
    if (!jobId || !/^[a-zA-Z0-9\-]{1,100}$/.test(jobId)) return { error: 'Invalid job_id format' };
    if (!deliverable || Buffer.byteLength(deliverable, 'utf-8') > 1024 * 1024) {
      return { error: 'Deliverable exceeds 1MB size limit' };
    }

    const executionId = `exec-${randomUUID()}`;
    const startTime = Date.now();
    const heuristicScore = scoreDeliverableQuality(deliverable);

    const { data, error } = await supabase
      .from('trinity_executions')
      .insert({
        execution_id: executionId,
        job_id: jobId,
        deliverable,
        status: 'completed',
        quality_score: heuristicScore,
        execution_time_ms: Date.now() - startTime,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;

    return {
      execution_id: executionId,
      job_id: jobId,
      status: data.status ?? 'completed',
      heuristic_quality_score: data.quality_score,
      quality_score_type: 'deterministic_heuristic_not_external_verification',
      execution_time_ms: data.execution_time_ms,
      deliverable_size_kb: Buffer.byteLength(deliverable, 'utf-8') / 1024,
      persisted: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: 'Failed to execute job',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function verifyDeliverableReal(
  deliverableId: string,
  qualityCriteria?: string,
): Promise<any> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: 'Database not configured' };
    if (!deliverableId || !/^[a-zA-Z0-9\-]{1,100}$/.test(deliverableId)) {
      return { error: 'Invalid deliverable_id format' };
    }

    const startTime = Date.now();
    const sanitizedCriteria = qualityCriteria?.trim().slice(0, 500) || null;
    const { data: execution, error: readError } = await supabase
      .from('trinity_executions')
      .select('execution_id,deliverable')
      .eq('execution_id', deliverableId)
      .maybeSingle();
    if (readError) throw readError;

    if (!execution?.deliverable) {
      return {
        deliverable_id: deliverableId,
        verification_status: 'review',
        heuristic_quality_score: null,
        issues: ['Deliverable not found — cannot verify'],
        verification_time_ms: Date.now() - startTime,
      };
    }

    const heuristicScore = scoreDeliverableQuality(execution.deliverable);
    const checksTotal = 10;
    const checksPassed = Math.floor(heuristicScore / 10);
    const verificationStatus = heuristicScore >= 80 ? 'heuristic_pass' : 'review';

    const { error } = await supabase
      .from('trinity_verifications')
      .insert({
        deliverable_id: deliverableId,
        quality_criteria: sanitizedCriteria,
        quality_score: heuristicScore,
        verification_status: verificationStatus,
        checks_passed: checksPassed,
        checks_total: checksTotal,
        created_at: new Date().toISOString(),
      });
    if (error) throw error;

    return {
      deliverable_id: deliverableId,
      verification_status: verificationStatus,
      heuristic_quality_score: heuristicScore,
      quality_score_type: 'deterministic_heuristic_not_external_verification',
      checks_passed: checksPassed,
      checks_total: checksTotal,
      issues: heuristicScore < 80 ? ['Heuristic rubric below threshold — needs review'] : [],
      verification_time_ms: Date.now() - startTime,
      persisted: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: 'Failed to verify deliverable',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function settlePaymentReal(executionId: string, amountSol: number): Promise<any> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: 'Database not configured' };
    if (!executionId || !/^[a-zA-Z0-9\-]{1,100}$/.test(executionId)) {
      return { error: 'Invalid execution_id format' };
    }
    if (typeof amountSol !== 'number' || amountSol <= 0 || amountSol > 1_000_000) {
      return { error: 'Invalid amount: must be positive and <= 1000000 SOL' };
    }

    const { error } = await supabase
      .from('trinity_payments')
      .insert({
        execution_id: executionId,
        amount_sol: amountSol,
        transaction_hash: null,
        status: 'pending_manual_review',
        confirmations: 0,
        created_at: new Date().toISOString(),
      });
    if (error) throw error;

    return {
      execution_id: executionId,
      amount_sol: amountSol,
      transaction_hash: null,
      status: 'pending_manual_review',
      confirmations: 0,
      note: 'No on-chain transfer was executed by this function.',
      persisted: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: 'Failed to settle payment',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function validateGovernanceReal(
  policyName: string,
  constraints?: Record<string, any>,
): Promise<any> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: 'Database not configured' };

    const { data: policy, error } = await supabase
      .from('dsg_governance_policies')
      .select('id,name,policy_hash,ccvs_level')
      .eq('name', policyName)
      .maybeSingle();
    if (error) throw error;
    if (!policy) {
      return {
        policy_name: policyName,
        validation_status: 'not_found',
        message: 'Policy not found in governance database',
      };
    }

    // The repository does not contain a verified evaluator that can prove
    // arbitrary caller constraints against this policy record. Do not approve
    // by default and do not invent an audit trail identifier.
    return {
      policy_name: policyName,
      policy_id: policy.id,
      validation_status: 'review',
      constraints_received: Object.keys(constraints || {}).length,
      constraints_satisfied: null,
      deterministic_hash: policy.policy_hash || null,
      ccvs_level: policy.ccvs_level || null,
      audit_trail_id: null,
      reason: 'VERIFIED_POLICY_CONSTRAINT_EVALUATOR_NOT_WIRED',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: 'Failed to validate governance',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
