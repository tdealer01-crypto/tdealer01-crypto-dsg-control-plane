/**
 * MonitoringEventBus - Fire-and-forget event hooks
 * Phase 1: Foundation - Non-blocking event capture
 *
 * These hooks capture monitoring events without blocking execution.
 * If monitoring fails or is disabled, execution continues normally.
 */

import { MonitoringEmitter } from './event-emitter';

/**
 * Global event bus for monitoring
 * Use this in execution pipeline to fire monitoring events
 *
 * Example:
 *   const emitter = new MonitoringEmitter(executionId);
 *   await monitoringBus.onTokenUsage({
 *     modelName: 'claude-opus',
 *     inputTokens: 100,
 *     outputTokens: 50,
 *     costUsd: 0.01
 *   });
 */
export class MonitoringEventBus {
  private emitter: MonitoringEmitter | null = null;
  private enabled = process.env.MONITORING_ENABLED === 'true';

  constructor() {}

  /**
   * Set execution context
   */
  setExecutionId(executionId: string): void {
    if (!this.enabled) return;
    if (!this.emitter) {
      this.emitter = new MonitoringEmitter(executionId);
    } else {
      this.emitter.setExecutionId(executionId);
    }
  }

  /**
   * Initialize emitter with execution data
   */
  async initializeExecution(data: {
    executionId?: string;
    agentId: string;
    orgId: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<string | null> {
    if (!this.enabled) return data.executionId || null;

    try {
      const emitter = new MonitoringEmitter(data.executionId);
      const result = await emitter.captureExecution({
        agent_id: data.agentId,
        org_id: data.orgId,
        user_id: data.userId,
        status: 'running',
        metadata: data.metadata,
      });

      if (result?.execution_id) {
        this.emitter = emitter;
        return result.execution_id;
      }
      return null;
    } catch (error) {
      console.error('Failed to initialize execution:', error);
      return null;
    }
  }

  /**
   * Fire token usage event (async, non-blocking)
   * Does not wait for database operation to complete
   */
  async onTokenUsage(data: {
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }): Promise<void> {
    if (!this.enabled || !this.emitter) return;

    // Fire async, don't wait
    this.emitter
      .recordTokenUsage(data.modelName, data.inputTokens, data.outputTokens, data.costUsd)
      .catch((error) => {
        console.warn('Failed to record token usage:', error instanceof Error ? error.message : 'Unknown error');
        // Don't throw - execution must continue
      });
  }

  /**
   * Fire tool call event (async, non-blocking)
   */
  async onToolCall(data: {
    toolName: string;
    toolInput: Record<string, any>;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<string | null> {
    if (!this.enabled || !this.emitter) return null;

    try {
      const result = await this.emitter.recordToolCall(
        data.toolName,
        data.toolInput,
        data.riskLevel || 'low'
      );
      return result?.tool_call_id || null;
    } catch (error) {
      console.warn('Failed to record tool call:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Fire tool completion event (async, non-blocking)
   */
  async onToolComplete(data: {
    toolCallId: string;
    toolOutput: Record<string, any>;
    approvalStatus?: 'approved' | 'rejected';
  }): Promise<void> {
    if (!this.enabled || !this.emitter) return;

    // Fire async, don't wait
    this.emitter
      .completeToolCall(data.toolCallId, data.toolOutput, data.approvalStatus || 'approved')
      .catch((error) => {
        console.warn('Failed to complete tool call:', error instanceof Error ? error.message : 'Unknown error');
      });
  }

  /**
   * Fire approval gate event (async, non-blocking)
   */
  async onApprovalGate(data: {
    toolCallId: string;
    decision: 'approved' | 'rejected';
    reason?: string;
  }): Promise<void> {
    if (!this.enabled || !this.emitter) return;

    // Fire async, don't wait
    this.emitter
      .completeToolCall(data.toolCallId, {}, data.decision)
      .catch((error) => {
        console.warn('Failed to record gate decision:', error instanceof Error ? error.message : 'Unknown error');
      });

    // Also emit event
    await this.emitter.emitEvent('approval_gate', {
      tool_call_id: data.toolCallId,
      decision: data.decision,
      reason: data.reason,
    });
  }

  /**
   * Fire execution completion event (async, non-blocking)
   */
  async onExecutionComplete(data: {
    status: 'success' | 'failure' | 'blocked';
    errorMessage?: string;
  }): Promise<void> {
    if (!this.enabled || !this.emitter) return;

    // Fire async, don't wait
    this.emitter
      .completeExecution(data.status, data.errorMessage)
      .catch((error) => {
        console.warn('Failed to record execution completion:', error instanceof Error ? error.message : 'Unknown error');
      });

    // Also emit event
    await this.emitter.emitEvent('execution_end', {
      status: data.status,
      error_message: data.errorMessage,
    });
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Reset emitter (for testing)
   */
  reset(): void {
    this.emitter = null;
  }
}

/**
 * Global singleton event bus
 */
export const monitoringBus = new MonitoringEventBus();
