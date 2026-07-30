import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

describe('Phase 1 Schema Migrations', () => {
  describe('feature_flags table', () => {
    it('creates feature_flags table with required columns', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000001_create_feature_flags_table.sql',
        'utf8'
      );
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS feature_flags');
      expect(sql).toContain('id UUID PRIMARY KEY');
      expect(sql).toContain('name TEXT UNIQUE NOT NULL');
      expect(sql).toContain('owner TEXT NOT NULL');
      expect(sql).toContain('enabled_for_orgs UUID[]');
      expect(sql).toContain('rollout_percentage INT');
      expect(sql).toContain('retire_date TIMESTAMPTZ');
      expect(sql).toContain('created_at TIMESTAMPTZ');
      expect(sql).toContain('updated_at TIMESTAMPTZ');
    });

    it('enables RLS on feature_flags', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000001_create_feature_flags_table.sql',
        'utf8'
      );
      expect(sql).toContain('ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('CREATE POLICY');
    });

    it('creates indexes on feature_flags for performance', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000001_create_feature_flags_table.sql',
        'utf8'
      );
      expect(sql).toContain('idx_feature_flags_name');
      expect(sql).toContain('idx_feature_flags_owner');
      expect(sql).toContain('idx_feature_flags_retire_date');
    });

    it('includes update_updated_at trigger', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000001_create_feature_flags_table.sql',
        'utf8'
      );
      expect(sql).toContain('update_feature_flags_updated_at');
      expect(sql).toContain('EXECUTE FUNCTION update_updated_at_column()');
    });
  });

  describe('audit_log table', () => {
    it('creates audit_log table with required columns', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS audit_log');
      expect(sql).toContain('id UUID PRIMARY KEY');
      expect(sql).toContain('org_id UUID NOT NULL');
      expect(sql).toContain('actor_id UUID NOT NULL');
      expect(sql).toContain('action VARCHAR(100) NOT NULL');
      expect(sql).toContain('resource_type VARCHAR(50) NOT NULL');
      expect(sql).toContain('resource_id VARCHAR(255) NOT NULL');
      expect(sql).toContain('result VARCHAR(20)');
      expect(sql).toContain('details JSONB');
      expect(sql).toContain('created_at TIMESTAMP WITH TIME ZONE');
    });

    it('is append-only (immutable)', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      expect(sql).toContain('CONSTRAINT audit_log_immutable');
      expect(sql).toContain('created_at IS NOT NULL');
    });

    it('enables RLS with org-scoped access', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      expect(sql).toContain('ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('audit_log_org_members_read');
      expect(sql).toContain('org_members');
    });

    it('creates indexes for fast filtering', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      expect(sql).toContain('idx_audit_log_org_created');
      expect(sql).toContain('idx_audit_log_actor');
      expect(sql).toContain('idx_audit_log_resource');
      expect(sql).toContain('idx_audit_log_action');
      expect(sql).toContain('idx_audit_log_result');
      expect(sql).toContain('idx_audit_log_org_action_time');
    });

    it('provides audit_log_action helper function', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      expect(sql).toContain('CREATE OR REPLACE FUNCTION audit_log_action');
      expect(sql).toContain('RETURNS UUID');
      expect(sql).toContain('INSERT INTO audit_log');
    });

    it('grants appropriate permissions', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      expect(sql).toContain('GRANT SELECT ON audit_log TO authenticated');
      expect(sql).toContain('GRANT SELECT, INSERT ON audit_log TO service_role');
    });
  });

  describe('delivery_proofs table', () => {
    it('creates delivery_proofs table with required columns', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000003_create_delivery_proofs_table.sql',
        'utf8'
      );
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS delivery_proofs');
      expect(sql).toContain('id UUID PRIMARY KEY');
      expect(sql).toContain('org_id UUID NOT NULL');
      expect(sql).toContain('target_url TEXT NOT NULL');
      expect(sql).toContain('repo_url TEXT');
      expect(sql).toContain('readiness_path TEXT');
      expect(sql).toContain('status VARCHAR(20)');
      expect(sql).toContain('checks JSONB');
      expect(sql).toContain('report_id TEXT');
      expect(sql).toContain('expires_at TIMESTAMP WITH TIME ZONE');
      expect(sql).toContain('verified_at TIMESTAMP WITH TIME ZONE');
    });

    it('enables RLS with org-scoped access', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000003_create_delivery_proofs_table.sql',
        'utf8'
      );
      expect(sql).toContain('ALTER TABLE delivery_proofs ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('delivery_proofs_org_read');
      expect(sql).toContain('delivery_proofs_org_insert');
    });

    it('creates indexes for efficient querying', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000003_create_delivery_proofs_table.sql',
        'utf8'
      );
      expect(sql).toContain('idx_delivery_proofs_org');
      expect(sql).toContain('idx_delivery_proofs_status');
      expect(sql).toContain('idx_delivery_proofs_target_url');
      expect(sql).toContain('idx_delivery_proofs_expires_at');
      expect(sql).toContain('idx_delivery_proofs_org_status');
    });

    it('provides record_delivery_proof helper function', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000003_create_delivery_proofs_table.sql',
        'utf8'
      );
      expect(sql).toContain('CREATE OR REPLACE FUNCTION record_delivery_proof');
      expect(sql).toContain('RETURNS UUID');
      expect(sql).toContain('INSERT INTO delivery_proofs');
    });
  });

  describe('usage_metrics indexes', () => {
    it('adds indexes to executions table for analytics', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000004_add_usage_metrics_indexes.sql',
        'utf8'
      );
      expect(sql).toContain('CREATE INDEX');
      expect(sql).toContain('idx_executions_decision_created');
      expect(sql).toContain('idx_executions_policy_version_created');
      expect(sql).toContain('idx_executions_org_decision_created');
    });

    it('creates composite indexes for complex queries', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000004_add_usage_metrics_indexes.sql',
        'utf8'
      );
      expect(sql).toContain('idx_executions_org_created');
      expect(sql).toContain('idx_executions_agent_created');
      expect(sql).toContain('idx_executions_latency_created');
    });
  });

  describe('migration idempotency', () => {
    it('uses CREATE TABLE IF NOT EXISTS pattern', () => {
      const sql1 = readFileSync(
        'supabase/migrations/20260730000001_create_feature_flags_table.sql',
        'utf8'
      );
      const sql2 = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      const sql3 = readFileSync(
        'supabase/migrations/20260730000003_create_delivery_proofs_table.sql',
        'utf8'
      );

      expect(sql1).toContain('IF NOT EXISTS');
      expect(sql2).toContain('IF NOT EXISTS');
      expect(sql3).toContain('IF NOT EXISTS');
    });

    it('uses CREATE INDEX IF NOT EXISTS pattern', () => {
      const sql1 = readFileSync(
        'supabase/migrations/20260730000001_create_feature_flags_table.sql',
        'utf8'
      );
      const sql2 = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      const sql3 = readFileSync(
        'supabase/migrations/20260730000003_create_delivery_proofs_table.sql',
        'utf8'
      );
      const sql4 = readFileSync(
        'supabase/migrations/20260730000004_add_usage_metrics_indexes.sql',
        'utf8'
      );

      expect(sql1).toContain('IF NOT EXISTS');
      expect(sql2).toContain('IF NOT EXISTS');
      expect(sql3).toContain('IF NOT EXISTS');
      expect(sql4).toContain('IF NOT EXISTS');
    });

    it('uses CREATE OR REPLACE for functions', () => {
      const sql2 = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      const sql3 = readFileSync(
        'supabase/migrations/20260730000003_create_delivery_proofs_table.sql',
        'utf8'
      );

      expect(sql2).toContain('CREATE OR REPLACE FUNCTION');
      expect(sql3).toContain('CREATE OR REPLACE FUNCTION');
    });
  });

  describe('no destructive SQL', () => {
    it('does not contain DROP statements', () => {
      const files = [
        'supabase/migrations/20260730000001_create_feature_flags_table.sql',
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'supabase/migrations/20260730000003_create_delivery_proofs_table.sql',
        'supabase/migrations/20260730000004_add_usage_metrics_indexes.sql',
      ];

      for (const file of files) {
        const sql = readFileSync(file, 'utf8');
        expect(sql).not.toMatch(/^drop\s+table|^drop\s+index|^drop\s+function/im);
      }
    });

    it('does not contain TRUNCATE statements', () => {
      const files = [
        'supabase/migrations/20260730000001_create_feature_flags_table.sql',
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'supabase/migrations/20260730000003_create_delivery_proofs_table.sql',
        'supabase/migrations/20260730000004_add_usage_metrics_indexes.sql',
      ];

      for (const file of files) {
        const sql = readFileSync(file, 'utf8');
        expect(sql).not.toContain('TRUNCATE');
      }
    });
  });

  describe('RLS enforcement', () => {
    it('enables RLS on all new tables', () => {
      const sql1 = readFileSync(
        'supabase/migrations/20260730000001_create_feature_flags_table.sql',
        'utf8'
      );
      const sql2 = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      const sql3 = readFileSync(
        'supabase/migrations/20260730000003_create_delivery_proofs_table.sql',
        'utf8'
      );

      expect(sql1).toContain('ENABLE ROW LEVEL SECURITY');
      expect(sql2).toContain('ENABLE ROW LEVEL SECURITY');
      expect(sql3).toContain('ENABLE ROW LEVEL SECURITY');
    });

    it('defines at least one policy per table with RLS', () => {
      const sql1 = readFileSync(
        'supabase/migrations/20260730000001_create_feature_flags_table.sql',
        'utf8'
      );
      const sql2 = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      const sql3 = readFileSync(
        'supabase/migrations/20260730000003_create_delivery_proofs_table.sql',
        'utf8'
      );

      // Count CREATE POLICY statements
      const policies1 = (sql1.match(/CREATE POLICY/g) || []).length;
      const policies2 = (sql2.match(/CREATE POLICY/g) || []).length;
      const policies3 = (sql3.match(/CREATE POLICY/g) || []).length;

      expect(policies1).toBeGreaterThan(0);
      expect(policies2).toBeGreaterThan(0);
      expect(policies3).toBeGreaterThan(0);
    });
  });
});
