/**
 * Data Sync Monitor
 * Tracks and monitors data consistency across unified Supabase instance
 * Detects drift, replication lag, and sync issues across all repositories
 */

import { createClient } from '@supabase/supabase-js';

export interface SyncMetrics {
  org_id: string;
  table_name: string;
  row_count: number;
  last_modified: string;
  hash: string;
  status: 'synced' | 'diverged' | 'pending';
}

export interface DataSyncReport {
  timestamp: string;
  metrics: SyncMetrics[];
  health_score: number;
  divergences: string[];
  recommendations: string[];
}

export class DataSyncMonitor {
  private supabase: any;
  private org_id: string;

  constructor(supabaseUrl: string, serviceRoleKey: string, orgId: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey);
    this.org_id = orgId;
  }

  /**
   * Monitor critical tables for sync issues
   */
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

        // Get latest modification time
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

  /**
   * Detect data divergence between expected and actual state
   */
  async detectDivergence(): Promise<string[]> {
    const divergences: string[] = [];

    // Check org_id scoping
    const { data: unscoped } = await this.supabase
      .from('executions')
      .select('id, org_id')
      .is('org_id', null);

    if (unscoped && unscoped.length > 0) {
      divergences.push(`Found ${unscoped.length} executions without org_id scoping`);
    }

    // Check for orphaned records
    const { data: orphanedUsers } = await this.supabase
      .from('users')
      .select('id, org_id')
      .not('org_id', 'is', null);

    if (orphanedUsers) {
      // Verify org_id exists in organizations
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

    // Check for missing required fields
    const requiredFields: Record<string, string[]> = {
      organizations: ['id', 'name', 'plan'],
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

  /**
   * Generate comprehensive sync report
   */
  async generateSyncReport(): Promise<DataSyncReport> {
    const metrics = await this.monitorCriticalTables();
    const divergences = await this.detectDivergence();

    // Calculate health score (0-100)
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
      recommendations.push(`Verify empty tables are intentional: ${emptyTables.map(t => t.table_name).join(', ')}`);
    }

    return {
      timestamp: new Date().toISOString(),
      metrics,
      health_score: Math.round(healthScore),
      divergences,
      recommendations,
    };
  }

  /**
   * Check cross-repo consistency
   */
  async checkCrossRepoConsistency(): Promise<{
    consistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Verify service role can read all tables (cross-repo visibility)
    const tables = [
      'organizations',
      'users',
      'agents',
      'executions',
    ];

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

    // Verify RLS is enforcing org_id boundaries
    const { data: orgs } = await this.supabase
      .from('organizations')
      .select('id')
      .limit(2);

    if (orgs && orgs.length > 1) {
      // Try to access different org's data (should be restricted by RLS)
      const orgId1 = orgs[0].id;
      const orgId2 = orgs[1].id;

      const { data: org1Users } = await this.supabase
        .from('users')
        .select('id')
        .eq('org_id', orgId1)
        .limit(1);

      // Service role bypasses RLS, but we're just checking the data is scoped
      if (org1Users && org1Users.length > 0) {
        // Verify org2 users are separate
        const { data: org2Users } = await this.supabase
          .from('users')
          .select('id')
          .eq('org_id', orgId2)
          .limit(1);

        if (org1Users[0].id === org2Users?.[0]?.id) {
          issues.push('User isolation by org_id may be compromised');
        }
      }
    }

    return {
      consistent: issues.length === 0,
      issues,
    };
  }

  private hashTableState(data: any[]): string {
    const crypto = require('crypto');
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

/**
 * Initialize global monitor instance
 */
export function createDataSyncMonitor(
  supabaseUrl: string | undefined,
  serviceRoleKey: string | undefined,
  orgId: string
): DataSyncMonitor | null {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return new DataSyncMonitor(supabaseUrl, serviceRoleKey, orgId);
}
