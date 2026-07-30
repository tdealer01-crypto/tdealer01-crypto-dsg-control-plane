import Stripe from 'stripe';
import { AuthenticationError, ValidationError } from '../utils/errors.js';

export interface StripeConfig {
  apiKey: string;
}

export class StripeService {
  private client: Stripe;

  constructor(config: StripeConfig) {
    if (!config.apiKey) {
      throw new AuthenticationError('Missing Stripe API key');
    }

    this.client = new Stripe(config.apiKey);
  }

  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<{ customerId: string; email: string }> {
    try {
      const customer = await this.client.customers.create({
        email,
        name,
        metadata,
      });

      return {
        customerId: customer.id,
        email: customer.email || email,
      };
    } catch (error) {
      throw new ValidationError(`Failed to create customer: ${String(error)}`);
    }
  }

  async listInvoices(customerId: string, limit: number = 10): Promise<any[]> {
    try {
      const invoices = await this.client.invoices.list({
        customer: customerId,
        limit,
      });

      return (invoices.data || []).map((inv) => ({
        id: inv.id,
        amount: inv.amount_paid,
        status: inv.status,
        created: new Date(inv.created * 1000),
      }));
    } catch (error) {
      throw new ValidationError(`Failed to list invoices: ${String(error)}`);
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>
  ): Promise<{ subscriptionId: string; status: string }> {
    try {
      const subscription = await this.client.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
      };
    } catch (error) {
      throw new ValidationError(`Failed to create subscription: ${String(error)}`);
    }
  }

  async recordUsage(subscriptionItemId: string, quantity: number, timestamp?: Date): Promise<{ success: boolean }> {
    try {
      await this.client.subscriptionItems.createUsageRecord(subscriptionItemId, {
        quantity,
        timestamp: timestamp ? Math.floor(timestamp.getTime() / 1000) : undefined,
      });

      return { success: true };
    } catch (error) {
      throw new ValidationError(`Failed to record usage: ${String(error)}`);
    }
  }
}
