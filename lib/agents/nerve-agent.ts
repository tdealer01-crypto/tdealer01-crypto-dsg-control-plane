/**
 * Nerve Agent - Payment Settlement & Reputation Management
 *
 * Manages agent payments, reputation tracking, and tier progression
 * Part of the 5-agent Trinity system
 */

import { SolanaClient } from '../solana/client';
// import { agentProfileManager } from '../supabase/agent-profile'; // TODO: Reactivate when agent_profiles table exists
import type {
  JobListing,
  AgentProfile,
  EarningsRecord,
  AgentTier,
} from '../../examples/solana-job-platform/solana_job_marketplace';

interface PaymentResult {
  success: boolean;
  txSignature?: string;
  amount: number;
  earningsRecord?: EarningsRecord;
  error?: string;
}

interface ReputationUpdate {
  newReputation: number;
  reputationChange: number;
  newTier: AgentTier;
  tierChanged: boolean;
}

/**
 * Nerve Agent - Specialized in payments and reputation
 */
export class NerveAgent {
  private agentName = 'Nerve Agent';
  private readonly REPUTATION_GAIN_PER_JOB = 2;
  private readonly REPUTATION_PENALTY_FAILED = -5;
  private readonly REPUTATION_BONUS_QUALITY = 3;

  /**
   * Process payment for completed job
   */
  async settlePayment(job: JobListing, profile: AgentProfile): Promise<PaymentResult> {
    console.log(`\n[${this.agentName}] Settling payment: ${job.reward.amount} ${job.reward.currency}`);

    try {
      // Initialize Solana client
      SolanaClient.initializeSolana();

      // Check wallet balance
      const balance = await SolanaClient.getWalletBalance();
      console.log(`[${this.agentName}] Wallet balance: ${balance.toFixed(2)} SOL`);

      if (balance < job.reward.amount && job.reward.currency === 'SOL') {
        return {
          success: false,
          amount: job.reward.amount,
          error: `Insufficient balance. Have ${balance.toFixed(2)} SOL, need ${job.reward.amount}`,
        };
      }

      // Execute transfer
      const signature = await SolanaClient.transferSOL(profile.walletAddress, job.reward.amount);

      // Create earnings record
      const earningsRecord: EarningsRecord = {
        jobId: job.id,
        agentId: profile.agentId,
        amount: job.reward.amount,
        currency: job.reward.currency,
        txSignature: signature,
        timestamp: new Date().toISOString(),
      };

      // Persist to Supabase
      try {
        // TODO: Reactivate when agentProfileManager is available
        // await agentProfileManager.recordEarnings({
        //   job_id: job.id,
        //   agent_id: profile.agentId,
        //   amount: job.reward.amount,
        //   currency: job.reward.currency,
        //   tx_signature: signature,
        // });
        console.warn(
          `[${this.agentName}] ⚠️ Earnings NOT persisted — agentProfileManager unavailable (recordEarnings disabled); tx ${signature} settled on-chain only`,
        );
      } catch (err) {
        console.warn(`[${this.agentName}] ⚠️ Failed to persist earnings:`, err);
      }

      console.log(`[${this.agentName}] ✅ Payment successful: ${signature.substring(0, 20)}...`);

      return {
        success: true,
        txSignature: signature,
        amount: job.reward.amount,
        earningsRecord,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[${this.agentName}] Payment failed:`, errorMsg);

      return {
        success: false,
        amount: job.reward.amount,
        error: errorMsg,
      };
    }
  }

  /**
   * Update agent reputation based on job performance
   */
  updateReputation(
    profile: AgentProfile,
    qualityScore: number,
    jobSuccessful: boolean = true,
  ): ReputationUpdate {
    console.log(`\n[${this.agentName}] Updating reputation for ${profile.agentId}`);

    let reputationChange = 0;

    if (jobSuccessful) {
      // Base reputation gain
      reputationChange += this.REPUTATION_GAIN_PER_JOB;

      // Quality bonus
      if (qualityScore >= 90) {
        reputationChange += this.REPUTATION_BONUS_QUALITY;
        console.log(`[${this.agentName}] ✅ High quality bonus (+${this.REPUTATION_BONUS_QUALITY})`);
      }
    } else {
      // Failure penalty
      reputationChange += this.REPUTATION_PENALTY_FAILED;
      console.log(`[${this.agentName}] ❌ Failure penalty (${this.REPUTATION_PENALTY_FAILED})`);
    }

    // Update reputation
    const oldReputation = profile.reputation;
    profile.reputation = Math.max(0, Math.min(100, profile.reputation + reputationChange));
    const newReputation = profile.reputation;

    // Check tier progression
    const oldTier = profile.tier;
    const newTier = this.calculateTier(profile.completedJobs + (jobSuccessful ? 1 : 0), newReputation);
    const tierChanged = oldTier !== newTier;

    if (tierChanged) {
      profile.tier = newTier;
      console.log(`[${this.agentName}] 🎉 Tier progression: ${oldTier} → ${newTier}`);
    }

    console.log(
      `[${this.agentName}] Reputation: ${oldReputation} → ${newReputation} (change: ${reputationChange >= 0 ? '+' : ''}${reputationChange})`,
    );

    // Persist to Supabase asynchronously (non-blocking)
    this.persistReputationUpdate(profile.agentId, reputationChange).catch((err) => {
      console.warn(`[${this.agentName}] ⚠️ Failed to persist reputation update:`, err);
    });

    return {
      newReputation,
      reputationChange,
      newTier,
      tierChanged,
    };
  }

  /**
   * Persist reputation update to Supabase
   */
  private async persistReputationUpdate(agentId: string, reputationChange: number): Promise<void> {
    try {
      // TODO: Reactivate when agentProfileManager is available
      // await agentProfileManager.updateReputation(agentId, reputationChange);
      console.log(`[${this.agentName}] ✅ Reputation update queued (persistence not yet enabled)`);
    } catch (err) {
      console.error(`[${this.agentName}] Failed to queue reputation update:`, err);
      throw err;
    }
  }

  /**
   * Calculate agent tier based on completion count and reputation
   */
  private calculateTier(completedJobs: number, reputation: number): AgentTier {
    // Tier progression: Bronze -> Silver -> Gold -> Platinum
    const tierRequirements = [
      { tier: 'bronze' as AgentTier, jobs: 0, reputation: 0 },
      { tier: 'silver' as AgentTier, jobs: 5, reputation: 40 },
      { tier: 'gold' as AgentTier, jobs: 25, reputation: 70 },
      { tier: 'platinum' as AgentTier, jobs: 100, reputation: 90 },
    ];

    for (let i = tierRequirements.length - 1; i >= 0; i--) {
      const req = tierRequirements[i];
      if (completedJobs >= req.jobs && reputation >= req.reputation) {
        return req.tier;
      }
    }

    return 'bronze';
  }

  /**
   * Calculate payout including fees and taxes
   */
  calculatePayout(
    grossAmount: number,
    platformFeePercent: number = 10,
    taxPercent: number = 2,
  ): {
    gross: number;
    platformFee: number;
    tax: number;
    net: number;
  } {
    const platformFee = (grossAmount * platformFeePercent) / 100;
    const tax = ((grossAmount - platformFee) * taxPercent) / 100;
    const net = grossAmount - platformFee - tax;

    return {
      gross: grossAmount,
      platformFee,
      tax,
      net,
    };
  }

  /**
   * Generate payment statement
   */
  generatePaymentStatement(
    profile: AgentProfile,
    earnings: number,
    period: string = 'all-time',
  ): string {
    const statement = `
=== Payment Statement ===
Agent: ${profile.agentId}
Period: ${period}
Generated: ${new Date().toISOString()}

Total Earnings: ${earnings.toFixed(2)} SOL
Completed Jobs: ${profile.completedJobs}
Current Tier: ${profile.tier.toUpperCase()}
Reputation: ${profile.reputation}/100

Breakdown:
- Base earnings: ${earnings.toFixed(2)} SOL
- Platform fee: ${((earnings * 10) / 100).toFixed(2)} SOL
- After fees: ${((earnings * 90) / 100).toFixed(2)} SOL

Status: ✅ Current
Last Updated: ${profile.lastActive}
`;
    return statement;
  }

  /**
   * Analyze agent performance metrics
   */
  analyzePerformance(profile: AgentProfile): {
    performance: string;
    score: number;
    recommendations: string[];
  } {
    let score = 0;
    const recommendations: string[] = [];

    // Job completion score
    if (profile.completedJobs >= 100) {
      score += 30;
    } else if (profile.completedJobs >= 25) {
      score += 20;
      recommendations.push('Aim for 100 completed jobs to reach Platinum tier');
    } else if (profile.completedJobs >= 5) {
      score += 10;
      recommendations.push('Continue building experience towards Silver tier');
    } else {
      recommendations.push('Complete more jobs to increase tier');
    }

    // Reputation score
    if (profile.reputation >= 90) {
      score += 30;
    } else if (profile.reputation >= 70) {
      score += 20;
      recommendations.push('Maintain quality to reach 90+ reputation');
    } else if (profile.reputation >= 40) {
      score += 10;
      recommendations.push('Improve job quality to boost reputation');
    } else {
      recommendations.push('Focus on high-quality deliverables');
    }

    // Earnings performance
    if (profile.totalEarnings >= 1000) {
      score += 20;
    } else if (profile.totalEarnings >= 100) {
      score += 10;
      recommendations.push('Target higher-paying jobs to increase earnings');
    } else {
      recommendations.push('Seek out higher-value opportunities');
    }

    // Activity
    const lastActive = new Date(profile.lastActive);
    const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceActive < 7) {
      score += 20;
    } else if (daysSinceActive < 30) {
      score += 10;
      recommendations.push('Stay active to maintain engagement bonuses');
    } else {
      recommendations.push('Resume activity to keep reputation fresh');
    }

    const performance =
      score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Improvement';

    return {
      performance,
      score,
      recommendations,
    };
  }
}

/**
 * Singleton Nerve Agent instance
 */
export const nerveAgent = new NerveAgent();

/**
 * Export payment functions
 */
export async function settlePayment(job: JobListing, profile: AgentProfile): Promise<PaymentResult> {
  return nerveAgent.settlePayment(job, profile);
}

export function updateReputation(
  profile: AgentProfile,
  qualityScore: number,
  success?: boolean,
): ReputationUpdate {
  return nerveAgent.updateReputation(profile, qualityScore, success);
}
