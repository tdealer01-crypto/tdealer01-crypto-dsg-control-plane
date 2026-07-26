/**
 * Adversarial Scenario Injection for DeepTutor Simulation
 *
 * Injects realistic attack scenarios, failure modes, and chaos conditions
 * into the simulation to test agent robustness and recovery.
 *
 * Attack Categories:
 * - Replay attacks: request replay, nonce reuse
 * - Timing attacks: latency injection, clock skew
 * - Resource attacks: memory pressure, queue flooding
 * - Availability attacks: cascade failures, partial outages
 * - Data quality attacks: confidence manipulation, citation spoofing
 */

import type { SimulationInput, ExecutionRequest, WorldState } from '../spine/types';
import type { DeepTutorFailureMode } from './types';

/**
 * Adversarial attack configuration
 */
export interface AdversarialConfig {
  enabled: boolean;
  injectionRate: number; // 0-1: probability of injecting attack per tick
  attackCategories: AttackCategory[];
  cascadeRisk: number; // 0-1: probability of cascade failure
  recoveryMeanTimeMs: number; // MTTR for failures
  seed: number; // deterministic attack generation
}

export type AttackCategory = 'replay' | 'timing' | 'resource' | 'availability' | 'data-quality' | 'consensus';

/**
 * Injected attack event
 */
export interface AdversarialEvent {
  tick: number;
  attackId: string;
  category: AttackCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetAgentIds?: string[];
  targetSourceIds?: string[];
  effectDurationTicks: number;
  payload: Record<string, unknown>;
  recoveryTime?: number;
}

/**
 * Attack vector base class
 */
abstract class AttackVector {
  abstract generate(tick: number, seed: number): AdversarialEvent[];
}

/**
 * Replay attack: replay previous requests to exhaust quota
 */
export class ReplayAttack extends AttackVector {
  generate(tick: number, seed: number): AdversarialEvent[] {
    const rng = this.seededRandom(seed + tick);
    if (rng > 0.95) {
      return [
        {
          tick,
          attackId: `replay-${tick}`,
          category: 'replay',
          severity: rng > 0.98 ? 'critical' : 'high',
          targetAgentIds: this.selectRandomAgents(3, seed),
          effectDurationTicks: 10 + Math.floor(rng * 20),
          payload: {
            replaysPerSecond: 50 + Math.floor(rng * 450),
            nonceReuseProbability: 0.7 + rng * 0.29,
            targetedQuotas: ['freeTierQuota', 'paidTierQuota'],
          },
        },
      ];
    }
    return [];
  }

  private selectRandomAgents(count: number, seed: number): string[] {
    const agents = ['agent-chat-1', 'agent-research-1', 'agent-solve-1'];
    const rng = this.seededRandom(seed);
    return agents.slice(0, Math.floor(rng * count) + 1);
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
}

/**
 * Timing attack: inject latency to trigger timeout failures
 */
export class TimingAttack extends AttackVector {
  generate(tick: number, seed: number): AdversarialEvent[] {
    const rng = this.seededRandom(seed + tick * 2);
    if (rng > 0.92) {
      return [
        {
          tick,
          attackId: `timing-${tick}`,
          category: 'timing',
          severity: rng > 0.97 ? 'high' : 'medium',
          targetAgentIds: rng > 0.94 ? ['agent-research-1'] : undefined,
          effectDurationTicks: 5 + Math.floor(rng * 15),
          payload: {
            latencyAddMs: 1000 + Math.floor(rng * 4000),
            jitterFactor: 0.1 + rng * 0.5,
            affectedEndpoints: ['POST /api/execute', 'POST /api/intent'],
            timeoutThreshold: 5000,
          },
        },
      ];
    }
    return [];
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
}

/**
 * Resource attack: exhaustion via memory pressure, queue flooding
 */
export class ResourceAttack extends AttackVector {
  generate(tick: number, seed: number): AdversarialEvent[] {
    const rng = this.seededRandom(seed + tick * 3);
    if (rng > 0.88) {
      return [
        {
          tick,
          attackId: `resource-${tick}`,
          category: 'resource',
          severity: rng > 0.95 ? 'critical' : 'high',
          effectDurationTicks: 20 + Math.floor(rng * 40),
          payload: {
            memoryPressurePercent: 70 + Math.floor(rng * 29),
            queueFloodingRps: 500 + Math.floor(rng * 2500),
            cpuUtilization: 80 + Math.floor(rng * 19),
            cacheEvictionRate: 0.5 + rng * 0.49,
            constrainedResources: ['memory', 'queue_depth', 'cpu'],
          },
        },
      ];
    }
    return [];
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
}

/**
 * Availability attack: cascade failures, partial outages
 */
export class AvailabilityAttack extends AttackVector {
  generate(tick: number, seed: number, cascadeRisk: number = 0.1): AdversarialEvent[] {
    const rng = this.seededRandom(seed + tick * 4);
    if (rng > 0.90) {
      const isCascade = rng > 1.0 - cascadeRisk;
      return [
        {
          tick,
          attackId: `availability-${tick}`,
          category: 'availability',
          severity: isCascade ? 'critical' : rng > 0.95 ? 'high' : 'medium',
          targetAgentIds: isCascade ? ['agent-chat-1', 'agent-research-1'] : ['agent-solve-1'],
          effectDurationTicks: isCascade ? 30 : 10,
          payload: {
            failureType: isCascade ? 'cascade' : 'partial',
            affectedServices: isCascade ? ['RAG', 'Chat', 'Research'] : ['Solve'],
            recoveryTimeMs: 5000 + Math.floor(rng * 25000),
            cascadeProbability: cascadeRisk,
            affectedAgents: isCascade ? 2 : 1,
          },
        },
      ];
    }
    return [];
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
}

/**
 * Data quality attack: confidence manipulation, citation spoofing
 */
export class DataQualityAttack extends AttackVector {
  generate(tick: number, seed: number): AdversarialEvent[] {
    const rng = this.seededRandom(seed + tick * 5);
    if (rng > 0.93) {
      return [
        {
          tick,
          attackId: `data-quality-${tick}`,
          category: 'data-quality',
          severity: 'medium',
          targetSourceIds: ['source-pdf-1', 'source-docs-1'],
          effectDurationTicks: 15 + Math.floor(rng * 25),
          payload: {
            confidenceManipulation: -0.2 + rng * 0.1, // reduce confidence
            falseCitations: Math.floor(rng * 3),
            poisonedTokens: Math.floor(rng * 100),
            relevanceScoreBias: -0.15 + rng * 0.1,
            affectedResultQualities: ['high', 'medium'],
          },
        },
      ];
    }
    return [];
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
}

/**
 * Consensus attack: byzantine behavior, voting manipulation
 */
export class ConsensusAttack extends AttackVector {
  generate(tick: number, seed: number): AdversarialEvent[] {
    const rng = this.seededRandom(seed + tick * 6);
    if (rng > 0.94) {
      return [
        {
          tick,
          attackId: `consensus-${tick}`,
          category: 'consensus',
          severity: rng > 0.97 ? 'high' : 'medium',
          targetAgentIds: ['agent-chat-1', 'agent-research-1', 'agent-solve-1'],
          effectDurationTicks: 20 + Math.floor(rng * 30),
          payload: {
            byzantineAgents: Math.floor(rng * 2),
            byzantineRatio: Math.floor(rng * 33), // up to 33% byzantine
            votingBias: 0.6 + rng * 0.39,
            equivocation: rng > 0.96,
            affectedDecisions: ['ALLOW', 'BLOCK'],
          },
        },
      ];
    }
    return [];
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
}

/**
 * Injects adversarial events into simulation input and world state
 */
export class AdversarialInjector {
  private config: AdversarialConfig;
  private attacks: Map<AttackCategory, AttackVector>;
  private activeEvents: Map<string, AdversarialEvent> = new Map();

  constructor(config: Partial<AdversarialConfig> = {}) {
    this.config = {
      enabled: true,
      injectionRate: 0.05,
      attackCategories: ['replay', 'timing', 'resource', 'availability', 'data-quality', 'consensus'],
      cascadeRisk: 0.1,
      recoveryMeanTimeMs: 15000,
      seed: 42,
      ...config,
    };

    this.attacks = new Map<AttackCategory, AttackVector>([
      ['replay', new ReplayAttack()],
      ['timing', new TimingAttack()],
      ['resource', new ResourceAttack()],
      ['availability', new AvailabilityAttack()],
      ['data-quality', new DataQualityAttack()],
      ['consensus', new ConsensusAttack()],
    ]);
  }

  /**
   * Generates adversarial events for a given tick
   */
  generateEvents(tick: number): AdversarialEvent[] {
    if (!this.config.enabled) return [];

    const events: AdversarialEvent[] = [];

    // Determine which attacks to inject this tick
    this.config.attackCategories.forEach((category) => {
      const attack = this.attacks.get(category);
      if (attack) {
        const generated = attack.generate(tick, this.config.seed);
        events.push(...generated);
      }
    });

    // Track active events and generate recovery
    this.updateActiveEvents(tick);

    return events;
  }

  /**
   * Applies adversarial events to an execution request
   */
  applyToRequest(request: ExecutionRequest, events: AdversarialEvent[]): ExecutionRequest {
    let modified = { ...request };

    events.forEach((event) => {
      if (event.category === 'replay') {
        // Force nonce collision
        modified.seed = Math.floor(Math.random() * 1000);
      } else if (event.category === 'timing') {
        // Mark for timeout simulation
        (modified as any)._adversarial_timing_attack = true;
      } else if (event.category === 'resource') {
        // Mark priority for queue skipping
        modified.priority = Math.max(1000, modified.priority);
      }
    });

    return modified;
  }

  /**
   * Updates active event tracking
   */
  private updateActiveEvents(tick: number): void {
    const expiredIds: string[] = [];

    this.activeEvents.forEach((event, id) => {
      if (tick >= event.tick + event.effectDurationTicks) {
        expiredIds.push(id);
      }
    });

    expiredIds.forEach((id) => this.activeEvents.delete(id));
  }

  /**
   * Gets current active adversarial events
   */
  getActiveEvents(tick: number): AdversarialEvent[] {
    return Array.from(this.activeEvents.values()).filter(
      (e) => tick >= e.tick && tick < e.tick + e.effectDurationTicks,
    );
  }

  /**
   * Computes impact metrics of active adversarial events
   */
  computeImpact(tick: number): {
    errorRateIncrease: number;
    latencyIncrease: number;
    availabilityDecrement: number;
    cascadeActive: boolean;
  } {
    const active = this.getActiveEvents(tick);

    let errorIncrease = 0;
    let latencyIncrease = 0;
    let availabilityDecrement = 0;
    let cascadeActive = false;

    active.forEach((event) => {
      switch (event.category) {
        case 'replay':
          errorIncrease += 0.05;
          break;
        case 'timing':
          latencyIncrease += (event.payload.latencyAddMs as number) || 1000;
          errorIncrease += 0.02;
          break;
        case 'resource':
          errorIncrease += 0.08;
          latencyIncrease += 500;
          availabilityDecrement += 0.1;
          break;
        case 'availability':
          availabilityDecrement += (event.payload.failureType === 'cascade' ? 0.3 : 0.15);
          cascadeActive = event.payload.failureType === 'cascade';
          break;
        case 'data-quality':
          errorIncrease += 0.03;
          break;
        case 'consensus':
          errorIncrease += 0.10;
          break;
      }
    });

    return {
      errorRateIncrease: Math.min(0.5, errorIncrease),
      latencyIncrease: Math.min(5000, latencyIncrease),
      availabilityDecrement: Math.min(0.5, availabilityDecrement),
      cascadeActive,
    };
  }
}

/**
 * Convenience: inject adversarial events into simulation input
 */
export function injectAdversarialIntoSimulation(
  simInput: SimulationInput,
  adversarialConfig?: Partial<AdversarialConfig>,
): SimulationInput {
  const injector = new AdversarialInjector(adversarialConfig);

  // Mark simulation as containing adversarial scenarios
  const modified = { ...simInput };
  (modified as any)._adversarial_injected = true;
  (modified as any)._adversarial_config = injector;

  return modified;
}
