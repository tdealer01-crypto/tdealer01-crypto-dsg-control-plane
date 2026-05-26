import { stat } from 'fs/promises';
import { join, dirname, resolve, normalize } from 'path';
import { readFileContent } from './scanner';
import type { GraphNode, GraphEdge, GraphNodeType, GraphSnapshot } from './types';

function classifyNode(relPath: string): GraphNodeType {
  if (/app\/api\/.+\/route\.[jt]sx?$/.test(relPath)) return 'route';
  if (/\.test\.[jt]sx?$/.test(relPath) || /\.spec\.[jt]sx?$/.test(relPath)) return 'test';
  if (/supabase\/migrations\/.+\.sql$/.test(relPath)) return 'migration';
  if (/^lib\//.test(relPath)) return 'lib';
  if (/app\/dsg\/.+\.[jt]sx?$/.test(relPath)) return 'component';
  if (/^scripts\//.test(relPath) || /^scripts\//.test(relPath)) return 'script';
  if (/\.(md|mdx|yaml|yml)$/.test(relPath)) return 'doc';
  if (/\.(json|toml|env)$/.test(relPath)) return 'config';
  return 'other';
}

const TS_IMPORT_RE = /from\s+['"](\.[^'"]+)['"]/g;
const MD_LINK_RE = /\[.*?\]\((\.[^)]+)\)/g;

function resolveRelPath(fromFile: string, importPath: string): string | null {
  try {
    const fromDir = dirname(fromFile);
    const resolved = normalize(join(fromDir, importPath)).replace(/\\/g, '/');
    // Handle path without extension — try common extensions
    if (!resolved.match(/\.[^/]+$/)) {
      // Return as-is; builder will try matching against known nodes
      return resolved;
    }
    return resolved;
  } catch {
    return null;
  }
}

function closestNodeId(target: string, nodeIds: Set<string>): string | null {
  if (nodeIds.has(target)) return target;
  // Try with common extensions
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    if (nodeIds.has(target + ext)) return target + ext;
    if (nodeIds.has(target + '/index' + ext)) return target + '/index' + ext;
  }
  return null;
}

export async function buildGraph(rootPath: string, files: string[]): Promise<GraphSnapshot> {
  const builtAt = new Date().toISOString();
  const warnings: string[] = [];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  // Build nodes
  for (const relPath of files) {
    let size: number | undefined;
    try {
      const s = await stat(join(rootPath, relPath));
      size = s.size;
    } catch {
      // ignore
    }
    nodes.push({
      id: relPath,
      path: relPath,
      nodeType: classifyNode(relPath),
      size,
      builtAt,
    });
  }

  const nodeIds = new Set(nodes.map(n => n.id));

  // Build edges from file content
  for (const relPath of files) {
    const content = await readFileContent(rootPath, relPath);
    if (!content) continue;

    // TypeScript/JS import edges
    if (/\.[jt]sx?$/.test(relPath)) {
      let m: RegExpExecArray | null;
      TS_IMPORT_RE.lastIndex = 0;
      while ((m = TS_IMPORT_RE.exec(content)) !== null) {
        const importPath = m[1];
        const resolved = resolveRelPath(relPath, importPath);
        if (!resolved) continue;
        const toId = closestNodeId(resolved, nodeIds);
        if (!toId || toId === relPath) continue;
        const key = `${relPath}|import|${toId}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ from: relPath, to: toId, edgeType: 'import', confidence: 'EXTRACTED' });
        }
      }
    }

    // Markdown link edges
    if (/\.(md|mdx)$/.test(relPath)) {
      let m: RegExpExecArray | null;
      MD_LINK_RE.lastIndex = 0;
      while ((m = MD_LINK_RE.exec(content)) !== null) {
        const linkPath = m[1].split('#')[0]; // strip anchors
        if (!linkPath) continue;
        const resolved = resolveRelPath(relPath, linkPath);
        if (!resolved) continue;
        const toId = closestNodeId(resolved, nodeIds);
        if (!toId || toId === relPath) continue;
        const key = `${relPath}|link|${toId}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ from: relPath, to: toId, edgeType: 'link', confidence: 'EXTRACTED' });
        }
      }
    }
  }

  // Co-location edges (INFERRED) — files in same directory
  const dirMap = new Map<string, string[]>();
  for (const n of nodes) {
    const dir = dirname(n.id);
    if (!dirMap.has(dir)) dirMap.set(dir, []);
    dirMap.get(dir)!.push(n.id);
  }
  for (const [, siblings] of dirMap) {
    if (siblings.length < 2 || siblings.length > 20) continue; // skip huge dirs
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const key = `${siblings[i]}|co-located|${siblings[j]}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ from: siblings[i], to: siblings[j], edgeType: 'co-located', confidence: 'INFERRED' });
        }
      }
    }
  }

  if (nodes.length === 0) {
    warnings.push('No files matched include patterns');
  }

  return {
    builtAt,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
    warnings,
  };
}
