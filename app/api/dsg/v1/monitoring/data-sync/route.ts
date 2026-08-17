import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/packages/ai-firstify-plugin/src/lib/supabase-client';
import { handleApiError } from '@/lib/security/api-error';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface SyncMetrics {
  org_id: string;
  table_name: string;
  row_count: number;
  last_modified: string;
  hash: string;
  status: 'synced' | 'diverged' | 'pending';
}

interface DataSyncReport {
  timestamp: string;
  metrics: SyncMetrics[];
  health_score: number;
  divergences: string[];
  recommendations: string[];
}

interface CrossRepoConsistency {
  consistent: boolean;
  issues: string[];
}

class DataSyncMonitor {
  private supabase: any;
  private org_id: string;

  constructor(supabaseUrl: string, serviceRoleKey: string, orgId: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey);
    this.org_id = orgId;
  }

  async monitorCriticalTables(): Promise<SyncMetrics[]> {
    const criticalTables = [
      'organizations',
      'users',
      'agents',
      'policies',
      'executions',
      'audit_logs',
      'runtime_intents',
      'proof_artifacts',
    ];

    const metrics: SyncMetrics[] = [];

    for (const table of criticalTables) {
      try {
        const { data, count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact' })
          .eq('org_id', this.org_id)
          .limit(1);

        if (error) {
          console.error(`Error monitoring ${table}:`, error);
          continue;
        }

        let lastModified = new Date().toISOString();
        if (data && data.length > 0 && 'updated_at' in data[0]) {
          lastModified = data[0].updated_at;
        }

        metrics.push({
          org_id: this.org_id,
          table_name: table,
          row_count: count ?? 0,
          last_modified: lastModified,
          hash: this.hashTableState(data || []),
          status: 'synced',
        });
      } catch (err) {
        console.error(`Failed to monitor ${table}:`, err);
      }
    }

    return metrics;
  }

  async detectDivergence(): Promise<string[]> {
    const divergences: string[] = [];

    const { data: unscoped } = await this.supabase
      .from('executions')
      .select('id, org_id')
      .is('org_id', null);

    if (unscoped && unscoped.length > 0) {
      divergences.push(`Found ${unscoped.length} executions without org_id scoping`);
    }

    const { data: orphanedUsers } = await this.supabase
      .from('users')
      .select('id, org_id')
      .not('org_id', 'is', null);

    if (orphanedUsers) {
      const orgIds = [...new Set(orphanedUsers.map(u => u.org_id))];
      for (const orgId of orgIds) {
        const { data: org } = await this.supabase
          .from('organizations')
          .select('id')
          .eq('id', orgId)
          .maybeSingle();

        if (!org) {
          divergences.push(`Orphaned org_id reference: ${orgId}`);
        }
      }
    }

    const requiredFields: Record<string, string[]> = {
      organizations: ['id', 'name'],
      users: ['id', 'org_id', 'email'],
      agents: ['id', 'org_id', 'name'],
      executions: ['id', 'org_id', 'agent_id'],
    };

    for (const [table, fields] of Object.entries(requiredFields)) {
      try {
        const { data } = await this.supabase
          .from(table)
          .select(fields.join(','))
          .eq('org_id', this.org_id)
          .limit(10);

        if (data) {
          for (const row of data) {
            for (const field of fields) {
              if (row[field] === null || row[field] === undefined) {
                divergences.push(`Missing required field ${field} in ${table}`);
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error checking required fields in ${table}:`, err);
      }
    }

    return divergences;
  }

  async generateSyncReport(): Promise<DataSyncReport> {
    const metrics = await this.monitorCriticalTables();
    const divergences = await this.detectDivergence();

    const healthScore = Math.max(
      0,
      100 - divergences.length * 10 - (metrics.filter(m => m.status !== 'synced').length * 5)
    );

    const recommendations: string[] = [];

    if (healthScore < 80) {
      recommendations.push('Review and resolve data divergences');
      recommendations.push('Check RLS policies are properly enforced');
      recommendations.push('Verify all repositories are using current schema version');
    }

    if (divergences.length > 0) {
      recommendations.push('Run data reconciliation script to fix orphaned records');
    }

    const emptyTables = metrics.filter(m => m.row_count === 0);
    if (emptyTables.length > 0) {
      recommendations.push(
        `Verify empty tables are intentional: ${emptyTables.map(t => t.table_name).join(', ')}`
      );
    }

    return {
      timestamp: new Date().toISOString(),
      metrics,
      health_score: Math.round(healthScore),
      divergences,
      recommendations,
    };
  }

  async checkCrossRepoConsistency(): Promise<CrossRepoConsistency> {
    const issues: string[] = [];

    const tables = ['organizations', 'users', 'agents', 'executions'];

    for (const table of tables) {
      try {
        const { error } = await this.supabase
          .from(table)
          .select('id')
          .limit(1);

        if (error) {
          issues.push(`Cannot read from ${table}: ${error.message}`);
        }
      } catch (err) {
        issues.push(`Error accessing ${table}: ${String(err)}`);
      }
    }

    return {
      consistent: issues.length === 0,
      issues,
    };
  }

  private hashTableState(data: any[]): string {
    const state = data
      .map(row => JSON.stringify(row))
      .sort()
      .join('\n');

    return crypto
      .createHash('sha256')
      .update(state)
      .digest('hex')
      .slice(0, 16);
  }
}

export async function GET(request: NextRequest) {
  try {
    const orgId = request.headers.get('x-org-id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'x-org-id header is required' },
        { status: 400 }
      );
    }

    const checkType = request.nextUrl.searchParams.get('check') || 'full';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const monitor = new DataSyncMonitor(supabaseUrl, serviceRoleKey, orgId);

    switch (checkType) {
      case 'full': {
        const report = await monitor.generateSyncReport();
        const consistency = await monitor.checkCrossRepoConsistency();
        return NextResponse.json({
          ok: true,
          data: {
            sync_report: report,
            cross_repo_consistency: consistency,
          },
          timestamp: new Date().toISOString(),
        });
      }

      case 'metrics': {
        const metrics = await monitor.monitorCriticalTables();
        return NextResponse.json({
          ok: true,
          data: { metrics },
          timestamp: new Date().toISOString(),
        });
      }

      case 'divergence': {
        const divergences = await monitor.detectDivergence();
        return NextResponse.json({
          ok: true,
          data: { divergences },
          timestamp: new Date().toISOString(),
        });
      }

      case 'cross-repo': {
        const consistency = await monitor.checkCrossRepoConsistency();
        return NextResponse.json({
          ok: true,
          data: consistency,
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown check type: ${checkType}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError('app/api/dsg/v1/monitoring/data-sync/route.ts', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get('x-org-id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'x-org-id header is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const action = body.action || 'report';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const monitor = new DataSyncMonitor(supabaseUrl, serviceRoleKey, orgId);

    switch (action) {
      case 'report': {
        const report = await monitor.generateSyncReport();
        return NextResponse.json({
          ok: true,
          data: report,
          timestamp: new Date().toISOString(),
        });
      }

      case 'reconcile': {
        const divergences = await monitor.detectDivergence();
        return NextResponse.json({
          ok: true,
          data: {
            divergences_found: divergences.length,
            divergences,
            action_required: divergences.length > 0,
            next_step:
              divergences.length > 0
                ? 'Review divergences and run reconciliation scripts'
                : 'No action required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError('app/api/dsg/v1/monitoring/data-sync/route.ts', error);
  }
}
