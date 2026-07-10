import type { ConnectorManifest } from '../types';

export const stripeManifest: ConnectorManifest = {
  id: 'stripe',
  name: 'Stripe',
  kind: 'oauth',
  permissions: [
    { permission: 'read_write', description: 'Full Stripe account access', required: true },
  ],
  required_secrets: ['STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET'],
  provides: [
    {
      resource: 'webhook',
      key: 'stripe_webhook_url',
      description: 'Webhook endpoint URL for Stripe events',
    },
    {
      resource: 'api_key',
      key: 'stripe_api_key',
      description: 'Stripe API key for server-side operations',
    },
  ],
  requires: [
    {
      resource: 'webhook_url',
      key: 'webhook_url',
      description: 'Publicly accessible webhook URL',
    },
  ],
  dependencies: ['github'],
  health_check: {
    endpoint: '/v1/account',
    method: 'GET',
    expected_status: 200,
  },
  retry_policy: {
    max_retries: 3,
    backoff_ms: 1000,
  },
};
