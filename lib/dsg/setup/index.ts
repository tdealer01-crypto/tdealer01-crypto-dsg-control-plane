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

export * from './types';
export * from './manifest';
export * from './capabilities';
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
