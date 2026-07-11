/**
 * Phase 9A Test Harness — Central test infrastructure
 *
 * Exports core components:
 * - TestHarness: Event, ledger, checkpoint tracking
 * - ConnectorSimulator: GitHub, Vercel, Stripe simulation with fault injection
 * - OAuthSimulator: OAuth flow simulation
 */

export { TestHarness, createTestHarness } from './test-harness';
export type {
  ExecutionContext,
  ExecutionResult,
  Checkpoint,
  SystemEvent,
  LedgerEntry,
} from './test-harness';

export { ConnectorSimulator, createConnectorSimulator } from './connector-simulator';
export type { ConnectorConfig, ConnectorResponse } from './connector-simulator';

export { OAuthSimulator, createOAuthSimulator } from './oauth-simulator';
export type { OAuthConfig, OAuthSession } from './oauth-simulator';
