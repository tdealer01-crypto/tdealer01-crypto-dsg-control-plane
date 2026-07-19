/**
 * Audit Trail API - SIEM Export
 *
 * GET /api/admin/audit-trail
 * Query audit logs with filters for compliance export
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/rbac/require-permission';
import { initCorrelationContext, updateCorrelationContext } from '@/lib/audit/correlation-context';

export const dynamic = 'force-dynamic';

interface AuditTrailQuery {
  filter?: string; // e.g., 'action:gate_evaluate severity:ERROR actor:user@example.com'
  range?: string; // e.g., '7d', '30d'
  format?: 'json' | 'csv';
  startIndex?: number;
  count?: number;
}

export async function GET(request: Request) {
  const correlationId = initCorrelationContext();

  try {
    const url = new URL(request.url);
    const userId = (request as any).userId;
    const orgId = (request as any).orgId;

    if (!userId || !orgId) {
      return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 });
    }

    // Check permission
    const permResult = await checkPermission(userId, orgId, 'export:audit');
    if (!permResult.ok) {
      return NextResponse.json({ ok: false, error: 'permission_denied' }, { status: 403 });
    }

    // Parse query params
    const filter = url.searchParams.get('filter') || '';
    const range = url.searchParams.get('range') || '30d';
    const format = (url.searchParams.get('format') || 'json') as 'json' | 'csv';
    const startIndex = parseInt(url.searchParams.get('startIndex') || '1');
    const count = Math.min(parseInt(url.searchParams.get('count') || '100'), 10000); // Max 10k records

    updateCorrelationContext({ orgId, userId });

    const supabase = getSupabaseAdmin() as any;

    // Parse time range
    let sinceDate = new Date();
    const days = parseInt(range.match(/\d+/)?.[0] || '30');
    sinceDate.setDate(sinceDate.getDate() - days);

    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('org_id', orgId)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(count)
      .offset(startIndex - 1);

    // Apply filters
    if (filter) {
      const filters = filter.split(' ');
      for (const f of filters) {
        if (f.startsWith('action:')) {
          query = query.eq('action', f.replace('action:', ''));
        } else if (f.startsWith('severity:')) {
          query = query.eq('severity', f.replace('severity:', ''));
        } else if (f.startsWith('actor:')) {
          query = query.eq('actor_email', f.replace('actor:', ''));
        }
      }
    }

    const result = await query;

    if (result.error) {
      console.error('[audit-trail] Query error:', result.error);
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    }

    const records = result.data || [];

    if (format === 'csv') {
      // Convert to CSV
      const headers = ['timestamp', 'action', 'severity', 'actor', 'resource_type', 'result', 'correlation_id', 'message'];
      const rows = records.map((r: any) => [
        r.created_at,
        r.action,
        r.severity,
        r.actor_email,
        r.resource_type,
        r.result,
        r.correlation_id,
        r.message || '',
      ]);

      const csv = [headers, ...rows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-trail-${new Date().toISOString().split('T')[0]}.csv"`,
          'x-correlation-id': correlationId,
        },
      });
    }

    // Return JSON
    return NextResponse.json({
      ok: true,
      totalResults: records.length,
      itemsPerPage: count,
      startIndex,
      records: records.map((r: any) => ({
        timestamp: r.created_at,
        action: r.action,
        severity: r.severity,
        actor: r.actor_email || 'system',
        resource_type: r.resource_type,
        result: r.result,
        correlation_id: r.correlation_id,
        message: r.message,
      })),
    });
  } catch (error) {
    console.error('[audit-trail] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
