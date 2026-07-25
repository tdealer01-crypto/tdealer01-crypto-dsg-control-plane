import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/inventory
 * Lists all system components with optional filtering and pagination
 *
 * Query params:
 * - type: filter by component_type (route, table, policy, tool, integration, skill, agent)
 * - category: filter by category (governance, billing, compliance, monitoring, integrations, agents)
 * - status: filter by status (active, deprecated, experimental, disabled)
 * - tier: filter by tier (public, authenticated, operator, internal)
 * - limit: pagination limit (default 50, max 200)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const componentType = searchParams.get('type');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const tier = searchParams.get('tier');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = (getSupabaseAdmin()
      .from('dsg_system_components' as any)
      .select('*', { count: 'exact' }) as any);

    // Apply filters
    if (componentType) query = query.eq('component_type' as any, componentType);
    if (category) query = query.eq('category' as any, category);
    if (status) query = query.eq('status' as any, status);
    if (tier) query = query.eq('tier' as any, tier);

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch components', detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      components: data || [],
      total_count: count || 0,
      limit,
      offset,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError('api/system/inventory', error);
  }
}
