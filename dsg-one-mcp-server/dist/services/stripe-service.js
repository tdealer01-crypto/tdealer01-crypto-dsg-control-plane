import Stripe from 'stripe';
import { AuthenticationError, ValidationError } from '../utils/errors.js';
export class StripeService {
    constructor(config) {
        if (!config.apiKey) {
            throw new AuthenticationError('Missing Stripe API key');
        }
        this.client = new Stripe(config.apiKey);
    }
    async createCustomer(email, name, metadata) {
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
        }
        catch (error) {
            throw new ValidationError(`Failed to create customer: ${String(error)}`);
        }
    }
    async listInvoices(customerId, limit = 10) {
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
        }
        catch (error) {
            throw new ValidationError(`Failed to list invoices: ${String(error)}`);
        }
    }
    async createSubscription(customerId, priceId, metadata) {
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
        }
        catch (error) {
            throw new ValidationError(`Failed to create subscription: ${String(error)}`);
        }
    }
    async recordUsage(subscriptionItemId, quantity, timestamp) {
        try {
            await this.client.subscriptionItems.createUsageRecord(subscriptionItemId, {
                quantity,
                timestamp: timestamp ? Math.floor(timestamp.getTime() / 1000) : undefined,
            });
            return { success: true };
        }
        catch (error) {
            throw new ValidationError(`Failed to record usage: ${String(error)}`);
        }
    }
}
