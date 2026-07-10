/**
 * MonitoringEmitter - Track agent executions and events
 * Phase 1: Foundation - Silent monitoring (non-blocking)
 *
 * This service captures execution events for monitoring and compliance.
 * All operations are async and non-blocking - execution continues even if monitoring fails.
 */

import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/database.types';

type ExecutionInsert = Database['public']['Tables']['monitoring_executions']['Insert'];
type EventInsert = Database['public']['Tables']['monitoring_events']['Insert'];
type ToolCallInsert = Database['public']['Tables']['monitoring_tool_calls']['Insert'];
type TokenUsageInsert = Database['public']['Tables']['monitoring_token_usage']['Insert'];

export class MonitoringEmitter {
  private supabasePromise: Promise<any> | null = null;
  private executionId: string | null = null;

  constructor(executionId?: string) {
    this.executionId = executionId || null;
  }

  private async getSupabase() {
    if (!this.supabasePromise) {
      this.supabasePromise = createClient();
    }
    return this.supabasePromise;
  }

  /**
   * Set the execution ID for this emitter
   */
  setExecutionId(executionId: string): void {
    this.executionId = executionId;
  }

  /**
   * Create a new execution record
   * Non-blocking: failures don't affect main flow
   */
  async captureExecution(data: {
    agent_id: string;
    org_id: string;
    user_id?: string;
    status?: 'running' | 'success' | 'failure' | 'blocked';
    metadata?: Record<string, any>;
  }): Promise<ExecutionInsert | null> {
    try {
      const execution: ExecutionInsert = {
        agent_id: data.agent_id as any,
        org_id: data.org_id as any,
        user_id: data.user_id ? (data.user_id as any) : undefined,
        status: (data.status || 'running') as any,
        metadata: data.metadata || {},
      };

      const supabase = await this.getSupabase();
      const { data: result, error } = await supabase
        .from('monitoring_executions')
        .insert([execution])
        .select()
        .single();

      if (error) {
        console.warn('Failed to capture execution:', error.message);
        return null;
      }

      this.executionId = result.execution_id;
      return result as ExecutionInsert;
    } catch (error) {
      console.warn('Error capturing execution:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Emit a monitoring event
   * Non-blocking: failures don't affect main flow
   */
  async emitEvent(
    eventType: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    if (!this.executionId) {
      return false;
    }

    try {
      const event: EventInsert = {
        execution_id: this.executionId as any,
        event_type: eventType as any,
        timestamp: new Date().toISOString(),
        metadata: metadata || null,
      };

      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from('monitoring_events')
        .insert([event]);

      if (error) {
        console.warn('Failed to emit event:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Error emitting event:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Record a tool call
   * Non-blocking: failures don't affect main flow
   */
  async recordToolCall(
    toolName: string,
    toolInput: Record<string, any>,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low',
    metadata: Record<string, any> = {}
  ): Promise<{ tool_call_id: string } | null> {
    if (!this.executionId) {
      return null;
    }

    try {
      const toolCall: ToolCallInsert = {
        execution_id: this.executionId as any,
        tool_name: toolName,
        tool_input: toolInput,
        risk_level: riskLevel as any,
        approval_status: 'pending',
      };

      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('monitoring_tool_calls')
        .insert([toolCall])
        .select('tool_call_id')
        .single();

      if (error) {
        console.warn('Failed to record tool call:', error.message);
        return null;
      }

      return { tool_call_id: data.tool_call_id };
    } catch (error) {
      console.warn('Error recording tool call:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Complete a tool call
   * Non-blocking: failures don't affect main flow
   */
  async completeToolCall(
    toolCallId: string,
    toolOutput: Record<string, any>,
    approvalStatus: 'approved' | 'rejected' = 'approved'
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from('monitoring_tool_calls')
        .update({
          tool_output: toolOutput,
          approval_status: approvalStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('tool_call_id', toolCallId);

      if (error) {
        console.warn('Failed to complete tool call:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Error completing tool call:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Record token usage
   * Non-blocking: failures don't affect main flow
   */
  async recordTokenUsage(
    modelName: string,
    inputTokens: number,
    outputTokens: number,
    costUsd: number
  ): Promise<{ token_id: string } | null> {
    if (!this.executionId) {
      return null;
    }

    try {
      const tokenUsage: TokenUsageInsert = {
        execution_id: this.executionId as any,
        model_name: modelName,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      };

      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('monitoring_token_usage')
        .insert([tokenUsage])
        .select('token_id')
        .single();

      if (error) {
        console.warn('Failed to record token usage:', error.message);
        return null;
      }

      // Update execution record with totals
      await this.updateExecutionTokens(this.executionId).catch((err) => {
        console.warn('Failed to update execution tokens:', err);
      });

      return { token_id: data.token_id };
    } catch (error) {
      console.warn('Error recording token usage:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Update execution record with token totals
   */
  private async updateExecutionTokens(executionId: string): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      const { data: tokens, error: queryError } = await supabase
        .from('monitoring_token_usage')
        .select('input_tokens, output_tokens')
        .eq('execution_id', executionId);

      if (queryError || !tokens) {
        return;
      }

      const totalInput = tokens.reduce((sum, row) => sum + (row.input_tokens || 0), 0);
      const totalOutput = tokens.reduce((sum, row) => sum + (row.output_tokens || 0), 0);

      const updateSupabase = await this.getSupabase();
      await updateSupabase
        .from('monitoring_executions')
        .update({
          input_tokens: totalInput,
          output_tokens: totalOutput,
        })
        .eq('execution_id', executionId);
    } catch (error) {
      console.warn('Error updating execution tokens:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Complete an execution
   * Non-blocking: failures don't affect main flow
   */
  async completeExecution(
    status: 'success' | 'failure' | 'blocked',
    errorMessage?: string
  ): Promise<boolean> {
    if (!this.executionId) {
      return false;
    }

    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from('monitoring_executions')
        .update({
          status: status as any,
          end_time: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq('execution_id', this.executionId);

      if (error) {
        console.warn('Failed to complete execution:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Error completing execution:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }
}

/**
 * Global singleton for monitoring
 */
export const monitoringEmitter = new MonitoringEmitter();
