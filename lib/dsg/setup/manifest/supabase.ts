import type { ConnectorManifest } from '../types';

export const supabaseManifest: ConnectorManifest = {
  id: 'supabase',
  name: 'Supabase',
  kind: 'api-key',
  permissions: [
    {
      permission: 'project_creation',
      description: 'Create new Supabase projects',
      required: true,
    },
    { permission: 'database_access', description: 'Full database access', required: true },
    { permission: 'api_key_management', description: 'Manage API keys', required: true },
  ],
  required_secrets: ['SUPABASE_API_KEY', 'SUPABASE_URL'],
  provides: [
    {
      resource: 'database',
      key: 'supabase_database_url',
      description: 'PostgreSQL connection string',
    },
    {
      resource: 'api_key',
      key: 'supabase_anon_key',
      description: 'Supabase anonymous API key',
    },
    {
      resource: 'api_key',
      key: 'supabase_service_role_key',
      description: 'Supabase service role API key',
    },
  ],
  requires: [],
  dependencies: [],
  health_check: {
    endpoint: '/v1/projects',
    method: 'GET',
    expected_status: 200,
  },
  retry_policy: {
    max_retries: 3,
    backoff_ms: 1000,
  },
};
