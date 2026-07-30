import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AnthropicService } from '../services/anthropic-service.js';
import { StripeService } from '../services/stripe-service.js';
import { AnthropicSessionSchema, AnthropicMessageSchema, StripeUsageSchema } from '../schemas/index.js';
import { formatError } from '../utils/errors.js';

export function createAnthropicTools(anthropicService: AnthropicService): Tool[] {
  return [
    {
      name: 'anthropic_create_session',
      description: 'Create a new Anthropic managed agent session',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Claude model ID' },
          budgetTokens: { type: 'number', description: 'Token budget for session' },
          systemPrompt: { type: 'string', description: 'System prompt for the session' },
        },
        required: ['model'],
      },
      handler: async (input: any) => {
        try {
          const result = await anthropicService.createSession(
            input.model,
            input.budgetTokens,
            input.systemPrompt
          );
          return {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'anthropic_send_message',
      description: 'Send a message to Claude and get a response',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID' },
          message: { type: 'string', description: 'User message' },
          maxTokens: { type: 'number', description: 'Max response tokens', default: 1024 },
        },
        required: ['sessionId', 'message'],
      },
      handler: async (input: any) => {
        try {
          const result = await anthropicService.sendMessage(
            input.sessionId,
            input.message,
            input.maxTokens
          );
          return {
            type: 'text',
            text: `Response:\n${result.response}\n\nUsage: ${result.usage.inputTokens} input, ${result.usage.outputTokens} output`,
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'anthropic_list_models',
      description: 'List available Claude models',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        try {
          const models = await anthropicService.listModels();
          return {
            type: 'text',
            text: `Available models:\n${models.join('\n')}`,
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'anthropic_get_usage',
      description: 'Get token usage metrics for the current session',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        try {
          const usage = await anthropicService.getUsage();
          return {
            type: 'text',
            text: JSON.stringify(usage, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
  ];
}

export function createStripeTools(stripeService: StripeService): Tool[] {
  return [
    {
      name: 'stripe_create_customer',
      description: 'Create a new Stripe customer for an organization',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Customer email' },
          name: { type: 'string', description: 'Customer name' },
          metadata: {
            type: 'object',
            description: 'Custom metadata for the customer',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['email'],
      },
      handler: async (input: any) => {
        try {
          const result = await stripeService.createCustomer(input.email, input.name, input.metadata);
          return {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'stripe_list_invoices',
      description: 'List invoices for a Stripe customer',
      inputSchema: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'Stripe customer ID' },
          limit: { type: 'number', description: 'Number of invoices', default: 10 },
        },
        required: ['customerId'],
      },
      handler: async (input: any) => {
        try {
          const invoices = await stripeService.listInvoices(input.customerId, input.limit || 10);
          return {
            type: 'text',
            text: JSON.stringify(invoices, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'stripe_create_subscription',
      description: 'Create a billing subscription for a customer',
      inputSchema: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'Stripe customer ID' },
          priceId: { type: 'string', description: 'Stripe price ID' },
          metadata: {
            type: 'object',
            description: 'Subscription metadata',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['customerId', 'priceId'],
      },
      handler: async (input: any) => {
        try {
          const result = await stripeService.createSubscription(
            input.customerId,
            input.priceId,
            input.metadata
          );
          return {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'stripe_record_usage',
      description: 'Record metered usage for a subscription',
      inputSchema: {
        type: 'object',
        properties: {
          subscriptionItemId: { type: 'string', description: 'Subscription item ID' },
          quantity: { type: 'number', description: 'Usage quantity' },
          timestamp: { type: 'string', description: 'Event timestamp (ISO 8601)' },
        },
        required: ['subscriptionItemId', 'quantity'],
      },
      handler: async (input: any) => {
        try {
          const timestamp = input.timestamp ? new Date(input.timestamp) : undefined;
          const result = await stripeService.recordUsage(input.subscriptionItemId, input.quantity, timestamp);
          return {
            type: 'text',
            text: result.success
              ? 'Usage recorded successfully'
              : 'Failed to record usage',
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
  ];
}
