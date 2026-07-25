import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/health-detailed
 * Returns health status of all system components
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get all components with their health status
    const { data: components, error } = await supabase
      .from('dsg_system_components')
      .select('id, name, component_type, path_or_id, status, health_status, last_verified_at')
      .order('component_type')
      .order('name');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch components' },
        { status: 500 }
      );
    }

    // Analyze health
    const healthStats = {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
    };

    components?.forEach((comp: any) => {
      const status = comp.health_status || 'unknown';
      if (status === 'healthy') healthStats.healthy++;
      else if (status === 'degraded') healthStats.degraded++;
      else if (status === 'unhealthy') healthStats.unhealthy++;
      else healthStats.unknown++;
    });

    const overallOk = healthStats.unhealthy === 0 && healthStats.degraded <= 2;

    // Get dependency stats
    const { data: dependencies, count: depCount } = await supabase
      .from('dsg_component_dependencies')
      .select('*', { count: 'exact' });

    // Group by type
    const componentsByType: Record<string, number> = {};
    components?.forEach((comp: any) => {
      const type = comp.component_type;
      componentsByType[type] = (componentsByType[type] || 0) + 1;
    });

    return NextResponse.json({
      ok: true,
      overall_ok: overallOk,
      timestamp: new Date().toISOString(),
      summary: {
        total_components: components?.length || 0,
        total_dependencies: depCount || 0,
        by_type: componentsByType,
        health: healthStats,
      },
      components: components?.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        type: comp.component_type,
        path: comp.path_or_id,
        status: comp.status,
        health: comp.health_status,
        last_verified: comp.last_verified_at,
      })) || [],
    });
  } catch (error) {
    return handleApiError('api/system/health-detailed', error);
  }
}
