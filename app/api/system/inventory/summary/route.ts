import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/inventory/summary
 * Returns count of components by type and category
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get component counts by type
    const { data: byType, error: typeError } = await supabase
      .from('dsg_system_components')
      .select('component_type', { count: 'exact' });

    // Get component counts by category
    const { data: byCategory, error: categoryError } = await supabase
      .from('dsg_system_components')
      .select('category', { count: 'exact' });

    // Get component counts by status
    const { data: byStatus, error: statusError } = await supabase
      .from('dsg_system_components')
      .select('status', { count: 'exact' });

    if (typeError || categoryError || statusError) {
      return NextResponse.json(
        { error: 'Failed to fetch summary' },
        { status: 500 }
      );
    }

    // Count by type
    const typeCounts: Record<string, number> = {};
    byType?.forEach((item: any) => {
      const type = item.component_type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // Count by category
    const categoryCounts: Record<string, number> = {};
    byCategory?.forEach((item: any) => {
      const cat = item.category || 'unknown';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // Count by status
    const statusCounts: Record<string, number> = {};
    byStatus?.forEach((item: any) => {
      const st = item.status || 'unknown';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const total = byType?.length || 0;

    return NextResponse.json({
      ok: true,
      summary: {
        total_components: total,
        by_type: typeCounts,
        by_category: categoryCounts,
        by_status: statusCounts,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError('api/system/inventory/summary', error);
  }
}
