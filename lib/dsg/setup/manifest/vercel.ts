import type { ConnectorManifest } from '../types';

// Vercel remains available as an optional customer-selected connector.
// It is not the default production deployment target.
export const vercelManifest: ConnectorManifest = {
  id: 'vercel',
  name: 'Vercel',
  kind: 'oauth',
  permissions: [
    { permission: 'deployments', description: 'Manage deployments', required: true },
    {
      permission: 'environment_variables',
      description: 'Manage environment variables',
      required: true,
    },
    { permission: 'domain_management', description: 'Manage domains', required: false },
  ],
  required_secrets: ['VERCEL_TOKEN'],
  provides: [
    {
      resource: 'deployment',
      key: 'vercel_deployment_url',
      description: 'Optional Vercel deployment URL',
    },
    {
      resource: 'api_key',
      key: 'vercel_api_key',
      description: 'Optional Vercel API key for customer-selected deployments',
    },
  ],
  requires: [
    {
      resource: 'repository',
      key: 'github_repo_url',
      description: 'GitHub repository URL',
    },
  ],
  dependencies: ['github'],
  health_check: {
    endpoint: '/v2/user',
    method: 'GET',
    expected_status: 200,
  },
  retry_policy: {
    max_retries: 3,
    backoff_ms: 1000,
  },
};
