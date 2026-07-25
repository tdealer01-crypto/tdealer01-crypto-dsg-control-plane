/**
 * System Inventory Sync
 * Continuously synchronizes the system inventory with actual component discovery
 */

import { getSupabaseAdmin } from '@/lib/supabase-server';

interface ComponentDiscovery {
  type: 'route' | 'table' | 'policy' | 'tool' | 'integration' | 'skill' | 'agent';
  name: string;
  path_or_id: string;
  category?: string;
  tier?: string;
  metadata?: Record<string, any>;
}

interface SyncResult {
  added: number;
  removed: number;
  updated: number;
  errors: string[];
}

/**
 * Main sync function - called by cron job
 */
export async function syncSystemInventory(): Promise<SyncResult> {
  const supabase = getSupabaseAdmin();
  const result: SyncResult = { added: 0, removed: 0, updated: 0, errors: [] };

  try {
    // Step 1: Get currently discovered components
    const discovered = await discoverAllComponents();

    // Step 2: Get components from database
    const { data: existing } = await (supabase
      .from('dsg_system_components' as any)
      .select('*') as any);

    const existingMap = new Map(
      existing?.map((c: any) => [`${c.component_type}:${c.path_or_id}`, c]) || []
    );

    // Step 3: Add new components
    for (const comp of discovered) {
      const key = `${comp.type}:${comp.path_or_id}`;
      if (!existingMap.has(key)) {
        const { error } = await (supabase
          .from('dsg_system_components' as any)
          .insert({
            component_type: comp.type,
            name: comp.name,
            path_or_id: comp.path_or_id,
            category: comp.category,
            tier: comp.tier,
            metadata: comp.metadata,
            status: 'active',
          } as any) as any);

        if (error) {
          result.errors.push(`Failed to add ${comp.name}: ${error.message}`);
        } else {
          result.added++;
        }
      }
    }

    // Step 4: Mark missing components as deprecated
    for (const [key, comp] of existingMap) {
      const discovered_key = discovered.findIndex(
        (d) => `${d.type}:${d.path_or_id}` === key
      );

      if (discovered_key === -1 && comp.status === 'active') {
        const { error } = await (supabase
          .from('dsg_system_components' as any)
          .update({ status: 'deprecated' })
          .eq('id', comp.id) as any);

        if (!error) result.removed++;
      }
    }

    // Step 5: Create snapshot
    await createInventorySnapshot(result);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Sync failed: ${message}`);
    return result;
  }
}

/**
 * Discover all components in the system
 */
async function discoverAllComponents(): Promise<ComponentDiscovery[]> {
  const components: ComponentDiscovery[] = [];

  try {
    // Already seeded from migration, but this can be enhanced to scan
    // file system for new routes, etc.

    // For now, return empty (relying on initial seeding + manual additions)
    return components;
  } catch (error) {
    console.error('Error discovering components:', error);
    return components;
  }
}

/**
 * Create inventory snapshot for change tracking
 */
async function createInventorySnapshot(result: SyncResult): Promise<void> {
  const supabase = getSupabaseAdmin();

  const snapshotData = {
    sync_time: new Date().toISOString(),
    added: result.added,
    removed: result.removed,
    updated: result.updated,
    errors: result.errors,
  };

  const snapshotHash = Buffer.from(
    JSON.stringify(snapshotData)
  ).toString('base64');

  await (supabase
    .from('dsg_inventory_snapshots' as any)
    .insert({
      snapshot_type: 'delta',
      components_added: result.added,
      components_removed: result.removed,
      components_modified: result.updated,
      snapshot_data: snapshotData,
      snapshot_hash: snapshotHash,
    } as any) as any);
}

/**
 * Health check for inventory system
 */
export async function getInventoryHealth(): Promise<{
  ok: boolean;
  component_count: number;
  dependency_count: number;
  last_sync: string | null;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();

  try {
    const { count: componentCount } = await (supabase
      .from('dsg_system_components' as any)
      .select('*', { count: 'exact', head: true }) as any);

    const { count: depCount } = await (supabase
      .from('dsg_component_dependencies' as any)
      .select('*', { count: 'exact', head: true }) as any);

    const { data: lastSnapshot } = await (supabase
      .from('dsg_inventory_snapshots' as any)
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as any);

    return {
      ok: (componentCount ?? 0) > 0,
      component_count: componentCount ?? 0,
      dependency_count: depCount ?? 0,
      last_sync: lastSnapshot?.created_at || null,
      errors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      component_count: 0,
      dependency_count: 0,
      last_sync: null,
      errors: [message],
    };
  }
}
