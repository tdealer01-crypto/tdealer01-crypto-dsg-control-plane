import type { ConnectorManifest } from '../types';

export const gitHubManifest: ConnectorManifest = {
  id: 'github',
  name: 'GitHub',
  kind: 'oauth',
  permissions: [
    { permission: 'repo', description: 'Create and manage repositories', required: true },
    { permission: 'workflow', description: 'Manage GitHub Actions workflows', required: false },
    {
      permission: 'admin:repo_hook',
      description: 'Manage repository webhooks',
      required: false,
    },
    { permission: 'admin:org_hook', description: 'Manage organization webhooks', required: false },
  ],
  required_secrets: ['GITHUB_TOKEN'],
  provides: [
    {
      resource: 'repository',
      key: 'github_repo_url',
      description: 'GitHub repository URL',
    },
    {
      resource: 'webhook',
      key: 'github_webhook_secret',
      description: 'Webhook secret for signed requests',
    },
    {
      resource: 'workflow',
      key: 'github_actions_enabled',
      description: 'GitHub Actions enablement status',
    },
  ],
  requires: [
    {
      resource: 'organization',
      key: 'org_slug',
      description: 'GitHub organization slug',
    },
  ],
  dependencies: [],
  health_check: {
    endpoint: '/user',
    method: 'GET',
    expected_status: 200,
  },
  retry_policy: {
    max_retries: 3,
    backoff_ms: 1000,
  },
};
