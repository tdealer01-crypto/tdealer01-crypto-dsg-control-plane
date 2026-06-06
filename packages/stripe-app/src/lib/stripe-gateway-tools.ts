/**
 * Stripe Gateway Tools Registry
 *
 * Registers Stripe operations as DSG gateway tools with risk levels and approval requirements.
 * Used by the gateway executor to evaluate and control Stripe API calls.
 *
 * Phase 4: Gateway Integration scaffold
 */

import type { GatewayToolRegistryEntry } from '@/lib/gateway/types';

/**
 * Stripe gateway tool definitions
 * Each tool represents a controlled Stripe operation with:
 * - name: unique tool identifier
 * - risk: low/medium/high/critical
 * - requiresApproval: whether operation needs operator approval
 * - description: human-readable description
 */
export const STRIPE_GATEWAY_TOOLS: GatewayToolRegistryEntry[] = [
  {
    name: 'stripe.charge.create',
    provider: 'custom_http',
    action: 'charge.create',
    risk: 'high',
    executionMode: 'critical',
    requiresApproval: true,
    description: 'Create a Stripe charge. High risk: direct customer payment capture.',
  },
  {
    name: 'stripe.payout.create',
    provider: 'custom_http',
    action: 'payout.create',
    risk: 'critical',
    executionMode: 'critical',
    requiresApproval: true,
    description: 'Create a Stripe payout. Critical risk: transfers funds out of account.',
  },
  {
    name: 'stripe.refund.create',
    provider: 'custom_http',
    action: 'refund.create',
    risk: 'medium',
    executionMode: 'gateway',
    requiresApproval: false,
    description: 'Create a Stripe refund. Medium risk: reverses a charge.',
  },
];

/**
 * Find a Stripe gateway tool by name
 * @param name - Tool name (e.g., 'stripe.charge.create')
 * @returns Tool definition or null if not found
 */
export function findStripeGatewayTool(name: string): GatewayToolRegistryEntry | null {
  return STRIPE_GATEWAY_TOOLS.find((tool) => tool.name === name) ?? null;
}

/**
 * Get all registered Stripe gateway tools
 * @returns Array of all Stripe tool definitions
 */
export function getAllStripeGatewayTools(): GatewayToolRegistryEntry[] {
  return STRIPE_GATEWAY_TOOLS;
}

/**
 * Check if a tool name is a registered Stripe gateway tool
 * @param name - Tool name to check
 * @returns true if tool is registered
 */
export function isStripeGatewayTool(name: string): boolean {
  return findStripeGatewayTool(name) !== null;
}
