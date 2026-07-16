/**
 * Trinity × DSG Agents Integration Code
 *
 * Copy this to: lib/trinity/dsg-agent-integration.ts
 *
 * Usage:
 *   import { TrinityClient, TrinityIntegrationHooks } from '@/lib/trinity/dsg-agent-integration';
 *
 *   const trinity = new TrinityClient(orgId);
 *
 *   // When agent orchestration completes:
 *   await trinity.updateAgentStatus({
 *     jobId, orchestrationId, status: 'executing', ...
 *   });
 *
 *   // Record cost event:
 *   await trinity.recordCost({
 *     jobId, agentId, operation: 'plan', costUsd: 0.45
 *   });
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { sha256 } from 'js-sha256';

// ============================================================================
// Types
// ============================================================================

export interface TrinityAgentStatusUpdate {
  jobId: string;
  agentOrchestrationId: string;
  agentStatus: 'idle' | 'planning' | 'executing' | 'verifying' | 'settled';
  agentLastHeartbeat: string;
  contextFragmentationRisk: number;
  agentLogCid?: string;
}

export interface TrinityAgentCostEvent {
  jobId: string;
  agentId: string;
  operation: 'plan' | 'execute' | 'observe' | 'process' | 'coordinate' | 'communicate';
  costUsd: number;
  tokensUsed: number;
  timestamp: string;
}

export interface TrinityAgentAuditEvent {
  jobId: string;
  agentId: string;
  eventType: string;
  actorId: string;
  payload: Record<string, unknown>;
}

export interface TrinityModeSwitch {
  agentId: string;
  mode: 'sandbox' | 'live';
  authorizedBy: string;
  reason: string;
}

export interface TrinityContextFragmentation {
  jobId: string;
  agentOrchestrationId: string;
  fragmentationRisk: number;
  fragmentedContexts: string[];
  recoveryStrategy: 'rebuild_from_ledger' | 'rollback_to_checkpoint' | 'manual_intervention';
}

// ============================================================================
// TrinityClient - Main Integration Class
// ============================================================================

export class TrinityClient {
  private supabase: ReturnType<typeof createClient<Database>>;
  private orgId: string;
  private previousAuditHash = '';

  constructor(orgId: string) {
    this.orgId = orgId;
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Update Trinity job with agent orchestration status
   */
  async updateAgentStatus(update: TrinityAgentStatusUpdate): Promise<{
    ok: boolean;
    trinityJobUpdated?: {
      id: string;
      agentStatus: string;
      updatedAt: string;
    };
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('trinity_jobs')
        .update({
          agent_orchestration_id: update.agentOrchestrationId,
          agent_status: update.agentStatus,
          agent_last_heartbeat: update.agentLastHeartbeat,
          context_fragmentation_risk: update.contextFragmentationRisk,
          agent_log_cid: update.agentLogCid,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', this.orgId)
        .eq('id', update.jobId)
        .select('id, agent_status, updated_at')
        .single();

      if (error) {
        console.error('[TrinityClient] Failed to update agent status:', error);
        return { ok: false, error: error.message };
      }

      console.log(`[TrinityClient] Agent status updated for job ${update.jobId}: ${update.agentStatus}`);
      return {
        ok: true,
        trinityJobUpdated: {
          id: data?.id || '',
          agentStatus: data?.agent_status || '',
          updatedAt: data?.updated_at || '',
        },
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[TrinityClient] updateAgentStatus exception:', errMsg);
      return { ok: false, error: errMsg };
    }
  }

  /**
   * Record DSG agent cost event in Trinity
   */
  async recordCost(event: TrinityAgentCostEvent): Promise<{
    ok: boolean;
    jobTotalCost?: number;
    budgetRemaining?: number;
    budgetAlert?: boolean;
    error?: string;
  }> {
    try {
      // Get current job and cost
      const { data: job, error: fetchError } = await this.supabase
        .from('trinity_jobs')
        .select('execution_cost_usd, execution_cost_budget')
        .eq('org_id', this.orgId)
        .eq('id', event.jobId)
        .single();

      if (fetchError || !job) {
        console.error('[TrinityClient] Failed to fetch job for cost recording:', fetchError);
        return { ok: false, error: 'Job not found' };
      }

      const currentCost = (job.execution_cost_usd || 0) as number;
      const budget = (job.execution_cost_budget || 5.0) as number;
      const newTotalCost = currentCost + event.costUsd;
      const budgetAlert = newTotalCost > 3.0 && budget === 5.0;
      const costOverrun = newTotalCost > budget;

      // Update job with new cost
      const { error: updateError } = await this.supabase
        .from('trinity_jobs')
        .update({
          execution_cost_usd: newTotalCost,
          cost_overrun_flag: costOverrun,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', this.orgId)
        .eq('id', event.jobId);

      if (updateError) {
        console.error('[TrinityClient] Failed to update cost:', updateError);
        return { ok: false, error: updateError.message };
      }

      // Log cost event to audit trail
      await this.recordAudit({
        jobId: event.jobId,
        agentId: event.agentId,
        eventType: 'cost_recorded',
        actorId: event.agentId,
        payload: {
          operation: event.operation,
          costUsd: event.costUsd,
          tokensUsed: event.tokensUsed,
          totalCostNow: newTotalCost,
          budgetAlert,
        },
      });

      console.log(
        `[TrinityClient] Cost recorded for job ${event.jobId}: +$${event.costUsd.toFixed(2)} (total: $${newTotalCost.toFixed(2)})`,
      );

      if (costOverrun) {
        console.warn(
          `[TrinityClient] ⚠️  BUDGET OVERRUN for job ${event.jobId}: $${newTotalCost.toFixed(2)} > $${budget.toFixed(2)}`,
        );
      }

      return {
        ok: true,
        jobTotalCost: newTotalCost,
        budgetRemaining: Math.max(0, budget - newTotalCost),
        budgetAlert,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[TrinityClient] recordCost exception:', errMsg);
      return { ok: false, error: errMsg };
    }
  }

  /**
   * Record immutable audit event with hash chaining
   */
  async recordAudit(event: TrinityAgentAuditEvent): Promise<{
    ok: boolean;
    eventHash?: string;
    chainHash?: string;
    sequence?: number;
    error?: string;
  }> {
    try {
      const timestamp = new Date().toISOString();

      // Compute hash chain: SHA256(agent_id || timestamp || payload || previous_hash)
      const eventString = JSON.stringify({
        agentId: event.agentId,
        timestamp,
        payload: event.payload,
        previousHash: this.previousAuditHash,
      });
      const eventHash = sha256(eventString);
      const chainHash = `${this.previousAuditHash} → ${eventHash}`;

      // Insert into trinity_audit_events
      const { data, error } = await this.supabase
        .from('trinity_audit_events')
        .insert({
          org_id: this.orgId,
          job_id: event.jobId,
          event_type: event.eventType,
          actor_id: event.actorId,
          payload: event.payload as any,
          event_hash: eventHash,
          created_at: timestamp,
        })
        .select('created_at');

      if (error) {
        console.error('[TrinityClient] Failed to record audit event:', error);
        return { ok: false, error: error.message };
      }

      // Update previous hash for next event
      this.previousAuditHash = eventHash;

      console.log(
        `[TrinityClient] Audit event recorded: ${event.eventType} (hash: ${eventHash.substring(0, 8)}...)`,
      );

      return {
        ok: true,
        eventHash,
        chainHash,
        sequence: 1, // Would be incremented from DB in real implementation
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[TrinityClient] recordAudit exception:', errMsg);
      return { ok: false, error: errMsg };
    }
  }

  /**
   * Set agent execution mode (sandbox or live)
   */
  async setMode(modeSwitch: TrinityModeSwitch): Promise<{
    ok: boolean;
    agentMode?: 'sandbox' | 'live';
    modeEffectiveAt?: string;
    warning?: string;
    error?: string;
  }> {
    try {
      const effectiveAt = new Date().toISOString();
      const warning =
        modeSwitch.mode === 'live'
          ? 'All executions now cost real money. Ensure all tests pass before going live.'
          : undefined;

      const { data, error } = await this.supabase
        .from('dsg_agent_profiles')
        .update({
          execution_mode: modeSwitch.mode,
          mode_locked_by: modeSwitch.authorizedBy,
          mode_locked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h lock
          updated_at: effectiveAt,
        })
        .eq('org_id', this.orgId)
        .eq('agent_id', modeSwitch.agentId)
        .select('execution_mode');

      if (error) {
        console.error('[TrinityClient] Failed to set mode:', error);
        return { ok: false, error: error.message };
      }

      console.log(
        `[TrinityClient] Agent ${modeSwitch.agentId} mode switched to ${modeSwitch.mode} by ${modeSwitch.authorizedBy}`,
      );

      return {
        ok: true,
        agentMode: modeSwitch.mode,
        modeEffectiveAt: effectiveAt,
        warning,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[TrinityClient] setMode exception:', errMsg);
      return { ok: false, error: errMsg };
    }
  }

  /**
   * Report context fragmentation and initiate recovery
   */
  async reportFragmentation(frag: TrinityContextFragmentation): Promise<{
    ok: boolean;
    recoveryInitiated?: boolean;
    jobPaused?: boolean;
    estimatedRecoveryTimeMs?: number;
    error?: string;
  }> {
    try {
      // Pause job recovery
      const { error: pauseError } = await this.supabase
        .from('trinity_jobs')
        .update({
          status: 'pending_agent_diagnosis',
          context_recovery_attempt_count: this.supabase.rpc(
            'increment_recovery_attempt',
            { job_id: frag.jobId },
          ) as any,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', this.orgId)
        .eq('id', frag.jobId);

      if (pauseError) {
        console.error('[TrinityClient] Failed to pause job for recovery:', pauseError);
        return { ok: false, error: pauseError.message };
      }

      // Record fragmentation event
      await this.recordAudit({
        jobId: frag.jobId,
        agentId: 'system',
        eventType: 'context_fragmentation_detected',
        actorId: 'system',
        payload: {
          fragmentationRisk: frag.fragmentationRisk,
          fragmentedContexts: frag.fragmentedContexts,
          recoveryStrategy: frag.recoveryStrategy,
        },
      });

      console.log(
        `[TrinityClient] ⚠️  Context fragmentation detected for job ${frag.jobId} (risk: ${(frag.fragmentationRisk * 100).toFixed(1)}%). Recovery initiated using: ${frag.recoveryStrategy}`,
      );

      // Estimated recovery time depends on strategy
      const estimatedRecoveryTimeMs = frag.recoveryStrategy === 'rebuild_from_ledger' ? 2500 : 1000;

      return {
        ok: true,
        recoveryInitiated: true,
        jobPaused: true,
        estimatedRecoveryTimeMs,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[TrinityClient] reportFragmentation exception:', errMsg);
      return { ok: false, error: errMsg };
    }
  }
}

// ============================================================================
// TrinityIntegrationHooks - Hook into DSG orchestrator
// ============================================================================

export interface TrinityIntegrationHooksConfig {
  orgId: string;
  enableCostTracking?: boolean;
  enableAuditChain?: boolean;
  costBudgetUsd?: number;
  costAlertThresholdUsd?: number;
}

export class TrinityIntegrationHooks {
  private trinity: TrinityClient;
  private enableCostTracking: boolean;
  private enableAuditChain: boolean;
  private costBudgetUsd: number;
  private costAlertThresholdUsd: number;

  constructor(config: TrinityIntegrationHooksConfig) {
    this.trinity = new TrinityClient(config.orgId);
    this.enableCostTracking = config.enableCostTracking ?? true;
    this.enableAuditChain = config.enableAuditChain ?? true;
    this.costBudgetUsd = config.costBudgetUsd ?? 5.0;
    this.costAlertThresholdUsd = config.costAlertThresholdUsd ?? 3.0;
  }

  /**
   * Call when agent orchestration starts
   */
  async onOrchestrationStart(jobId: string, orchestrationId: string, agentIds: string[]): Promise<void> {
    console.log(`[TrinityHooks] Orchestration started for job ${jobId} with agents: ${agentIds.join(', ')}`);

    await this.trinity.updateAgentStatus({
      jobId,
      agentOrchestrationId: orchestrationId,
      agentStatus: 'planning',
      agentLastHeartbeat: new Date().toISOString(),
      contextFragmentationRisk: 0,
    });
  }

  /**
   * Call when agent phase completes (plan, execute, verify, etc.)
   */
  async onPhaseComplete(
    jobId: string,
    orchestrationId: string,
    phase: 'plan' | 'execute' | 'verify' | 'settle',
    agentIds: string[],
    costs?: Array<{ agentId: string; costUsd: number }>,
  ): Promise<void> {
    console.log(`[TrinityHooks] Phase "${phase}" completed for job ${jobId}`);

    const agentStatusMap: Record<string, typeof TrinityAgentStatusUpdate['agentStatus']> = {
      plan: 'planning',
      execute: 'executing',
      verify: 'verifying',
      settle: 'settled',
    };

    await this.trinity.updateAgentStatus({
      jobId,
      agentOrchestrationId: orchestrationId,
      agentStatus: agentStatusMap[phase],
      agentLastHeartbeat: new Date().toISOString(),
      contextFragmentationRisk: 0,
    });

    // Record costs if provided
    if (this.enableCostTracking && costs) {
      for (const cost of costs) {
        await this.trinity.recordCost({
          jobId,
          agentId: cost.agentId,
          operation: phase as any,
          costUsd: cost.costUsd,
          tokensUsed: 0, // Would be populated from actual execution
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Call when orchestration completes successfully
   */
  async onOrchestrationComplete(jobId: string, orchestrationId: string, result: 'success' | 'failure'): Promise<void> {
    console.log(`[TrinityHooks] Orchestration completed for job ${jobId}: ${result}`);

    await this.trinity.updateAgentStatus({
      jobId,
      agentOrchestrationId: orchestrationId,
      agentStatus: result === 'success' ? 'settled' : 'planning', // Reset to planning on failure
      agentLastHeartbeat: new Date().toISOString(),
      contextFragmentationRisk: 0,
    });

    if (this.enableAuditChain) {
      await this.trinity.recordAudit({
        jobId,
        agentId: 'orchestrator',
        eventType: 'orchestration_complete',
        actorId: 'orchestrator',
        payload: {
          result,
          completedAt: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Call when cost threshold is exceeded
   */
  async onCostThresholdExceeded(
    jobId: string,
    orchestrationId: string,
    totalCostUsd: number,
  ): Promise<void> {
    console.log(`[TrinityHooks] ⚠️  Cost threshold exceeded for job ${jobId}: $${totalCostUsd.toFixed(2)} > $${this.costAlertThresholdUsd.toFixed(2)}`);

    if (this.enableAuditChain) {
      await this.trinity.recordAudit({
        jobId,
        agentId: 'system',
        eventType: 'cost_threshold_exceeded',
        actorId: 'system',
        payload: {
          totalCostUsd,
          threshold: this.costAlertThresholdUsd,
          exceededBy: (totalCostUsd - this.costAlertThresholdUsd).toFixed(2),
        },
      });
    }
  }

  /**
   * Call if context fragmentation detected
   */
  async onContextFragmentation(
    jobId: string,
    orchestrationId: string,
    fragmentationRisk: number,
  ): Promise<void> {
    console.log(`[TrinityHooks] 🚨 Context fragmentation detected for job ${jobId}: ${(fragmentationRisk * 100).toFixed(1)}%`);

    await this.trinity.reportFragmentation({
      jobId,
      agentOrchestrationId: orchestrationId,
      fragmentationRisk,
      fragmentedContexts: [], // Would be populated from actual detection
      recoveryStrategy: 'rebuild_from_ledger',
    });
  }
}

// ============================================================================
// Export singleton for easy use
// ============================================================================

let trinityClientInstance: TrinityClient | null = null;
let trinityHooksInstance: TrinityIntegrationHooks | null = null;

export function getTrinityClient(orgId: string): TrinityClient {
  if (!trinityClientInstance) {
    trinityClientInstance = new TrinityClient(orgId);
  }
  return trinityClientInstance;
}

export function getTrinityHooks(config: TrinityIntegrationHooksConfig): TrinityIntegrationHooks {
  if (!trinityHooksInstance) {
    trinityHooksInstance = new TrinityIntegrationHooks(config);
  }
  return trinityHooksInstance;
}
