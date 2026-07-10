import type { ConnectorManifest } from '../types';

export const openaiManifest: ConnectorManifest = {
  id: 'openai',
  name: 'OpenAI',
  kind: 'api-key',
  permissions: [
    { permission: 'api_key', description: 'API key for OpenAI models', required: true },
  ],
  required_secrets: ['OPENAI_API_KEY'],
  provides: [
    {
      resource: 'api_key',
      key: 'openai_api_key',
      description: 'OpenAI API key for model access',
    },
  ],
  requires: [],
  dependencies: [],
  health_check: {
    endpoint: '/v1/models',
    method: 'GET',
    expected_status: 200,
  },
  retry_policy: {
    max_retries: 3,
    backoff_ms: 1000,
  },
};
