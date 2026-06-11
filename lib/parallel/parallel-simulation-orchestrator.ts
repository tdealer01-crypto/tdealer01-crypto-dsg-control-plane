import { randomUUID } from 'crypto';
import type { SafeElementManifest } from '@/lib/dsg/safe-dom/types';

/**
 * Simulation environment: isolated per-agent context tracked by the
 * parallel control plane. Holds the agent's manifest cache and execution
 * state; actual executor work is dispatched through the existing executor
 * functions (browserbase/terminal/virtual-pc integrations), not owned here.
 *
 * Memory budget per agent: manifest cache capped at 100 entries.
 */
export interface SimulationEnvironment {
  agentId: string;
  sessionId: string;

  // Per-agent manifest cache (manifestKey → manifest), insertion-ordered for LRU
  manifestCache: Map<string, SafeElementManifest[]>;
  executionState: Map<string, unknown>;

  createdAt: number;
  lastActivityAt: number; // For cleanup (TTL = 30 min)
}

const simulationRegistry = new Map<string, SimulationEnvironment>();

const SIMULATION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MANIFEST_CACHE_MAX_ENTRIES = 100;

/**
 * Create an isolated environment for an agent. Cost: in-memory only.
 */
export function spinUpSimulationEnvironment(agentId: string): SimulationEnvironment {
  const env: SimulationEnvironment = {
    agentId,
    sessionId: randomUUID(),
    manifestCache: new Map(),
    executionState: new Map(),
    createdAt: Date.now(),
    lastActivityAt: Date.now()
  };

  simulationRegistry.set(agentId, env);
  return env;
}

/**
 * Get existing environment or create one; refreshes activity timestamp.
 */
export function getOrCreateSimulationEnvironment(agentId: string): SimulationEnvironment {
  let env = simulationRegistry.get(agentId);
  if (!env) {
    env = spinUpSimulationEnvironment(agentId);
  }
  env.lastActivityAt = Date.now();
  return env;
}

/**
 * Read manifest from the agent's environment cache.
 */
export function getManifestFromCache(
  env: SimulationEnvironment,
  manifestKey: string
): SafeElementManifest[] | null {
  const manifest = env.manifestCache.get(manifestKey);
  if (!manifest) return null;
  // Touch for LRU: re-insert to move to the end of iteration order
  env.manifestCache.delete(manifestKey);
  env.manifestCache.set(manifestKey, manifest);
  return manifest;
}

/**
 * Cache manifest in the agent's environment with LRU eviction.
 */
export function cacheManifest(
  env: SimulationEnvironment,
  manifestKey: string,
  manifest: SafeElementManifest[]
): void {
  if (env.manifestCache.size >= MANIFEST_CACHE_MAX_ENTRIES && !env.manifestCache.has(manifestKey)) {
    const oldest = env.manifestCache.keys().next().value;
    if (oldest !== undefined) env.manifestCache.delete(oldest);
  }
  env.manifestCache.set(manifestKey, manifest);
}

/**
 * Remove environments idle past TTL. Returns number cleaned.
 */
export function cleanupStaleSimulations(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [agentId, env] of simulationRegistry.entries()) {
    if (now - env.lastActivityAt > SIMULATION_TTL_MS) {
      env.manifestCache.clear();
      env.executionState.clear();
      simulationRegistry.delete(agentId);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Registry stats for monitoring/dashboard.
 */
export function getSimulationStats(): {
  activeEnvironments: number;
  totalAgents: number;
  cacheMetrics: { totalEntries: number; avgEntriesPerEnv: number };
} {
  let totalCacheEntries = 0;
  for (const env of simulationRegistry.values()) {
    totalCacheEntries += env.manifestCache.size;
  }

  const count = simulationRegistry.size;
  return {
    activeEnvironments: count,
    totalAgents: count,
    cacheMetrics: {
      totalEntries: totalCacheEntries,
      avgEntriesPerEnv: count > 0 ? Math.round(totalCacheEntries / count) : 0
    }
  };
}

/**
 * Drop all environments (tests / graceful shutdown).
 */
export function shutdownAllSimulations(): void {
  for (const env of simulationRegistry.values()) {
    env.manifestCache.clear();
    env.executionState.clear();
  }
  simulationRegistry.clear();
}
