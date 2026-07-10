/**
 * Webhook Listener
 * Publishes setup events to registered webhooks
 */

import type { DSGEvent } from '../types';

export interface WebhookSubscription {
  id: string;
  org_id: string;
  webhook_url: string;
  event_types: string[]; // [] means all events
  active: boolean;
  created_at: Date;
  last_delivery_at?: Date;
  failed_attempts: number;
}

export class WebhookListener {
  private subscriptions: Map<string, WebhookSubscription> = new Map();
  private maxRetries = 3;
  private retryDelayMs = 1000;

  /**
   * Register webhook subscription
   */
  subscribe(
    org_id: string,
    webhook_url: string,
    event_types: string[] = [],
  ): WebhookSubscription {
    const subscription: WebhookSubscription = {
      id: crypto.randomUUID(),
      org_id,
      webhook_url,
      event_types,
      active: true,
      created_at: new Date(),
      failed_attempts: 0,
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  /**
   * Unsubscribe webhook
   */
  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * Get subscriptions for org
   */
  getSubscriptions(org_id: string): WebhookSubscription[] {
    return Array.from(this.subscriptions.values()).filter((s) => s.org_id === org_id && s.active);
  }

  /**
   * Listen to events and deliver to webhooks
   */
  async onEvent<T = Record<string, unknown>>(event: DSGEvent<T>): Promise<void> {
    const subscriptions = Array.from(this.subscriptions.values()).filter((s) => {
      if (!s.active) return false;
      if (event.org_id !== s.org_id) return false;
      // If event_types is empty, subscribe to all
      if (s.event_types.length === 0) return true;
      return s.event_types.includes(event.type);
    });

    // Deliver to all matching subscriptions (async, non-blocking)
    for (const subscription of subscriptions) {
      this.deliverWithRetry(subscription, event as DSGEvent).catch((error) => {
        console.error(
          `[webhook-listener] Failed to deliver to ${subscription.webhook_url}:`,
          error,
        );
      });
    }
  }

  /**
   * Deliver event to webhook with retry logic
   */
  private async deliverWithRetry(subscription: WebhookSubscription, event: DSGEvent): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.deliver(subscription, event);
        subscription.last_delivery_at = new Date();
        subscription.failed_attempts = 0;
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries failed
    subscription.failed_attempts += 1;
    throw lastError;
  }

  /**
   * Deliver event to a single webhook
   */
  private async deliver(subscription: WebhookSubscription, event: DSGEvent): Promise<void> {
    const payload = {
      id: event.id,
      type: event.type,
      org_id: event.org_id,
      timestamp: event.timestamp,
      data: event.data,
      metadata: event.metadata,
    };

    const response = await fetch(subscription.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DSG-Event-Type': event.type,
        'X-DSG-Event-ID': event.id,
        'X-DSG-Timestamp': event.timestamp.toISOString(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Get active subscriptions (for testing/debugging)
   */
  getAllSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Clear subscriptions (for testing)
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
  }
}

export const webhookListener = new WebhookListener();
