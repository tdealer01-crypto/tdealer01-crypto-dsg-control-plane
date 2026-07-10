/**
 * Dependency Resolver
 * Builds graph from discovered services and resolves execution order
 */

import { DependencyGraph } from './graph';
import { TopologicalSort } from './topological-sort';
import { manifestRegistry } from '../manifest';
import type { SuggestedProvider, DependencyGraph as DependencyGraphType, Phase } from '../types';

export class DependencyResolver {
  private topoSort = new TopologicalSort();

  /**
   * Build dependency graph from suggested providers
   */
  buildGraph(suggestedProviders: SuggestedProvider[]): DependencyGraph {
    const graph = new DependencyGraph();

    // Add nodes for each provider
    for (const provider of suggestedProviders) {
      const manifest = manifestRegistry.get(provider.provider);
      if (!manifest) continue;

      const nodeId = `${provider.provider}:${provider.capability}`;

      graph.addNode({
        id: nodeId,
        provider_id: provider.provider,
        action: provider.capability,
        estimated_seconds: 30, // Default, can be customized per provider
        provides: {},
        requires: {},
      });
    }

    // Add edges based on manifest dependencies
    for (const provider of suggestedProviders) {
      const manifest = manifestRegistry.get(provider.provider);
      if (!manifest) continue;

      const nodeId = `${provider.provider}:${provider.capability}`;

      // Add dependencies from manifest
      for (const dep of manifest.dependencies || []) {
        const depProvider = suggestedProviders.find((p) => p.provider === dep);
        if (depProvider) {
          const depNodeId = `${dep}:${depProvider.capability}`;
          graph.addEdge(depNodeId, nodeId, dep);
        }
      }

      // Add dependencies from requires
      for (const req of manifest.requires || []) {
        // For now, simple dependency on capability
        // In future, could be more sophisticated (resource matching)
        const matchingProviders = suggestedProviders.filter((p) =>
          p.capability.includes(req.resource),
        );

        for (const matchingProvider of matchingProviders) {
          const matchNodeId = `${matchingProvider.provider}:${matchingProvider.capability}`;
          if (matchNodeId !== nodeId) {
            graph.addEdge(matchNodeId, nodeId, req.resource);
          }
        }
      }
    }

    return graph;
  }

  /**
   * Resolve execution phases from graph
   */
  resolvePhases(graph: DependencyGraph): Phase[] {
    const validation = this.topoSort.validateNoCycles(graph);
    if (!validation.valid) {
      throw new Error(`Cannot resolve phases: ${validation.error}`);
    }

    const phases = this.topoSort.sort(graph);

    // Convert to Phase type, stamping each item with its resolved phase number
    return phases.map((phase) => ({
      phase: phase.phase,
      items: phase.items.map((item) => ({ ...item, phase: phase.phase })),
      can_run_parallel: phase.can_run_parallel,
    }));
  }

  /**
   * Full resolution: build graph + resolve phases
   */
  resolve(suggestedProviders: SuggestedProvider[]): DependencyGraphType {
    const graph = this.buildGraph(suggestedProviders);
    const phases = this.resolvePhases(graph);

    const totalTime = this.topoSort.estimateTotalTime(phases);

    // Collect all nodes from phases (they already have phase property set)
    const nodes = phases.flatMap((phase) => phase.items);

    return {
      nodes,
      edges: graph.getEdges(),
      phases,
    };
  }
}

export const dependencyResolver = new DependencyResolver();
