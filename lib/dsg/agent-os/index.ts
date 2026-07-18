/**
 * DSG Agent OS — Unified Export
 *
 * Dynamic Agent Registry + Event Bus + Shared Memory + Multi-Model Router + Executive Hierarchy
 * All components produce deterministic evidence hashes for audit trails.
 */

import { agentRegistry } from './registry';
import { eventBus } from './event-bus';
import { sharedMemory } from './memory';
import { multiModelRouter } from './router';
import { executiveHierarchy } from './executive';

export * from './registry';
export * from './event-bus';
export * from './memory';
export * from './router';
export * from './executive';

// Re-export singletons
export { agentRegistry } from './registry';
export { eventBus } from './event-bus';
export { sharedMemory } from './memory';
export { multiModelRouter } from './router';
export { executiveHierarchy } from './executive';

/**
 * Initialize the full Agent OS stack.
 * Call this once at application startup.
 */
export async function initializeAgentOS(options?: {
  redisUrl?: string;
  upstashUrl?: string;
  upstashToken?: string;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
}): Promise<{
  registry: boolean;
  eventBus: boolean;
  memory: boolean;
  router: boolean;
  executive: boolean;
}> {
  const results = {
    registry: true, // always available (in-memory)
    eventBus: false,
    memory: false,
    router: true, // always available (in-memory)
    executive: true, // always available
  };

  // Initialize Event Bus: Upstash REST (durable) preferred, then legacy Redis URL, then in-memory
  if (options?.upstashUrl && options?.upstashToken) {
    const eventBusResult = await eventBus.initializeUpstash({
      url: options.upstashUrl,
      token: options.upstashToken,
    });
    results.eventBus = eventBusResult.ok;
  } else if (options?.redisUrl) {
    const eventBusResult = await eventBus.initializeRedis(options.redisUrl);
    results.eventBus = eventBusResult.ok;
  } else {
    results.eventBus = true; // in-memory fallback
  }

  // Initialize Shared Memory with Supabase
  if (options?.supabaseUrl && options?.supabaseServiceKey) {
    const memoryResult = await sharedMemory.initializeSupabase(options.supabaseUrl, options.supabaseServiceKey);
    results.memory = memoryResult.ok;
  } else {
    results.memory = true; // in-memory fallback
  }

  // Health check models
  await multiModelRouter.healthCheck();

  return results;
}

/**
 * Shutdown the Agent OS stack gracefully.
 */
export async function shutdownAgentOS(): Promise<void> {
  await eventBus.shutdown();
  // Other components are in-memory, no cleanup needed
}

/**
 * Get overall system health.
 */
export async function getAgentOSHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    registry: { status: string; stats: ReturnType<typeof agentRegistry.getStats> };
    eventBus: { status: string; stats: ReturnType<typeof eventBus.getStats> };
    memory: { status: string; stats: Awaited<ReturnType<typeof sharedMemory.getStats>> };
    router: { status: string; stats: ReturnType<typeof multiModelRouter.getStats> };
    executive: { status: string; stats: ReturnType<typeof executiveHierarchy.getOrgStats> };
  };
  evidenceChainValid: boolean;
}> {
  const registryStats = agentRegistry.getStats();
  const eventBusStats = eventBus.getStats();
  const memoryStats = await sharedMemory.getStats();
  const routerStats = multiModelRouter.getStats();
  const executiveStats = executiveHierarchy.getOrgStats();

  const registryValid = agentRegistry.verifyEvidenceChain().valid;
  const eventBusHealthy = eventBusStats.usingRedis || eventBusStats.eventsInMemory >= 0;
  const memoryHealthy = true; // in-memory always works
  const routerHealthy = routerStats.errors / Math.max(routerStats.totalRequests, 1) < 0.1;
  const executiveHealthy = true;

  const allHealthy = registryValid && eventBusHealthy && memoryHealthy && routerHealthy && executiveHealthy;
  const anyDegraded = !registryValid || !routerHealthy;

  return {
    status: allHealthy ? 'healthy' : anyDegraded ? 'degraded' : 'unhealthy',
    components: {
      registry: { status: registryValid ? 'healthy' : 'degraded', stats: registryStats },
      eventBus: { status: eventBusHealthy ? 'healthy' : 'degraded', stats: eventBusStats },
      memory: { status: memoryHealthy ? 'healthy' : 'degraded', stats: memoryStats },
      router: { status: routerHealthy ? 'healthy' : 'degraded', stats: routerStats },
      executive: { status: executiveHealthy ? 'healthy' : 'degraded', stats: executiveStats },
    },
    evidenceChainValid: registryValid,
  };
}