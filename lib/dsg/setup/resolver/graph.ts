/**
 * Dependency Graph representation and traversal
 * Models provider dependencies for topological sorting
 */

export interface GraphNode {
  id: string;
  provider_id: string;
  action: string;
  params?: Record<string, unknown>;
  provides?: Record<string, unknown>;
  requires?: Record<string, unknown>;
  estimated_seconds?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  requires_output?: string;
}

export class DependencyGraph {
  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];
  private inDegree = new Map<string, number>();

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.inDegree.has(node.id)) {
      this.inDegree.set(node.id, 0);
    }
  }

  addEdge(from: string, to: string, requiresOutput?: string): void {
    const edge: GraphEdge = { from, to, requires_output: requiresOutput };
    this.edges.push(edge);

    // Update in-degree
    this.inDegree.set(to, (this.inDegree.get(to) || 0) + 1);
  }

  getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getEdges(): GraphEdge[] {
    return [...this.edges];
  }

  getIncomingEdges(nodeId: string): GraphEdge[] {
    return this.edges.filter((e) => e.to === nodeId);
  }

  getOutgoingEdges(nodeId: string): GraphEdge[] {
    return this.edges.filter((e) => e.from === nodeId);
  }

  getInDegree(nodeId: string): number {
    return this.inDegree.get(nodeId) || 0;
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  isEmpty(): boolean {
    return this.nodes.size === 0;
  }
}
