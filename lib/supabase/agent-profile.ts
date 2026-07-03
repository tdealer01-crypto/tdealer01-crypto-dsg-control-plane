/**
 * Agent Profile - Supabase persistence layer for Trinity AI agents
 *
 * Handles storage and retrieval of agent profiles, earnings, and execution history
 * Part of the reputation management system
 */

import type { Database } from '../database.types';
import { createClient } from '@supabase/supabase-js';

export interface AgentProfileData {
  agent_id: string;
  wallet_address: string;
  skills: string[];
  reputation: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  completed_jobs: number;
  total_earnings: number;
  last_active: string;
}

export interface EarningsRecordData {
  job_id: string;
  agent_id: string;
  amount: number;
  currency: string;
  tx_signature: string;
}

export interface JobExecutionData {
  job_id: string;
  agent_id: string;
  status: 'submitted' | 'verified' | 'paid' | 'failed';
  deliverable?: string;
  proof_hash?: string;
  quality_score?: number;
  tx_signature?: string;
  started_at: string;
  completed_at?: string;
}

/**
 * Agent Profile Manager - handles Supabase persistence
 */
export class AgentProfileManager {
  private supabase: ReturnType<typeof createClient<Database>> | null = null;
  private initialized = false;

  /**
   * Initialize Supabase client
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.supabase) {
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }

    this.supabase = createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.initialized = true;
  }

  /**
   * Get or create agent profile
   */
  async getOrCreateProfile(agentId: string, walletAddress: string): Promise<AgentProfileData> {
    await this.ensureInitialized();

    const { data, error } = await this.supabase!
      .from('agent_profiles')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch agent profile: ${error.message}`);
    }

    if (data) {
      return data as AgentProfileData;
    }

    // Create new profile
    const newProfile: Database['public']['Tables']['agent_profiles']['Insert'] = {
      agent_id: agentId,
      wallet_address: walletAddress,
      skills: [],
      reputation: 0,
      tier: 'bronze',
      completed_jobs: 0,
      total_earnings: 0,
      last_active: new Date().toISOString(),
    };

    const { data: created, error: createError } = await this.supabase!
      .from('agent_profiles')
      .insert(newProfile)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create agent profile: ${createError.message}`);
    }

    return created as AgentProfileData;
  }

  /**
   * Update agent profile
   */
  async updateProfile(agentId: string, updates: Partial<AgentProfileData>): Promise<AgentProfileData> {
    await this.ensureInitialized();

    const { data, error } = await this.supabase!
      .from('agent_profiles')
      .update({
        ...updates,
        last_active: new Date().toISOString(),
      })
      .eq('agent_id', agentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update agent profile: ${error.message}`);
    }

    return data as AgentProfileData;
  }

  /**
   * Update reputation for an agent
   */
  async updateReputation(
    agentId: string,
    reputationChange: number,
  ): Promise<{ newReputation: number; newTier: string }> {
    await this.ensureInitialized();

    // Fetch current profile
    const { data: profile, error: fetchError } = await this.supabase!
      .from('agent_profiles')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch profile for reputation update: ${fetchError.message}`);
    }

    const currentProfile = profile as AgentProfileData;
    const newReputation = Math.max(0, Math.min(100, currentProfile.reputation + reputationChange));

    // Calculate new tier
    const completedJobs = currentProfile.completed_jobs + 1;
    let newTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';

    if (completedJobs >= 100 && newReputation >= 90) {
      newTier = 'platinum';
    } else if (completedJobs >= 25 && newReputation >= 70) {
      newTier = 'gold';
    } else if (completedJobs >= 5 && newReputation >= 40) {
      newTier = 'silver';
    }

    // Update profile
    const { error: updateError } = await this.supabase!
      .from('agent_profiles')
      .update({
        reputation: newReputation,
        tier: newTier,
        last_active: new Date().toISOString(),
      })
      .eq('agent_id', agentId);

    if (updateError) {
      throw new Error(`Failed to update reputation: ${updateError.message}`);
    }

    return {
      newReputation,
      newTier,
    };
  }

  /**
   * Record earnings for a completed job
   */
  async recordEarnings(earning: EarningsRecordData): Promise<void> {
    await this.ensureInitialized();

    const { data, error } = await this.supabase!
      .from('agent_profiles')
      .select('total_earnings')
      .eq('agent_id', earning.agent_id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch current earnings: ${error.message}`);
    }

    const currentEarnings = (data as any).total_earnings || 0;

    // Insert earnings record
    const { error: insertError } = await this.supabase!
      .from('earnings_records')
      .insert({
        job_id: earning.job_id,
        agent_id: earning.agent_id,
        amount: earning.amount,
        currency: earning.currency,
        tx_signature: earning.tx_signature,
      });

    if (insertError) {
      throw new Error(`Failed to record earnings: ${insertError.message}`);
    }

    // Update total earnings
    const { error: updateError } = await this.supabase!
      .from('agent_profiles')
      .update({
        total_earnings: currentEarnings + earning.amount,
        last_active: new Date().toISOString(),
      })
      .eq('agent_id', earning.agent_id);

    if (updateError) {
      throw new Error(`Failed to update total earnings: ${updateError.message}`);
    }
  }

  /**
   * Record job execution
   */
  async recordExecution(execution: JobExecutionData): Promise<void> {
    await this.ensureInitialized();

    const { error } = await this.supabase!
      .from('job_executions')
      .insert({
        job_id: execution.job_id,
        agent_id: execution.agent_id,
        status: execution.status,
        deliverable: execution.deliverable,
        proof_hash: execution.proof_hash,
        quality_score: execution.quality_score,
        tx_signature: execution.tx_signature,
        started_at: execution.started_at,
        completed_at: execution.completed_at,
      });

    if (error) {
      throw new Error(`Failed to record execution: ${error.message}`);
    }
  }

  /**
   * Get agent earnings
   */
  async getEarnings(agentId: string, limit: number = 10): Promise<EarningsRecordData[]> {
    await this.ensureInitialized();

    const { data, error } = await this.supabase!
      .from('earnings_records')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch earnings: ${error.message}`);
    }

    return data as EarningsRecordData[];
  }

  /**
   * Get job execution history
   */
  async getExecutionHistory(agentId: string, limit: number = 10): Promise<JobExecutionData[]> {
    await this.ensureInitialized();

    const { data, error } = await this.supabase!
      .from('job_executions')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch execution history: ${error.message}`);
    }

    return data as JobExecutionData[];
  }

  /**
   * Get total earnings for agent
   */
  async getTotalEarnings(agentId: string): Promise<number> {
    await this.ensureInitialized();

    const { data, error } = await this.supabase!
      .from('agent_profiles')
      .select('total_earnings')
      .eq('agent_id', agentId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch total earnings: ${error.message}`);
    }

    return (data as any).total_earnings || 0;
  }

  /**
   * Get agent reputation
   */
  async getReputation(agentId: string): Promise<number> {
    await this.ensureInitialized();

    const { data, error } = await this.supabase!
      .from('agent_profiles')
      .select('reputation')
      .eq('agent_id', agentId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch reputation: ${error.message}`);
    }

    return (data as any).reputation || 0;
  }

  /**
   * Get agents by tier
   */
  async getAgentsByTier(tier: 'bronze' | 'silver' | 'gold' | 'platinum'): Promise<AgentProfileData[]> {
    await this.ensureInitialized();

    const { data, error } = await this.supabase!
      .from('agent_profiles')
      .select('*')
      .eq('tier', tier)
      .order('reputation', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agents by tier: ${error.message}`);
    }

    return data as AgentProfileData[];
  }

  /**
   * Get top agents by reputation
   */
  async getTopAgents(limit: number = 10): Promise<AgentProfileData[]> {
    await this.ensureInitialized();

    const { data, error } = await this.supabase!
      .from('agent_profiles')
      .select('*')
      .order('reputation', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch top agents: ${error.message}`);
    }

    return data as AgentProfileData[];
  }
}

/**
 * Singleton instance
 */
export const agentProfileManager = new AgentProfileManager();

/**
 * Export helper functions
 */
export async function getOrCreateAgentProfile(
  agentId: string,
  walletAddress: string,
): Promise<AgentProfileData> {
  return agentProfileManager.getOrCreateProfile(agentId, walletAddress);
}

export async function updateAgentReputation(agentId: string, change: number): Promise<{ newReputation: number; newTier: string }> {
  return agentProfileManager.updateReputation(agentId, change);
}

export async function recordAgentEarnings(earning: EarningsRecordData): Promise<void> {
  return agentProfileManager.recordEarnings(earning);
}

export async function recordJobExecution(execution: JobExecutionData): Promise<void> {
  return agentProfileManager.recordExecution(execution);
}

export async function getAgentEarnings(agentId: string, limit?: number): Promise<EarningsRecordData[]> {
  return agentProfileManager.getEarnings(agentId, limit);
}

export async function getAgentExecutionHistory(agentId: string, limit?: number): Promise<JobExecutionData[]> {
  return agentProfileManager.getExecutionHistory(agentId, limit);
}
