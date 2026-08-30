// ============================================================================
// Azure rollback adapter — App Service deployment-slot swap
// ============================================================================
//
// This is the orchestration logic behind the Azure rollback adapter route
// (app/api/dsg/agentic-org/rollback-adapters/azure/route.ts). The rollback
// mechanism is an Azure App Service slot swap: production always serves the
// "production" slot; a governed deploy publishes to "staging" first, so
// rollback is "swap production back to what staging currently holds" --
// which for a same-day rollback is the previous known-good build, since the
// new candidate is what just got swapped in.
//
// Every network call goes through a dependency-injected fetcher so this can
// be unit tested without live Azure credentials, matching the pattern in
// candidate-lineage.ts and github-branch-bootstrap.ts. It has NOT been
// exercised against a real Azure subscription from this sandbox -- there is
// no Azure CLI/API access here. Treat the ARM call shapes as "written to the
// documented API contract, unverified live" until someone with a real
// subscription confirms a rollback end to end.

import crypto from 'node:crypto';

export interface AzureRollbackConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
  resourceGroup: string;
  /** Maps a governed target repository to the Azure App Service name that serves it. */
  appServiceByRepository: Record<string, string>;
}

export interface AzureRollbackInput {
  targetRepository: string;
  promotionId: string;
  deploymentId: string;
  rollbackTarget: string; // slot name currently holding the pre-candidate build, e.g. "staging"
  healthProbePath: string; // e.g. "/api/agent/status"
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const ARM_BASE = 'https://management.azure.com';
const TOKEN_POLL_INTERVAL_MS = 2000;
const TOKEN_POLL_MAX_ATTEMPTS = 30; // ~1 minute
const HEALTH_CHECK_TIMEOUT_MS = 10_000;

export class AzureRollbackError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export async function getAzureAccessToken(
  fetcher: FetchLike,
  config: Pick<AzureRollbackConfig, 'tenantId' | 'clientId' | 'clientSecret'>,
): Promise<string> {
  const response = await fetcher(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: 'https://management.azure.com/.default',
    }).toString(),
  });
  if (!response.ok) {
    throw new AzureRollbackError(`Azure token request failed with HTTP ${response.status}`, 'AZURE_TOKEN_REQUEST_FAILED');
  }
  const body = (await response.json()) as { access_token?: string };
  if (typeof body.access_token !== 'string' || !body.access_token) {
    throw new AzureRollbackError('Azure token response did not include access_token', 'AZURE_TOKEN_RESPONSE_INVALID');
  }
  return body.access_token;
}

async function pollUntilDone(fetcher: FetchLike, token: string, statusUrl: string): Promise<void> {
  for (let attempt = 0; attempt < TOKEN_POLL_MAX_ATTEMPTS; attempt++) {
    const response = await fetcher(statusUrl, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (response.status === 200) return;
    if (response.status !== 202) {
      throw new AzureRollbackError(`Azure slot-swap status check returned HTTP ${response.status}`, 'AZURE_SLOT_SWAP_STATUS_FAILED');
    }
    await new Promise((resolve) => setTimeout(resolve, TOKEN_POLL_INTERVAL_MS));
  }
  throw new AzureRollbackError('Azure slot-swap did not complete within the poll budget', 'AZURE_SLOT_SWAP_TIMEOUT');
}

export async function swapAppServiceSlots(
  fetcher: FetchLike,
  token: string,
  config: Pick<AzureRollbackConfig, 'subscriptionId' | 'resourceGroup'>,
  appServiceName: string,
  sourceSlot: string,
): Promise<void> {
  const url = `${ARM_BASE}/subscriptions/${config.subscriptionId}/resourceGroups/${config.resourceGroup}` +
    `/providers/Microsoft.Web/sites/${appServiceName}/slots/${sourceSlot}/slotsswap?api-version=2022-03-01`;

  const response = await fetcher(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ targetSlot: 'production' }),
  });

  if (response.status === 200) return; // completed synchronously
  if (response.status !== 202) {
    throw new AzureRollbackError(`Azure slot-swap request returned HTTP ${response.status}`, 'AZURE_SLOT_SWAP_REQUEST_FAILED');
  }

  const statusUrl = response.headers.get('location') ?? response.headers.get('azure-asyncoperation');
  if (!statusUrl) {
    throw new AzureRollbackError('Azure slot-swap accepted but returned no polling URL', 'AZURE_SLOT_SWAP_STATUS_URL_MISSING');
  }
  await pollUntilDone(fetcher, token, statusUrl);
}

export async function checkHealth(fetcher: FetchLike, healthUrl: string): Promise<boolean> {
  try {
    const response = await fetcher(healthUrl, { signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS) });
    return response.ok;
  } catch {
    return false;
  }
}

export interface AzureRollbackResult {
  status: 'ROLLED_BACK';
  healthPassed: true;
  evidenceHash: string;
}

/**
 * Executes a real rollback: swap the App Service slot named by
 * `rollbackTarget` into production, then require the health probe to pass.
 * Throws AzureRollbackError on any failure -- the caller (the API route)
 * must not report success unless this resolves.
 */
export async function executeAzureRollback(
  fetcher: FetchLike,
  config: AzureRollbackConfig,
  input: AzureRollbackInput,
): Promise<AzureRollbackResult> {
  const appServiceName = config.appServiceByRepository[input.targetRepository];
  if (!appServiceName) {
    throw new AzureRollbackError(
      `No Azure App Service is registered for ${input.targetRepository}`,
      'AZURE_APP_SERVICE_NOT_REGISTERED',
    );
  }

  const token = await getAzureAccessToken(fetcher, config);
  await swapAppServiceSlots(fetcher, token, config, appServiceName, input.rollbackTarget);

  // Default Azure App Service hostname. A custom domain would need its own
  // mapping; not needed for any repository registered today.
  const healthUrl = new URL(input.healthProbePath, `https://${appServiceName}.azurewebsites.net`).toString();
  const healthPassed = await checkHealth(fetcher, healthUrl);
  if (!healthPassed) {
    throw new AzureRollbackError(
      `Health probe ${healthUrl} did not return 2xx after the slot swap`,
      'AZURE_ROLLBACK_HEALTH_CHECK_FAILED',
    );
  }

  const evidenceMaterial = {
    schemaVersion: 'dsg-azure-rollback-evidence-v1',
    promotionId: input.promotionId,
    deploymentId: input.deploymentId,
    appServiceName,
    rollbackTarget: input.rollbackTarget,
    healthProbe: input.healthProbePath,
  };
  const evidenceHash = crypto.createHash('sha256').update(JSON.stringify(evidenceMaterial)).digest('hex');

  return { status: 'ROLLED_BACK', healthPassed: true, evidenceHash };
}
