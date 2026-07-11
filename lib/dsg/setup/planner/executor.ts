/**
 * Provision Executor
 * Runs provision plan phases with checkpointing and rollback
 */

import { connectorRegistry } from '../connectors';
import { eventBus } from '../events';
import type {
  ProvisionPlan,
  ProvisionApprovalRequest,
  ProvisionExecution,
  DependencyGraph,
  Phase,
} from '../types';
import type { PlanItem } from './types';

export interface ExecutionCheckpoint {
  execution_id: string;
  current_phase: number;
  items_completed: Array<{
    id: string;
    status: 'completed' | 'failed';
    result?: Record<string, unknown>;
    error?: string;
    duration_seconds: number;
    completed_at: Date;
  }>;
  items_executing: Array<{
    id: string;
    started_at: Date;
  }>;
  items_pending: Array<{
    id: string;
  }>;
  created_at: Date;
}

export interface ExecutionResult {
  execution_id: string;
  status: 'completed' | 'failed' | 'paused';
  total_duration_seconds: number;
  items_completed: number;
  items_failed: number;
  checkpoint?: ExecutionCheckpoint;
  error?: string;
}

export class ProvisionExecutor {
  private checkpoints: Map<string, ExecutionCheckpoint> = new Map();

  /**
   * Execute approved plan
   */
  async execute(
    plan: ProvisionPlan,
    approval: ProvisionApprovalRequest,
    orgId: string,
    userId: string,
  ): Promise<ExecutionResult> {
    const execution_id = crypto.randomUUID();
    const start_time = Date.now();

    // Emit provision started event
    await eventBus.emit({
      id: crypto.randomUUID(),
      type: 'provision:started',
      org_id: orgId,
      user_id: userId,
      execution_id,
      timestamp: new Date(),
      data: {
        execution_id,
        plan_id: plan.id,
        org_id: orgId,
        approval_id: approval.approval_id,
        started_at: new Date(),
      },
    });

    // Create initial checkpoint
    const checkpoint = this.createInitialCheckpoint(execution_id, plan.plan_definition.phases);
    this.checkpoints.set(execution_id, checkpoint);

    try {
      // Execute phases sequentially
      for (let phaseIndex = 0; phaseIndex < plan.plan_definition.phases.length; phaseIndex++) {
        const phase = plan.plan_definition.phases[phaseIndex];
        checkpoint.current_phase = phaseIndex;

        // Execute phase (parallel items within phase)
        const phaseResult = await this.executePhase(
          execution_id,
          phase,
          checkpoint,
          orgId,
          userId,
        );

        if (!phaseResult.success) {
          // Phase failed - rollback all completed items
          await this.rollback(execution_id, plan, checkpoint, orgId, userId);

          const duration = (Date.now() - start_time) / 1000;

          await eventBus.emit({
            id: crypto.randomUUID(),
            type: 'execution:failed',
            org_id: orgId,
            user_id: userId,
            execution_id,
            timestamp: new Date(),
            data: {
              execution_id,
              plan_id: plan.id,
              org_id: orgId,
              error: phaseResult.error || 'Phase execution failed',
              failed_at: new Date(),
            },
          });

          return {
            execution_id,
            status: 'failed',
            total_duration_seconds: duration,
            items_completed: checkpoint.items_completed.length,
            items_failed: checkpoint.items_completed.filter((i) => i.status === 'failed').length,
            checkpoint,
            error: phaseResult.error,
          };
        }
      }

      // All phases completed successfully
      const duration = (Date.now() - start_time) / 1000;

      await eventBus.emit({
        id: crypto.randomUUID(),
        type: 'execution:completed',
        org_id: orgId,
        user_id: userId,
        execution_id,
        timestamp: new Date(),
        data: {
          execution_id,
          plan_id: plan.id,
          org_id: orgId,
          total_duration_seconds: duration,
          items_completed: checkpoint.items_completed.length,
          completed_at: new Date(),
        },
      });

      return {
        execution_id,
        status: 'completed',
        total_duration_seconds: duration,
        items_completed: checkpoint.items_completed.length,
        items_failed: 0,
      };
    } catch (error) {
      const duration = (Date.now() - start_time) / 1000;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      await eventBus.emit({
        id: crypto.randomUUID(),
        type: 'execution:failed',
        org_id: orgId,
        user_id: userId,
        execution_id,
        timestamp: new Date(),
        data: {
          execution_id,
          plan_id: plan.id,
          org_id: orgId,
          error: errorMsg,
          failed_at: new Date(),
        },
      });

      return {
        execution_id,
        status: 'failed',
        total_duration_seconds: duration,
        items_completed: checkpoint.items_completed.length,
        items_failed: 1,
        error: errorMsg,
      };
    }
  }

  /**
   * Create initial checkpoint with all items pending
   */
  private createInitialCheckpoint(execution_id: string, phases: Phase[]): ExecutionCheckpoint {
    const all_items: Array<{ id: string }> = [];

    for (const phase of phases) {
      for (const item of phase.items) {
        all_items.push({ id: item.id });
      }
    }

    return {
      execution_id,
      current_phase: 0,
      items_completed: [],
      items_executing: [],
      items_pending: all_items,
      created_at: new Date(),
    };
  }

  /**
   * Execute a single phase (with parallel items)
   */
  private async executePhase(
    execution_id: string,
    phase: Phase,
    checkpoint: ExecutionCheckpoint,
    orgId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (phase.can_run_parallel) {
      // Execute items in parallel
      return await this.executeParallel(
        execution_id,
        phase.items as any,
        checkpoint,
        orgId,
        userId,
      );
    } else {
      // Execute items sequentially
      return await this.executeSequential(
        execution_id,
        phase.items as any,
        checkpoint,
        orgId,
        userId,
      );
    }
  }

  /**
   * Execute items in parallel
   */
  private async executeParallel(
    execution_id: string,
    items: PlanItem[],
    checkpoint: ExecutionCheckpoint,
    orgId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const results = await Promise.allSettled(
      items.map((item) => this.executeItem(execution_id, item, checkpoint, orgId, userId)),
    );

    let hasError = false;
    for (const result of results) {
      if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
        hasError = true;
        break;
      }
    }

    return { success: !hasError };
  }

  /**
   * Execute items sequentially
   */
  private async executeSequential(
    execution_id: string,
    items: PlanItem[],
    checkpoint: ExecutionCheckpoint,
    orgId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    for (const item of items) {
      const result = await this.executeItem(execution_id, item, checkpoint, orgId, userId);
      if (!result.success) {
        return { success: false, error: result.error };
      }
    }

    return { success: true };
  }

  /**
   * Execute single item
   */
  private async executeItem(
    execution_id: string,
    item: PlanItem,
    checkpoint: ExecutionCheckpoint,
    orgId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const start_time = Date.now();

    try {
      // Emit item executing event
      await eventBus.emit({
        id: crypto.randomUUID(),
        type: 'item:executing',
        org_id: orgId,
        user_id: userId,
        execution_id,
        timestamp: new Date(),
        data: {
          execution_id,
          item_id: item.id,
          provider: item.provider,
          action: item.action,
          phase: checkpoint.current_phase,
          started_at: new Date(),
        },
      });

      // Get connector and call provision
      const connector = connectorRegistry.get(item.provider);
      if (!connector) {
        throw new Error(`Connector not found: ${item.provider}`);
      }

      const result = await connector.provision({
        params: {
          action: item.action,
          ...(item.params || {}),
          requires: item.requires || {},
        },
      });

      const duration = (Date.now() - start_time) / 1000;

      // Record completion
      checkpoint.items_completed.push({
        id: item.id,
        status: 'completed',
        result: result.result,
        duration_seconds: duration,
        completed_at: new Date(),
      });

      // Emit item completed event
      await eventBus.emit({
        id: crypto.randomUUID(),
        type: 'item:completed',
        org_id: orgId,
        user_id: userId,
        execution_id,
        timestamp: new Date(),
        data: {
          execution_id,
          item_id: item.id,
          provider: item.provider,
          action: item.action,
          duration_seconds: duration,
          result: result.output,
          completed_at: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      const duration = (Date.now() - start_time) / 1000;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Record failure
      checkpoint.items_completed.push({
        id: item.id,
        status: 'failed',
        error: errorMsg,
        duration_seconds: duration,
        completed_at: new Date(),
      });

      // Emit item failed event
      await eventBus.emit({
        id: crypto.randomUUID(),
        type: 'item:failed',
        org_id: orgId,
        user_id: userId,
        execution_id,
        timestamp: new Date(),
        data: {
          execution_id,
          item_id: item.id,
          provider: item.provider,
          action: item.action,
          error: errorMsg,
          failed_at: new Date(),
        },
      });

      return { success: false, error: errorMsg };
    }
  }

  /**
   * Rollback: reverse all completed items
   */
  private async rollback(
    execution_id: string,
    plan: ProvisionPlan,
    checkpoint: ExecutionCheckpoint,
    orgId: string,
    userId: string,
  ): Promise<void> {
    console.info(`[executor] Rolling back execution ${execution_id}`);

    // Reverse order of completed items
    const toRollback = [...checkpoint.items_completed]
      .filter((i) => i.status === 'completed')
      .reverse();

    for (const item of toRollback) {
      try {
        const connector = connectorRegistry.get(item.id.split(':')[0]);
        if (connector) {
          await connector.rollback(execution_id);
        }
      } catch (error) {
        console.error(`[executor] Rollback failed for ${item.id}:`, error);
      }
    }

    await eventBus.emit({
      id: crypto.randomUUID(),
      type: 'execution:paused',
      org_id: orgId,
      user_id: userId,
      execution_id,
      timestamp: new Date(),
      data: {
        execution_id,
        plan_id: plan.id,
        org_id: orgId,
        reason: 'Rollback initiated due to phase failure',
      },
    });
  }

  /**
   * Get checkpoint for execution
   */
  getCheckpoint(execution_id: string): ExecutionCheckpoint | undefined {
    return this.checkpoints.get(execution_id);
  }

  /**
   * Resume execution from checkpoint (future work)
   */
  async resume(
    execution_id: string,
    plan: ProvisionPlan,
    approval: ProvisionApprovalRequest,
    orgId: string,
    userId: string,
  ): Promise<ExecutionResult> {
    const checkpoint = this.checkpoints.get(execution_id);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for execution ${execution_id}`);
    }

    // Resume from current phase
    const start_time = Date.now();

    for (let i = checkpoint.current_phase; i < plan.plan_definition.phases.length; i++) {
      const phase = plan.plan_definition.phases[i];
      checkpoint.current_phase = i;

      const phaseResult = await this.executePhase(
        execution_id,
        phase,
        checkpoint,
        orgId,
        userId,
      );

      if (!phaseResult.success) {
        await this.rollback(execution_id, plan, checkpoint, orgId, userId);
        return {
          execution_id,
          status: 'failed',
          total_duration_seconds: (Date.now() - start_time) / 1000,
          items_completed: checkpoint.items_completed.length,
          items_failed: 1,
          error: phaseResult.error,
        };
      }
    }

    return {
      execution_id,
      status: 'completed',
      total_duration_seconds: (Date.now() - start_time) / 1000,
      items_completed: checkpoint.items_completed.length,
      items_failed: 0,
    };
  }

  /**
   * Clear checkpoints (for testing)
   */
  clearCheckpoints(): void {
    this.checkpoints.clear();
  }
}

export const provisionExecutor = new ProvisionExecutor();
