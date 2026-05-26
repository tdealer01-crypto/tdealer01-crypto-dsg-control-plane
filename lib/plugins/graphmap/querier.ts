import type { GraphSnapshot, EvidenceItem, QueryResult, EdgeType } from './types';
import { evaluateGate } from './gate';

const STOPWORDS = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'be', 'in', 'of', 'for', 'to', 'and', 'or', 'ที่', 'ใน', 'ของ', 'และ', 'หรือ', 'ไหน', 'ไหม', 'อะไร', 'ยังไง']);

function extractKeywords(question: string): string[] {
  return question
    .toLowerCase()
    .split(/[\s\-_/.,?!]+/)
    .filter(k => k.length > 1 && !STOPWORDS.has(k));
}

function nodeMatchesKeywords(nodePath: string, keywords: string[]): boolean {
  const lower = nodePath.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

export function queryGraph(
  graph: GraphSnapshot,
  question: string,
  maxDepth = 2,
  graphAgeMs?: number,
): QueryResult {
  const keywords = extractKeywords(question);

  // Build adjacency maps
  const outEdges = new Map<string, { to: string; edgeType: EdgeType; confidence: typeof graph.edges[0]['confidence'] }[]>();
  const inEdges = new Map<string, { from: string; edgeType: EdgeType; confidence: typeof graph.edges[0]['confidence'] }[]>();

  for (const edge of graph.edges) {
    if (!outEdges.has(edge.from)) outEdges.set(edge.from, []);
    outEdges.get(edge.from)!.push({ to: edge.to, edgeType: edge.edgeType, confidence: edge.confidence });
    if (!inEdges.has(edge.to)) inEdges.set(edge.to, []);
    inEdges.get(edge.to)!.push({ from: edge.from, edgeType: edge.edgeType, confidence: edge.confidence });
  }

  // Find seed nodes
  const seedNodeIds = graph.nodes
    .filter(n => nodeMatchesKeywords(n.path, keywords))
    .map(n => n.id);

  // BFS to collect evidence
  const visited = new Set<string>(seedNodeIds);
  const evidenceMap = new Map<string, EvidenceItem>();

  // Seed nodes themselves are evidence
  for (const id of seedNodeIds) {
    evidenceMap.set(id, { file: id, relation: 'references', confidence: 'EXTRACTED' });
  }

  let frontier = [...seedNodeIds];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const nodeId of frontier) {
      // Follow outgoing edges
      for (const { to, edgeType, confidence } of outEdges.get(nodeId) ?? []) {
        if (!visited.has(to)) {
          visited.add(to);
          next.push(to);
          if (!evidenceMap.has(to)) {
            evidenceMap.set(to, { file: to, relation: edgeType, confidence });
          }
        }
      }
      // Follow incoming edges
      for (const { from, edgeType, confidence } of inEdges.get(nodeId) ?? []) {
        if (!visited.has(from)) {
          visited.add(from);
          next.push(from);
          if (!evidenceMap.has(from)) {
            evidenceMap.set(from, { file: from, relation: edgeType, confidence });
          }
        }
      }
    }
    frontier = next;
  }

  const evidence = Array.from(evidenceMap.values());
  const gate = evaluateGate(evidence, graphAgeMs);

  const relatedCount = evidence.length - seedNodeIds.length;
  const answer = seedNodeIds.length === 0
    ? `No files matched keywords: ${keywords.join(', ')}`
    : `Found ${seedNodeIds.length} directly matching file(s) and ${relatedCount} related file(s) for: ${keywords.join(', ')}`;

  return {
    decision: gate.decision,
    answer,
    evidence,
    blockedClaims: gate.blockedClaims,
  };
}
