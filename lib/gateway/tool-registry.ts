import type { GatewayToolRegistryEntry } from './types';

export const DEFAULT_GATEWAY_TOOL_REGISTRY: GatewayToolRegistryEntry[] = [
  {
    name: 'zapier.gmail.send_email',
    provider: 'zapier',
    action: 'send_email',
    risk: 'high',
    executionMode: 'critical',
    requiresApproval: true,
    description: 'Send an email through a Zapier-backed Gmail action.',
  },
  {
    name: 'zapier.slack.post_message',
    provider: 'zapier',
    action: 'post_message',
    risk: 'medium',
    executionMode: 'gateway',
    requiresApproval: false,
    description: 'Post a Slack message through a Zapier-backed action.',
  },
  {
    name: 'zapier.hubspot.update_deal',
    provider: 'zapier',
    action: 'update_deal',
    risk: 'high',
    executionMode: 'critical',
    requiresApproval: true,
    description: 'Update a HubSpot deal through Zapier.',
  },
  {
    name: 'mock.safe.echo',
    provider: 'mock',
    action: 'echo',
    risk: 'low',
    executionMode: 'gateway',
    requiresApproval: false,
    description: 'Deterministic test tool for gateway smoke tests.',
  },
];

export function findGatewayTool(name: string) {
  return DEFAULT_GATEWAY_TOOL_REGISTRY.find((tool) => tool.name === name) ?? null;
}
