export { multiCredentialStore } from './multi-credential-store';
export { CredentialStore, credentialStore } from './credential-store';
export { HealthChecker, healthChecker } from './health-checker';
export type { StoredCredential } from './multi-credential-store';

/**
 * Initialize vault services
 * Starts health check scheduler and sets up credential management
 */
export async function initializeVault(config?: { healthCheckIntervalMs?: number }) {
  const { healthChecker } = await import('./health-checker');

  // Start health check scheduler
  healthChecker.startScheduler(config?.healthCheckIntervalMs);

  console.info('[vault] Initialized with health check scheduler');
}
