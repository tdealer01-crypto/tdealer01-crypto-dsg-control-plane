/**
 * DSG Infrastructure Control Plane Setup Module
 *
 * Core exports for one-time setup flow:
 * - Manifests: Provider capability declarations
 * - Capabilities: Capability query engine
 * - Connectors: Connector registry and interfaces
 * - Vault: Encrypted credential storage
 * - Types: Central type definitions
 */

// Export all setup types (careful: some overlap with sub-module exports)
export type {
  ConnectorManifest,
  ConnectorPermission,
  ConnectorProvides,
  ConnectorRequires,
  ConnectorCapability,
  ConnectorCredential,
  DetectedService,
  SuggestedProvider,
  DiscoveryAnalysis,
  DependencyNode,
  DependencyEdge,
  DependencyGraph,
  Phase,
  ProvisionPlan,
  ProvisionItem,
  ExecutedItem,
  ProvisionExecution,
  ProvisionAuditEvent,
  CredentialSummary,
  HealthCheckResult,
  ProviderHealthStatus,
} from './types';

export * from './manifest';
export { capabilityEngine, registerDefaultCapabilities } from './capabilities';
export type { CapabilityQuery, CapabilityMatch, Capability, CapabilityEngine } from './capabilities';
export * from './connectors';
export * from './vault';

import { registerDefaultManifests } from './manifest';
import { registerDefaultCapabilities } from './capabilities';

/**
 * Initialize DSG Setup system
 * Call once at application startup to register manifests and capabilities
 */
export async function initializeDSGSetup(): Promise<void> {
  console.info('[setup] Initializing DSG Infrastructure Control Plane');

  try {
    registerDefaultManifests();
    registerDefaultCapabilities();
    console.info('[setup] Initialization complete');
  } catch (error) {
    console.error('[setup] Initialization failed:', error);
    throw error;
  }
}
