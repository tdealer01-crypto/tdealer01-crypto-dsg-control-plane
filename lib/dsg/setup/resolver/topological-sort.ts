/**
 * Topological sort using Kahn's algorithm
 * Computes execution phases for dependency graphs
 */

import { DependencyGraph } from './graph';
import type { GraphNode } from './graph';

export interface Phase {
  phase: number;
  items: GraphNode[];
  can_run_parallel: boolean;
}

export class TopologicalSort {
  /**
   * Sort nodes into phases using Kahn's algorithm
   * Returns phases that can be executed sequentially (with parallel execution within phase)
   */
  sort(graph: DependencyGraph): Phase[] {
    if (graph.isEmpty()) {
      return [];
    }

    // Copy in-degree map
    const inDegree = new Map<string, number>();
    for (const node of graph.getNodes()) {
      inDegree.set(node.id, graph.getInDegree(node.id));
    }

    // Initialize queue with nodes that have no dependencies
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const phases: Phase[] = [];
    const processedCount = new Set<string>();

    while (queue.length > 0) {
      // Current phase: all nodes with in-degree 0
      const currentPhaseItems = queue.splice(0, queue.length); // Drain queue
      const phaseNodes = currentPhaseItems
        .map((id) => graph.getNode(id))
        .filter((n) => n !== undefined) as GraphNode[];

      if (phaseNodes.length === 0) break;

      phases.push({
        phase: phases.length,
        items: phaseNodes,
        can_run_parallel: true, // All items in a phase have no inter-dependencies
      });

      // Process edges from current phase nodes
      for (const nodeId of currentPhaseItems) {
        processedCount.add(nodeId);

        // Reduce in-degree for dependent nodes
        const outgoing = graph.getOutgoingEdges(nodeId);
        for (const edge of outgoing) {
          const currentDegree = inDegree.get(edge.to) || 0;
          const newDegree = currentDegree - 1;
          inDegree.set(edge.to, newDegree);

          // If dependency is satisfied, add to next phase queue
          if (newDegree === 0) {
            queue.push(edge.to);
          }
        }
      }
    }

    // Check for cycles
    if (processedCount.size < graph.getNodeCount()) {
      const unprocessed = graph
        .getNodes()
        .filter((n) => !processedCount.has(n.id))
        .map((n) => n.id);
      throw new Error(`Circular dependency detected in graph. Unprocessed nodes: ${unprocessed.join(', ')}`);
    }

    return phases;
  }

  /**
   * Validate graph has no cycles before sorting
   */
  validateNoCycles(graph: DependencyGraph): { valid: boolean; error?: string } {
    try {
      this.sort(graph);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Compute total estimated time including parallelization
   */
  estimateTotalTime(phases: Phase[]): number {
    return phases.reduce((total, phase) => {
      const maxPhaseTime = Math.max(
        ...phase.items.map((item) => item.estimated_seconds || 30),
        0,
      );
      return total + maxPhaseTime;
    }, 0);
  }
}
