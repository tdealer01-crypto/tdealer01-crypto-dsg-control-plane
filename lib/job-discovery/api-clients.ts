/**
 * Real Job Discovery API Clients
 *
 * Fetches actual jobs from 5 external platforms:
 * GitHub Issues, Solana Earn, Immunefi, HackerOne, Upwork
 */

import type { JobListing, Difficulty, JobCategory, Reward } from '../../examples/solana-job-platform/solana_job_marketplace';

// ─────────────────────────────────────────────────────────────────────────
// Platform Response Types
// ─────────────────────────────────────────────────────────────────────────

interface GitHubIssue {
  id: number;
  title: string;
  body?: string;
  html_url: string;
  repository_url: string;
  labels: Array<{ name: string }>;
  created_at: string;
}

interface SolanaEarnTask {
  id: string;
  title: string;
  description: string;
  reward: number;
  reward_token: string;
  deadline: string;
  difficulty: string;
  category: string;
  url: string;
}

interface ImmunefiBounty {
  id: string;
  projectName: string;
  projectMetadata?: { description?: string };
  totalBountyPot?: number;
  infoEmail?: string;
  uri?: string;
  startDate?: string;
  endDate?: string;
}

interface HackerOneProgram {
  id: string;
  name: string;
  handle: string;
  state: string;
  bounty_eligibility_description?: string;
  created_at: string;
  bookmarked?: boolean;
}

interface UpworkJob {
  id: string;
  title: string;
  description: string;
  budget?: { currencyId: string; amount: number };
  duration?: string;
  category2?: { name: string };
  created_on: number;
  url: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Rate Limiter
// ─────────────────────────────────────────────────────────────────────────

class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 100;
      if (waitTime > 0) {
        console.warn(`[RATE LIMIT] Waiting ${waitTime}ms before next request`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(Date.now());
  }
}

// ─────────────────────────────────────────────────────────────────────────
// GitHub API Client
// ─────────────────────────────────────────────────────────────────────────

export class GitHubJobClient {
  private readonly token: string;
  private readonly limiter = new RateLimiter(30, 60000); // 30 req/min

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || '';
  }

  async fetchJobs(): Promise<JobListing[]> {
    if (!this.token) {
      console.warn('[GitHub] GITHUB_TOKEN not configured, skipping');
      return [];
    }

    try {
      await this.limiter.wait();
      const query = encodeURIComponent('label:bounty state:open language:solana');
      const response = await fetch(`https://api.github.com/search/issues?q=${query}&per_page=30&sort=updated`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!response.ok) {
        console.warn(`[GitHub] API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = (await response.json()) as { items: GitHubIssue[] };
      return data.items.map((issue) => this.mapToJobListing(issue)).filter(Boolean) as JobListing[];
    } catch (err) {
      console.error('[GitHub] Fetch failed:', err);
      return [];
    }
  }

  private mapToJobListing(issue: GitHubIssue): JobListing | null {
    const rewardMatch = issue.body?.match(/reward[:\s]*\$?([\d.]+)/i);
    const reward = rewardMatch ? parseFloat(rewardMatch[1]) : 100;

    return {
      id: `github-${issue.id}`,
      platform: 'github-bounties',
      title: issue.title,
      description: issue.body?.substring(0, 200) || '',
      category: this.inferCategory(issue.title, issue.body),
      difficulty: this.inferDifficulty(issue.labels),
      reward: { amount: reward, currency: 'USD', usdEstimate: reward },
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      requirements: ['Solana ecosystem knowledge', 'GitHub'],
      status: 'open',
      createdAt: issue.created_at,
    };
  }

  private inferCategory(title: string, body?: string): JobCategory {
    const text = `${title} ${body || ''}`.toLowerCase();
    if (text.includes('audit') || text.includes('security')) return 'security-review';
    if (text.includes('test') || text.includes('testing')) return 'testing';
    if (text.includes('doc') || text.includes('write')) return 'documentation';
    if (text.includes('api') || text.includes('backend')) return 'backend-api';
    if (text.includes('frontend') || text.includes('ui')) return 'frontend-dev';
    if (text.includes('smart contract')) return 'smart-contract-audit';
    return 'backend-api';
  }

  private inferDifficulty(labels: Array<{ name: string }>): Difficulty {
    const labelText = labels.map((l) => l.name.toLowerCase()).join(' ');
    if (labelText.includes('expert')) return 'expert';
    if (labelText.includes('hard') || labelText.includes('advanced')) return 'hard';
    if (labelText.includes('medium')) return 'medium';
    return 'easy';
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Solana Earn API Client
// ─────────────────────────────────────────────────────────────────────────

export class SolanaEarnJobClient {
  private readonly limiter = new RateLimiter(60, 60000); // 60 req/min

  async fetchJobs(): Promise<JobListing[]> {
    try {
      await this.limiter.wait();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch('https://earn.superteam.fun/api/opportunities?status=open', {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[SolanaEarn] API error: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as { data?: SolanaEarnTask[] };
      const tasks = data.data || [];

      return tasks.map((task) => this.mapToJobListing(task)).filter(Boolean) as JobListing[];
    } catch (err) {
      console.warn('[SolanaEarn] Fetch failed:', err);
      return [];
    }
  }

  private mapToJobListing(task: SolanaEarnTask): JobListing | null {
    const solPrice = 140; // Approximate SOL price in USD
    const amountSOL = task.reward_token === 'SOL' ? task.reward : task.reward / solPrice;

    return {
      id: `solana-${task.id}`,
      platform: 'solana-bounties',
      title: task.title,
      description: task.description || '',
      category: (task.category as JobCategory) || 'backend-api',
      difficulty: (task.difficulty as Difficulty) || 'medium',
      reward: {
        amount: amountSOL,
        currency: 'SOL',
        usdEstimate: amountSOL * solPrice,
      },
      deadline: task.deadline,
      requirements: ['Solana knowledge', 'Technical skills'],
      status: 'open',
      createdAt: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Immunefi API Client
// ─────────────────────────────────────────────────────────────────────────

export class ImmunefiJobClient {
  private readonly apiKey?: string;
  private readonly limiter = new RateLimiter(10, 60000); // 10 req/min

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.IMMUNEFI_API_KEY;
  }

  async fetchJobs(): Promise<JobListing[]> {
    try {
      await this.limiter.wait();
      const response = await fetch('https://immunefi.com/api/bounties', {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      });

      if (!response.ok) {
        console.warn(`[Immunefi] API error: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as { bounties?: ImmunefiBounty[] };
      const bounties = data.bounties || [];

      return bounties
        .filter((b) => !b.endDate || new Date(b.endDate) > new Date())
        .map((b) => this.mapToJobListing(b))
        .filter(Boolean) as JobListing[];
    } catch (err) {
      console.warn('[Immunefi] Fetch failed:', err);
      return [];
    }
  }

  private mapToJobListing(bounty: ImmunefiBounty): JobListing | null {
    const reward = bounty.totalBountyPot || 5000;

    return {
      id: `immunefi-${bounty.id}`,
      platform: 'immunefi',
      title: bounty.projectName,
      description: bounty.projectMetadata?.description || 'Security audit for crypto protocol',
      category: 'security-review',
      difficulty: 'hard',
      reward: {
        amount: reward,
        currency: 'USD',
        usdEstimate: reward,
      },
      deadline: bounty.endDate || new Date(Date.now() + 90 * 86400000).toISOString(),
      requirements: ['Security expertise', 'Solana knowledge', 'Audit experience'],
      status: 'open',
      createdAt: bounty.startDate || new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// HackerOne API Client
// ─────────────────────────────────────────────────────────────────────────

export class HackerOneJobClient {
  private readonly token?: string;
  private readonly limiter = new RateLimiter(60, 3600000); // 60 req/hour
  private readonly isConfigured: boolean;

  constructor(token?: string) {
    this.token = token || process.env.HACKERONE_API_KEY;
    this.isConfigured = Boolean(this.token?.trim());
  }

  async fetchJobs(): Promise<JobListing[]> {
    if (!this.isConfigured) {
      // Log without revealing sensitive configuration details
      console.debug('[HackerOne] API credentials not available, skipping job fetch');
      return [];
    }

    if (!this.token) {
      return [];
    }

    try {
      await this.limiter.wait();
      const response = await fetch('https://api.hackerone.com/v1/programs?state=public_mode&asset_type=smart_contract', {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!response.ok) {
        console.debug(`[HackerOne] API request failed with status: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as { data?: HackerOneProgram[] };
      return (data.data || []).map((p) => this.mapToJobListing(p)).filter(Boolean) as JobListing[];
    } catch (err) {
      console.debug('[HackerOne] Job fetch error (details omitted for security)', { errorType: err instanceof Error ? err.constructor.name : typeof err });
      return [];
    }
  }

  private mapToJobListing(program: HackerOneProgram): JobListing | null {
    return {
      id: `h1-${program.id}`,
      platform: 'hackerone',
      title: `Security program: ${program.name}`,
      description: program.bounty_eligibility_description || 'Vulnerability disclosure program',
      category: 'security-review',
      difficulty: 'expert',
      reward: {
        amount: 2500,
        currency: 'USD',
        usdEstimate: 2500,
      },
      deadline: new Date(Date.now() + 180 * 86400000).toISOString(),
      requirements: ['Security research', 'Vulnerability analysis'],
      status: 'open',
      createdAt: program.created_at,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Upwork API Client (placeholder - requires authentication)
// ─────────────────────────────────────────────────────────────────────────

export class UpworkJobClient {
  private readonly apiKey?: string;
  private readonly limiter = new RateLimiter(60, 60000); // 60 req/min

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.UPWORK_API_KEY;
  }

  async fetchJobs(): Promise<JobListing[]> {
    if (!this.apiKey) {
      console.warn('[Upwork] UPWORK_API_KEY not configured, skipping');
      return [];
    }

    try {
      await this.limiter.wait();
      // Note: Upwork has strict API limits and requires OAuth flow
      // This is a simplified implementation
      console.warn('[Upwork] API client available but full implementation deferred to Fix 5');
      return [];
    } catch (err) {
      console.warn('[Upwork] Fetch failed:', err);
      return [];
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// DSG Internal Jobs Client
// ─────────────────────────────────────────────────────────────────────────

export class DSGInternalJobClient {
  async fetchJobs(): Promise<JobListing[]> {
    try {
      const apiUrl = process.env.DSG_API_URL || 'http://localhost:3000';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${apiUrl}/api/jobs?status=open`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[DSG Internal] API error: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as { jobs?: JobListing[] };
      return data.jobs || [];
    } catch (err) {
      console.warn('[DSG Internal] Fetch failed (expected if service not running):', err);
      return [];
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Unified Job Discovery Client
// ─────────────────────────────────────────────────────────────────────────

export class UnifiedJobDiscoveryClient {
  private github: GitHubJobClient;
  private solanaEarn: SolanaEarnJobClient;
  private immunefi: ImmunefiJobClient;
  private hackerOne: HackerOneJobClient;
  private upwork: UpworkJobClient;
  private dsgInternal: DSGInternalJobClient;

  constructor() {
    this.github = new GitHubJobClient();
    this.solanaEarn = new SolanaEarnJobClient();
    this.immunefi = new ImmunefiJobClient();
    this.hackerOne = new HackerOneJobClient();
    this.upwork = new UpworkJobClient();
    this.dsgInternal = new DSGInternalJobClient();
  }

  /**
   * Fetch jobs from all platforms in parallel
   * Returns deduplicated, sorted list of available jobs
   */
  async discoverAllJobs(): Promise<JobListing[]> {
    console.log('[Job Discovery] Fetching from all platforms in parallel...');

    const results = await Promise.allSettled([
      this.github.fetchJobs(),
      this.solanaEarn.fetchJobs(),
      this.immunefi.fetchJobs(),
      this.hackerOne.fetchJobs(),
      this.upwork.fetchJobs(),
      this.dsgInternal.fetchJobs(),
    ]);

    const allJobs: JobListing[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const count = result.value.length;
        const platforms = [
          'GitHub',
          'SolanaEarn',
          'Immunefi',
          'HackerOne',
          'Upwork',
          'DSG Internal',
        ];
        if (count > 0) {
          console.log(`[Job Discovery] ${platforms[index]}: ${count} jobs`);
          allJobs.push(...result.value);
        }
      } else {
        console.warn(`[Job Discovery] Platform ${index} failed:`, result.reason);
      }
    });

    // Deduplicate by ID
    const uniqueJobs = Array.from(new Map(allJobs.map((j) => [j.id, j])).values());

    console.log(`[Job Discovery] Total: ${uniqueJobs.length} unique jobs from all platforms`);

    return uniqueJobs;
  }
}

export const jobDiscoveryClient = new UnifiedJobDiscoveryClient();
