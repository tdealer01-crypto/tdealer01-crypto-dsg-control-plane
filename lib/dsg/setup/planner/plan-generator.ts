/**
 * Provision Plan Generator
 * Builds execution plans with estimated time and visualization data
 */

import { dependencyResolver } from '../resolver';
import { canonicalHash } from '@/lib/runtime/canonical';
import type { SuggestedProvider, ProvisionPlan, DependencyGraph } from '../types';

export class PlanGenerator {
  /**
   * Generate a provision plan from discovered services
   */
  generatePlan(
    orgId: string,
    discoveryId: string | undefined,
    suggestedProviders: SuggestedProvider[],
  ): ProvisionPlan {
    // Resolve dependency graph
    const dependencyGraph = dependencyResolver.resolve(suggestedProviders);

    // Compute total estimated time (considering parallelization)
    const totalEstimatedSeconds = this.computeTotalTime(dependencyGraph);

    // Generate plan hash for approval verification
    const planData = {
      providers: suggestedProviders.map((p) => ({ ...p })).sort((a, b) => a.provider.localeCompare(b.provider)),
      phases: dependencyGraph.phases.length,
    };
    const canonicalPlanHash = canonicalHash(planData);

    return {
      id: crypto.randomUUID(),
      org_id: orgId,
      discovery_id: discoveryId,
      status: 'draft',
      plan_definition: {
        phases: dependencyGraph.phases,
      },
      dependency_graph: dependencyGraph,
      estimated_duration_seconds: totalEstimatedSeconds,
      canonical_plan_hash: canonicalPlanHash,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Compute total time with parallelization
   * Phase time = max(item times in phase)
   * Total = sum of all phase times
   */
  private computeTotalTime(dependencyGraph: DependencyGraph): number {
    return dependencyGraph.phases.reduce((total, phase) => {
      const maxItemTime = Math.max(
        ...phase.items.map((item) => item.estimated_seconds || 30),
        0,
      );
      return total + maxItemTime;
    }, 0);
  }

  /**
   * Validate plan is executable
   */
  validatePlan(plan: ProvisionPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plan.plan_definition.phases || plan.plan_definition.phases.length === 0) {
      errors.push('Plan must have at least one phase');
    }

    if (plan.estimated_duration_seconds <= 0) {
      errors.push('Estimated duration must be positive');
    }

    if (!plan.canonical_plan_hash || plan.canonical_plan_hash.length === 0) {
      errors.push('Plan hash is missing');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const planGenerator = new PlanGenerator();
