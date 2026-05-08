import type { RemoteBrowserProvider, RemoteBrowserProviderId } from './types';

function hasAllEnv(names: string[]) {
  return names.every((name) => Boolean(process.env[name]?.trim()));
}

function providerStatus(requiredEnv: string[]) {
  return hasAllEnv(requiredEnv) ? 'adapter_pending' as const : 'missing_env' as const;
}

export function listRemoteBrowserProviders(): RemoteBrowserProvider[] {
  const playwrightEnv = ['PLAYWRIGHT_CDP_WS_ENDPOINT'];
  const browserbaseEnv = ['BROWSERBASE_API_KEY', 'BROWSERBASE_PROJECT_ID'];
  const steelEnv = ['STEEL_API_KEY'];

  return [
    {
      id: 'playwright',
      label: 'Playwright CDP/WS endpoint',
      status: providerStatus(playwrightEnv),
      requiredEnv: playwrightEnv,
      optionalEnv: ['PLAYWRIGHT_DEFAULT_CONTEXT_ID'],
      capabilities: ['navigate', 'inspect', 'screenshot', 'navigation_log', 'takeover_checkpoint'],
      evidence: ['browser-session-id', 'navigation-log', 'screenshot-artifact', 'page-state'],
      truthBoundary: 'Env can point to an existing CDP/WS browser endpoint, but this repo does not import Playwright yet. Adapter remains pending until executor code is added and verified.',
    },
    {
      id: 'browserbase',
      label: 'Browserbase remote browser',
      status: providerStatus(browserbaseEnv),
      requiredEnv: browserbaseEnv,
      optionalEnv: ['BROWSERBASE_REGION', 'BROWSERBASE_PROJECT_NAME'],
      capabilities: ['session_create', 'navigate', 'screenshot', 'session_replay', 'takeover_checkpoint'],
      evidence: ['browserbase-session-id', 'screenshot-url', 'navigation-log', 'replay-url'],
      truthBoundary: 'Browserbase needs its real API adapter before autonomous browser control can be claimed.',
    },
    {
      id: 'steel',
      label: 'Steel remote browser',
      status: providerStatus(steelEnv),
      requiredEnv: steelEnv,
      optionalEnv: ['STEEL_BASE_URL'],
      capabilities: ['session_create', 'navigate', 'screenshot', 'navigation_log', 'takeover_checkpoint'],
      evidence: ['steel-session-id', 'screenshot-url', 'navigation-log'],
      truthBoundary: 'Steel needs its real API adapter before autonomous browser control can be claimed.',
    },
  ];
}

export function getRemoteBrowserProvider(id: RemoteBrowserProviderId | undefined) {
  const providers = listRemoteBrowserProviders();
  if (!id) return providers.find((provider) => provider.status !== 'missing_env') ?? providers[0];
  const provider = providers.find((candidate) => candidate.id === id);
  if (!provider) throw new Error('REMOTE_BROWSER_PROVIDER_NOT_FOUND');
  return provider;
}
