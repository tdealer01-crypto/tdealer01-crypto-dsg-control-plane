/**
 * Manifest database helper
 * Fetches SafeElementManifest from Supabase on cache miss
 */

import type { SafeElementManifest } from '@/lib/dsg/safe-dom/types';

/**
 * Fetch manifest from database
 * In Phase 2, this is a placeholder that returns null
 * In production, would query: supabase.from('safe_dom_manifests')
 *   .select()
 *   .eq('frame_id', frameId)
 *   .eq('element_id', elementId)
 *
 * TODO (Phase 3): Implement real database query
 */
export async function getManifestFromDatabase(
  frameId: string,
  elementId: string
): Promise<SafeElementManifest[] | null> {
  // Phase 2: Return null to trigger re-queueing or BLOCK decision
  // This ensures we exercise the fallback path

  // Placeholder for real implementation:
  // const { data, error } = await supabaseAdmin
  //   .from('safe_dom_manifests')
  //   .select('*')
  //   .eq('frame_id', frameId)
  //   .eq('element_id', elementId)
  //   .limit(10);
  //
  // if (error) {
  //   console.error('Failed to fetch manifest:', error);
  //   return null;
  // }
  //
  // return data as SafeElementManifest[];

  return null;
}
