/**
 * Alert Engine - Detect and create alerts for budget/execution issues
 * Non-blocking: runs async, doesn't interrupt execution flow
 */

import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/database.types';

type AlertInsert = Database['public']['Tables']['monitoring_alerts']['Insert'];

export type AlertType = 'budget_daily' | 'budget_monthly' | 'budget_warning' | 'execution_failed' | 'tool_approval_failed';
export type AlertSeverity = 'low' | 'medium' | 'high';
export type AlertStatus = 'new' | 'acknowledged' | 'resolved';

interface AlertConfig {
  dailyLimit?: number; // dollars
  monthlyLimit?: number; // dollars
  dailyWarningThreshold?: number; // percentage (e.g., 80)
  monthlyWarningThreshold?: number; // percentage (e.g., 80)
}

interface BudgetAlert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  metadata: {
    spent: number;
    limit: number;
    percentage: number;
  };
}

export class AlertEngine {
  private supabasePromise: Promise<any> | null = null;

  private async getSupabase() {
    if (!this.supabasePromise) {
      this.supabasePromise = createClient();
    }
    return this.supabasePromise;
  }

  /**
   * Check daily budget and create alert if exceeded
   */
  async checkDailyBudget(
    orgId: string,
    agentId: string,
    dailySpent: number,
    dailyLimit: number
  ): Promise<BudgetAlert | null> {
    if (dailySpent <= dailyLimit) {
      return null;
    }

    const percentage = (dailySpent / dailyLimit) * 100;
    const alert: BudgetAlert = {
      type: 'budget_daily',
      severity: 'high',
      message: `Daily budget exceeded: $${dailySpent.toFixed(2)} of $${dailyLimit.toFixed(2)}`,
      metadata: {
        spent: dailySpent,
        limit: dailyLimit,
        percentage,
      },
    };

    await this.createAlert(orgId, agentId, alert);
    return alert;
  }

  /**
   * Check monthly budget warning threshold
   */
  async checkMonthlyBudgetWarning(
    orgId: string,
    agentId: string,
    monthlySpent: number,
    monthlyLimit: number,
    warningThreshold: number = 80
  ): Promise<BudgetAlert | null> {
    const percentage = (monthlySpent / monthlyLimit) * 100;

    // Only create if above threshold and not already alerted
    if (percentage < warningThreshold) {
      return null;
    }

    // Check if we already have an active warning
    const supabase = await this.getSupabase();
    const { data: existing } = await supabase
      .from('monitoring_alerts')
      .select('alert_id')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .eq('alert_type', 'budget_warning')
      .eq('status', 'new')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .limit(1);

    if (existing && existing.length > 0) {
      return null; // Already alerted
    }

    const alert: BudgetAlert = {
      type: 'budget_warning',
      severity: 'medium',
      message: `Monthly budget warning: ${percentage.toFixed(1)}% of $${monthlyLimit.toFixed(2)} used ($${monthlySpent.toFixed(2)})`,
      metadata: {
        spent: monthlySpent,
        limit: monthlyLimit,
        percentage,
      },
    };

    await this.createAlert(orgId, agentId, alert);
    return alert;
  }

  /**
   * Create alert for failed execution
   */
  async createExecutionAlert(
    orgId: string,
    agentId: string,
    executionId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase();

      const alert: AlertInsert = {
        org_id: orgId as any,
        agent_id: agentId as any,
        alert_type: 'execution_failed' as any,
        severity: 'low' as any,
        status: 'new' as any,
        title: 'Execution Failed',
        message: errorMessage,
        metadata: {
          execution_id: executionId,
          error_message: errorMessage,
        } as any,
      };

      const { error } = await supabase
        .from('monitoring_alerts')
        .insert([alert]);

      if (error) {
        console.warn('Failed to create execution alert:', error.message);
      }
    } catch (error) {
      console.warn('Error creating execution alert:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Create alert for tool approval failure
   */
  async createToolApprovalAlert(
    orgId: string,
    agentId: string,
    executionId: string,
    toolName: string,
    reason: string
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase();

      const alert: AlertInsert = {
        org_id: orgId as any,
        agent_id: agentId as any,
        alert_type: 'tool_approval_failed' as any,
        severity: 'medium' as any,
        status: 'new' as any,
        title: `Tool Blocked: ${toolName}`,
        message: `Tool "${toolName}" was blocked during execution`,
        metadata: {
          execution_id: executionId,
          tool_name: toolName,
          reason,
        } as any,
      };

      const { error } = await supabase
        .from('monitoring_alerts')
        .insert([alert]);

      if (error) {
        console.warn('Failed to create tool approval alert:', error.message);
      }
    } catch (error) {
      console.warn('Error creating tool approval alert:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Internal: Create alert and trigger webhooks
   */
  private async createAlert(orgId: string, agentId: string, alert: BudgetAlert): Promise<void> {
    try {
      const supabase = await this.getSupabase();

      const alertInsert: AlertInsert = {
        org_id: orgId as any,
        agent_id: agentId as any,
        alert_type: alert.type as any,
        severity: alert.severity as any,
        status: 'new' as any,
        title: `Budget Alert: ${alert.type}`,
        message: alert.message,
        metadata: alert.metadata as any,
      };

      const { data: created, error } = await supabase
        .from('monitoring_alerts')
        .insert([alertInsert])
        .select()
        .single();

      if (error) {
        console.warn('Failed to create alert:', error.message);
        return;
      }

      // Trigger webhooks (async, don't wait)
      this.triggerWebhooks(orgId, created).catch((err) => {
        console.warn('Webhook trigger failed:', err instanceof Error ? err.message : 'Unknown error');
      });
    } catch (error) {
      console.warn('Error creating alert:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Trigger webhooks for alert
   */
  private async triggerWebhooks(orgId: string, alert: any): Promise<void> {
    try {
      const supabase = await this.getSupabase();

      // Get webhook configs for this org
      const { data: webhooks, error } = await supabase
        .from('monitoring_webhooks')
        .select('*')
        .eq('org_id', orgId)
        .eq('enabled', true);

      if (error || !webhooks) {
        console.warn('Failed to fetch webhooks:', error?.message || 'No webhooks');
        return;
      }

      // Send to each webhook
      for (const webhook of webhooks) {
        await this.sendToWebhook(webhook, alert);
      }
    } catch (error) {
      console.warn('Error triggering webhooks:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Send alert to webhook endpoint
   */
  private async sendToWebhook(webhook: any, alert: any): Promise<void> {
    try {
      const payload = {
        alert_id: alert.alert_id,
        type: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        created_at: alert.created_at,
        metadata: alert.metadata,
      };

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': this.generateSignature(webhook.secret, JSON.stringify(payload)),
          'X-Webhook-Event': 'monitoring.alert.created',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn(`Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Error sending to webhook:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Generate HMAC signature for webhook verification
   */
  private generateSignature(secret: string, payload: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from('monitoring_alerts')
        .update({ status: 'acknowledged' as any, acknowledged_at: new Date().toISOString() })
        .eq('alert_id', alertId);

      if (error) {
        console.warn('Failed to acknowledge alert:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Error acknowledging alert:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from('monitoring_alerts')
        .update({ status: 'resolved' as any, resolved_at: new Date().toISOString() })
        .eq('alert_id', alertId);

      if (error) {
        console.warn('Failed to resolve alert:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Error resolving alert:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }
}

/**
 * Global singleton for alert engine
 */
export const alertEngine = new AlertEngine();
