import type { ConnectorManifest } from '../types';

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
      description: 'Vercel deployment URL',
    },
    {
      resource: 'api_key',
      key: 'vercel_api_key',
      description: 'Vercel API key for CI/CD',
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
