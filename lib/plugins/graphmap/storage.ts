import { getDsgSupabaseRpcConfig, callDsgRpc, readDsgRest } from '@/lib/dsg/server/supabase-rpc';
import type { GraphSnapshot, GraphRow } from './types';

export function getGraphmapConfig(userAccessToken?: string) {
  return getDsgSupabaseRpcConfig(userAccessToken);
}

export async function saveGraph(
  userAccessToken: string,
  actorId: string,
  workspaceId: string,
  snapshot: GraphSnapshot,
  includePatterns: string[],
  excludePatterns: string[],
): Promise<string> {
  const config = getDsgSupabaseRpcConfig(userAccessToken);
  const graphId = await callDsgRpc<string>(config, 'upsert_graphmap_graph', {
    p_workspace_id: workspaceId,
    p_built_by: actorId,
    p_node_count: snapshot.nodeCount,
    p_edge_count: snapshot.edgeCount,
    p_include_patterns: JSON.stringify(includePatterns),
    p_exclude_patterns: JSON.stringify(excludePatterns),
    p_graph_data: snapshot as unknown as Record<string, unknown>,
    p_warnings: snapshot.warnings,
  });
  return graphId;
}

export async function loadLatestGraph(
  userAccessToken: string,
  workspaceId: string,
): Promise<{ row: GraphRow; graphAgeMs: number } | null> {
  const config = getDsgSupabaseRpcConfig(userAccessToken);
  const rows = await readDsgRest<GraphRow[]>(config, 'dsg_graphmap_graphs', {
    workspace_id: `eq.${workspaceId}`,
    order: 'built_at.desc',
    limit: '1',
    select: '*',
  });
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  const graphAgeMs = Date.now() - new Date(row.built_at).getTime();
  return { row, graphAgeMs };
}
