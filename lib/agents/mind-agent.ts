/**
 * Mind Agent - Job Discovery & Selection
 *
 * Discovers real jobs from 5 platforms and selects best match
 * Part of the 5-agent Trinity system (Mind, Hand, Eye, Nerve, Spine)
 */

import { jobDiscoveryClient } from '../job-discovery/api-clients';
import type { JobListing, AgentProfile } from '../../examples/solana-job-platform/solana_job_marketplace';

interface JobScore {
  job: JobListing;
  score: number;
  breakdown: {
    reward: number;
    difficultyFit: number;
    skillMatch: number;
    urgency: number;
  };
}

/**
 * Mind Agent - Specialized in job discovery and intelligent selection
 */
export class MindAgent {
  private agentName = 'Mind Agent';

  /**
   * Discover jobs from all real platforms
   */
  async discoverJobs(): Promise<JobListing[]> {
    console.log(`\n[${this.agentName}] Starting job discovery across all platforms...`);

    try {
      const jobs = await jobDiscoveryClient.discoverAllJobs();
      console.log(`[${this.agentName}] Discovered ${jobs.length} available jobs`);
      return jobs;
    } catch (err) {
      console.error(`[${this.agentName}] Discovery failed:`, err);
      return [];
    }
  }

  /**
   * Score and rank jobs based on agent profile
   */
  scoreJobs(jobs: JobListing[], profile: AgentProfile): JobScore[] {
    const scores = jobs.map((job) => {
      const breakdown = {
        reward: this.scoreReward(job),
        difficultyFit: this.scoreDifficultyFit(job, profile),
        skillMatch: this.scoreSkillMatch(job, profile),
        urgency: this.scoreUrgency(job),
      };

      const totalScore =
        breakdown.reward +
        breakdown.difficultyFit * 20 +
        breakdown.skillMatch * 15 +
        breakdown.urgency * 10;

      return { job, score: totalScore, breakdown };
    });

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Select the best job for the agent
   */
  selectBestJob(jobs: JobListing[], profile: AgentProfile): JobScore | null {
    if (jobs.length === 0) {
      console.log(`[${this.agentName}] No jobs available`);
      return null;
    }

    const scored = this.scoreJobs(jobs, profile);
    const best = scored[0];

    if (best.score < 10) {
      console.log(`[${this.agentName}] No suitable jobs found (best score: ${best.score})`);
      return null;
    }

    console.log(
      `[${this.agentName}] Selected: "${best.job.title}" (score: ${best.score.toFixed(0)})`,
    );
    console.log(`  Platform: ${best.job.platform} | Reward: ${best.job.reward.amount} ${best.job.reward.currency}`);
    console.log(`  Breakdown:`, best.breakdown);

    return best;
  }

  /**
   * Score job based on reward amount
   */
  private scoreReward(job: JobListing): number {
    const minReward = 100;
    const maxReward = 10000;
    const normalized =
      Math.max(0, Math.min(job.reward.usdEstimate, maxReward) - minReward) /
      (maxReward - minReward);
    return normalized * 50;
  }

  /**
   * Score job based on difficulty fit with agent tier
   */
  private scoreDifficultyFit(job: JobListing, profile: AgentProfile): number {
    const diffMap: Record<string, number> = { easy: 1, medium: 2, hard: 3, expert: 4 };
    const tierMap: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };

    const jobDiff = diffMap[job.difficulty] || 2;
    const profileTier = tierMap[profile.tier] || 1;

    const fit = 1 - Math.abs(jobDiff - profileTier) / 4;
    return Math.max(0, fit);
  }

  /**
   * Score job based on skill match
   */
  private scoreSkillMatch(job: JobListing, profile: AgentProfile): number {
    const jobReqs = job.requirements.map((r) => r.toLowerCase());
    const agentSkills = profile.skills.map((s) => s.toLowerCase());

    const matches = jobReqs.filter((req) =>
      agentSkills.some((skill) => req.includes(skill) || skill.includes(req.split(' ')[0])),
    ).length;

    return matches / Math.max(jobReqs.length, 1);
  }

  /**
   * Score job based on deadline urgency
   */
  private scoreUrgency(job: JobListing): number {
    const deadline = new Date(job.deadline);
    const now = new Date();
    const daysLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysLeft < 0) return 0; // Expired
    if (daysLeft < 1) return 1; // Due today
    if (daysLeft < 7) return 0.8; // Due this week
    if (daysLeft < 30) return 0.5; // Due this month
    return 0.2; // Future deadline
  }

  /**
   * Analyze platform distribution and quality
   */
  async analyzeJobMarket(jobs: JobListing[]): Promise<void> {
    const byPlatform = new Map<string, number>();

    jobs.forEach((job) => {
      byPlatform.set(job.platform, (byPlatform.get(job.platform) || 0) + 1);
    });

    console.log(`\n[${this.agentName}] Market Analysis:`);
    console.log(`  Total opportunities: ${jobs.length}`);
    console.log('  By platform:');
    byPlatform.forEach((count, platform) => {
      console.log(`    - ${platform}: ${count} jobs`);
    });

    const avgReward =
      jobs.reduce((sum, j) => sum + j.reward.usdEstimate, 0) / Math.max(jobs.length, 1);
    console.log(`  Average reward: $${avgReward.toFixed(0)}`);
  }
}

/**
 * Singleton Mind Agent instance
 */
export const mindAgent = new MindAgent();

/**
 * Export functions for external use
 */
export async function discoverJobs(): Promise<JobListing[]> {
  return mindAgent.discoverJobs();
}

export function selectBestJob(
  jobs: JobListing[],
  profile: AgentProfile,
): { job: JobListing; score: number } | null {
  const selection = mindAgent.selectBestJob(jobs, profile);
  if (selection) {
    return { job: selection.job, score: selection.score };
  }
  return null;
}
