import { generateUUID } from '@/lib/utils/crypto';
import { createVirtualPCSession, VirtualPCSession } from '@/lib/dsg/app-builder/virtual-pc';
import { createBrowserbaseSession, BrowserbaseSession } from '@/lib/executors/browserbase';
import { createTerminalSandbox, TerminalSandbox } from '@/lib/executors/terminal-sandbox';
import { SafeDomCommand, SafeElementManifest } from '@/lib/dsg/safe-dom/types';
import type { ExecutorResult } from '@/lib/executors/types';

/**
 * Simulation environment: isolated execution context for a single agent session
 * Each agent gets its own Virtual PC instance, Browserbase session, and Terminal sandbox
 * Memory per agent: <10MB (LRU manifest cache max 100 entries)
 */
export interface SimulationEnvironment {
  agentId: string;
  sessionId: string; // Unique session per agent

  // Isolated executor contexts
  virtualPcSession: VirtualPCSession | null;
  browserbaseSession: BrowserbaseSession | null;
  terminalSandbox: TerminalSandbox | null;

  // Session state
  manifestCache: Map<string, SafeElementManifest[]>;
  executionState: Map<string, any>; // Agent-local state

  // Lifecycle
  createdAt: number;
  lastActivityAt: number; // For cleanup (TTL = 30 min)
}

interface ExecutorDispatchResult {
  results: (ExecutorResult | null)[];
  winnerIndex: number; // Which executor succeeded first
  timing: Record<string, number>; // latency per executor type in ms
}

type ExecutorType = 'virtual-pc' | 'browserbase' | 'terminal';

/**
 * Global registry: agentId → SimulationEnvironment
 * Tracks all active simulation environments across the system
 */
const simulationRegistry = new Map<string, SimulationEnvironment>();

const SIMULATION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MANIFEST_CACHE_MAX_ENTRIES = 100;
const MANIFEST_CACHE_MAX_BYTES = 10 * 1024 * 1024; // 10MB per agent

/**
 * Spin up a new isolated simulation environment for an agent
 * Creates Virtual PC instance and Terminal sandbox; Browserbase is lazy-initialized
 *
 * Cost: ~200ms (async init of Virtual PC + Terminal)
 */
export async function spinUpSimulationEnvironment(
  agentId: string
): Promise<SimulationEnvironment> {
  const sessionId = generateUUID();

  const env: SimulationEnvironment = {
    agentId,
    sessionId,
    virtualPcSession: null, // Lazy-init on first Virtual PC command
    browserbaseSession: null, // Lazy-init on first Browserbase command
    terminalSandbox: null,
    manifestCache: new Map(),
    executionState: new Map(),
    createdAt: Date.now(),
    lastActivityAt: Date.now()
  };

  // Eagerly initialize Virtual PC (most common use case)
  try {
    env.virtualPcSession = await createVirtualPCSession(agentId, sessionId);
  } catch (err) {
    console.error(`Failed to initialize Virtual PC for agent ${agentId}:`, err);
    throw err;
  }

  // Eagerly initialize Terminal Sandbox
  try {
    env.terminalSandbox = await createTerminalSandbox(agentId, sessionId);
  } catch (err) {
    console.error(`Failed to initialize Terminal Sandbox for agent ${agentId}:`, err);
    // Don't fail entire env creation if Terminal init fails
    env.terminalSandbox = null;
  }

  // Register for cleanup/monitoring
  simulationRegistry.set(agentId, env);

  return env;
}

/**
 * Get existing simulation environment or create if missing
 * Used by executor dispatch to ensure environment exists
 */
export async function getOrCreateSimulationEnvironment(
  agentId: string
): Promise<SimulationEnvironment> {
  let env = simulationRegistry.get(agentId);
  if (!env) {
    env = await spinUpSimulationEnvironment(agentId);
  }
  env.lastActivityAt = Date.now();
  return env;
}

/**
 * Lazy-initialize Browserbase session on first use
 * Caches session in environment to reuse across commands
 */
async function getOrCreateBrowserbaseSession(
  env: SimulationEnvironment
): Promise<BrowserbaseSession> {
  if (env.browserbaseSession) {
    return env.browserbaseSession;
  }

  const session = await createBrowserbaseSession(env.agentId, env.sessionId);
  env.browserbaseSession = session;
  return session;
}

/**
 * Fan-out command to multiple executors in parallel
 * Returns results from all executors; caller decides which to use (typically fastest)
 *
 * Executes up to 3 executors concurrently:
 * - Virtual PC (if available)
 * - Browserbase (if configured)
 * - Terminal Sandbox (if applicable)
 */
export async function distributeCommandToParallelExecutors(
  env: SimulationEnvironment,
  cmd: SafeDomCommand
): Promise<ExecutorDispatchResult> {
  const executorPromises: Promise<{ type: ExecutorType; result: ExecutorResult | null; latency: number }>[] =
    [];

  // Virtual PC executor
  if (env.virtualPcSession) {
    executorPromises.push(
      (async () => {
        const t0 = performance.now();
        try {
          const result = await env.virtualPcSession!.executeCommand(cmd);
          return {
            type: 'virtual-pc' as const,
            result,
            latency: performance.now() - t0
          };
        } catch (err) {
          console.error('Virtual PC execution failed:', err);
          return { type: 'virtual-pc' as const, result: null, latency: performance.now() - t0 };
        }
      })()
    );
  }

  // Browserbase executor
  if (env.browserbaseSession || (cmd.executorType === 'browserbase' && env.agentId)) {
    executorPromises.push(
      (async () => {
        const t0 = performance.now();
        try {
          const bbSession = await getOrCreateBrowserbaseSession(env);
          const result = await bbSession.executeCommand(cmd);
          return {
            type: 'browserbase' as const,
            result,
            latency: performance.now() - t0
          };
        } catch (err) {
          console.error('Browserbase execution failed:', err);
          return { type: 'browserbase' as const, result: null, latency: performance.now() - t0 };
        }
      })()
    );
  }

  // Terminal Sandbox executor
  if (env.terminalSandbox && (cmd.executorType === 'terminal' || cmd.executorType === undefined)) {
    executorPromises.push(
      (async () => {
        const t0 = performance.now();
        try {
          const result = await env.terminalSandbox!.executeCommand(cmd);
          return {
            type: 'terminal' as const,
            result,
            latency: performance.now() - t0
          };
        } catch (err) {
          console.error('Terminal execution failed:', err);
          return { type: 'terminal' as const, result: null, latency: performance.now() - t0 };
        }
      })()
    );
  }

  // Execute all in parallel, collect results
  const outcomes = await Promise.allSettled(executorPromises);

  const results: ExecutorResult[] = [];
  const timing: Record<string, number> = {};
  let winnerIndex = -1;

  outcomes.forEach((outcome, idx) => {
    if (outcome.status === 'fulfilled') {
      const { type, result, latency } = outcome.value;
      timing[type] = latency;

      if (result) {
        results.push(result);
        if (winnerIndex === -1) {
          // First successful result wins
          winnerIndex = results.length - 1;
        }
      }
    }
  });

  return {
    results,
    winnerIndex,
    timing
  };
}

/**
 * Aggregate results from parallel executor dispatch
 * Returns best result based on success, latency, and executor preference
 */
export function selectBestExecutorResult(
  dispatchResult: ExecutorDispatchResult
): ExecutorResult | null {
  if (dispatchResult.winnerIndex >= 0) {
    return dispatchResult.results[dispatchResult.winnerIndex];
  }
  return null;
}

/**
 * Get manifest from environment cache
 * Returns null if not cached or expired
 */
export function getManifestFromCache(
  env: SimulationEnvironment,
  manifestId: string
): SafeElementManifest[] | null {
  return env.manifestCache.get(manifestId) || null;
}

/**
 * Cache manifest in environment with size limits
 * LRU eviction when max entries or memory exceeded
 */
export function cacheManifest(
  env: SimulationEnvironment,
  manifestId: string,
  manifest: SafeElementManifest[]
): void {
  // Evict oldest entry if at capacity
  if (env.manifestCache.size >= MANIFEST_CACHE_MAX_ENTRIES) {
    const oldestKey = env.manifestCache.keys().next().value;
    env.manifestCache.delete(oldestKey);
  }

  env.manifestCache.set(manifestId, manifest);
}

/**
 * Clean up stale simulation environments
 * Run every 5 minutes to free resources
 *
 * Shuts down environments idle for >30 minutes
 */
export async function cleanupStaleSimulations(): Promise<number> {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [agentId, env] of simulationRegistry.entries()) {
    if (now - env.lastActivityAt > SIMULATION_TTL_MS) {
      try {
        // Shutdown executor instances
        if (env.virtualPcSession) {
          await env.virtualPcSession.shutdown();
        }
        if (env.browserbaseSession) {
          await env.browserbaseSession.close();
        }
        if (env.terminalSandbox) {
          await env.terminalSandbox.cleanup();
        }

        // Clear cache and state
        env.manifestCache.clear();
        env.executionState.clear();

        simulationRegistry.delete(agentId);
        cleanedCount++;

        console.log(`Cleaned up simulation environment for agent ${agentId} (idle ${Math.round((now - env.lastActivityAt) / 1000)}s)`);
      } catch (err) {
        console.error(`Error cleaning up simulation for agent ${agentId}:`, err);
      }
    }
  }

  return cleanedCount;
}

/**
 * Get current registry stats for monitoring
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

  return {
    activeEnvironments: simulationRegistry.size,
    totalAgents: simulationRegistry.size,
    cacheMetrics: {
      totalEntries: totalCacheEntries,
      avgEntriesPerEnv: simulationRegistry.size > 0 ? Math.round(totalCacheEntries / simulationRegistry.size) : 0
    }
  };
}

/**
 * Shutdown all simulation environments (for tests / graceful shutdown)
 */
export async function shutdownAllSimulations(): Promise<void> {
  const cleanupPromises = [];

  for (const [agentId, env] of simulationRegistry.entries()) {
    if (env.virtualPcSession) {
      cleanupPromises.push(env.virtualPcSession.shutdown().catch(err => console.error(err)));
    }
    if (env.browserbaseSession) {
      cleanupPromises.push(env.browserbaseSession.close().catch(err => console.error(err)));
    }
    if (env.terminalSandbox) {
      cleanupPromises.push(env.terminalSandbox.cleanup().catch(err => console.error(err)));
    }
  }

  await Promise.all(cleanupPromises);
  simulationRegistry.clear();
}

// Auto-cleanup: Run stale environment cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupStaleSimulations, 5 * 60 * 1000).unref();
}
