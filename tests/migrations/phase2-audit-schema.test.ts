import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

describe('Phase 2 Audit Schema Migrations', () => {
  describe('manifest_metadata table (20260730000006)', () => {
    it('creates manifest_metadata table with required columns', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS manifest_metadata');
      expect(sql).toContain('id UUID PRIMARY KEY');
      expect(sql).toContain('org_id UUID NOT NULL');
      expect(sql).toContain('session_id TEXT NOT NULL');
      expect(sql).toContain('frame_id TEXT NOT NULL');
      expect(sql).toContain('manifest_hash TEXT NOT NULL');
      expect(sql).toContain('manifest_size INTEGER NOT NULL');
      expect(sql).toContain('harmony_hit_count INTEGER DEFAULT 0');
      expect(sql).toContain('harmony_embedding_score NUMERIC');
      expect(sql).toContain('created_at TIMESTAMPTZ DEFAULT now()');
      expect(sql).toContain('expires_at TIMESTAMPTZ NOT NULL');
    });

    it('enforces unique constraint on org_id, session_id, frame_id', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('UNIQUE(org_id, session_id, frame_id)');
    });

    it('validates manifest_size is positive', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('manifest_manifest_size_positive');
      expect(sql).toContain('manifest_size > 0');
    });

    it('validates manifest_hash format (SHA256)', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('manifest_hash_format');
      expect(sql).toContain("manifest_hash ~ '^[a-f0-9]{64}$'");
    });

    it('validates harmony_embedding_score range (0.0-1.0)', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('manifest_embedding_range');
      expect(sql).toContain('harmony_embedding_score >= 0.0');
      expect(sql).toContain('harmony_embedding_score <= 1.0');
    });

    it('creates indexes for TTL cleanup and hashing', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('idx_manifest_metadata_expires');
      expect(sql).toContain('idx_manifest_metadata_hash');
      expect(sql).toContain('idx_manifest_metadata_org');
      expect(sql).toContain('idx_manifest_metadata_org_session');
    });

    it('creates partial index for active (non-expired) manifests', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('idx_manifest_metadata_active');
      expect(sql).toContain('WHERE expires_at > now()');
    });

    it('enables RLS for org-scoped access', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('ALTER TABLE manifest_metadata ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('manifest_metadata_org_read');
      expect(sql).toContain('org_members');
    });

    it('grants proper permissions to service_role', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('GRANT SELECT ON manifest_metadata TO authenticated');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE ON manifest_metadata TO service_role');
    });
  });

  describe('audit_batch_metadata table (20260730000007)', () => {
    it('creates audit_batch_metadata table with required columns', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS audit_batch_metadata');
      expect(sql).toContain('id UUID PRIMARY KEY');
      expect(sql).toContain('org_id UUID NOT NULL');
      expect(sql).toContain('batch_hash TEXT NOT NULL');
      expect(sql).toContain('previous_hash TEXT');
      expect(sql).toContain('event_count INTEGER NOT NULL');
      expect(sql).toContain('batch_size_bytes INTEGER');
      expect(sql).toContain('created_at TIMESTAMPTZ DEFAULT now()');
      expect(sql).toContain('chain_verified_at TIMESTAMPTZ');
      expect(sql).toContain('verification_status TEXT DEFAULT \'pending\'');
      expect(sql).toContain('batch_hash_org_unique UNIQUE (org_id, batch_hash)');
    });

    it('validates batch_hash format (SHA256)', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('batch_hash_format');
      expect(sql).toContain("batch_hash ~ '^[a-f0-9]{64}$'");
    });

    it('validates previous_hash format when not NULL', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('previous_hash_format');
      expect(sql).toContain('previous_hash IS NULL OR previous_hash');
    });

    it('validates event_count is positive', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('event_count_positive');
      expect(sql).toContain('event_count > 0');
    });

    it('validates verification_status enum values', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('verification_status_valid');
      expect(sql).toContain("verification_status IN ('pending', 'verified', 'failed')");
    });

    it('creates foreign key to previous batch (hash chain link)', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('batch_hash_chain_link');
      expect(sql).toContain('FOREIGN KEY (previous_org_id, previous_hash)');
      expect(sql).toContain('REFERENCES audit_batch_metadata(org_id, batch_hash)');
      expect(sql).toContain('ON DELETE RESTRICT');
    });

    it('creates indexes for chain traversal', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('idx_audit_batch_metadata_chain');
      expect(sql).toContain('batch_hash, previous_hash');
      expect(sql).toContain('idx_audit_batch_metadata_org');
      expect(sql).toContain('idx_audit_batch_metadata_verification');
    });

    it('creates partial index for unverified batches', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('idx_audit_batch_metadata_unverified');
      expect(sql).toContain("WHERE verification_status = 'pending'");
    });

    it('creates verify_audit_batch_chain function', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('CREATE OR REPLACE FUNCTION verify_audit_batch_chain');
      expect(sql).toContain('RETURNS TABLE');
      expect(sql).toContain('batch_hash TEXT');
      expect(sql).toContain('verification_status TEXT');
      expect(sql).toContain('is_valid BOOLEAN');
    });

    it('creates detect_chain_break function for tamper detection', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('CREATE OR REPLACE FUNCTION detect_chain_break');
      expect(sql).toContain('is_broken BOOLEAN');
      expect(sql).toContain('reason TEXT');
    });

    it('enables RLS for org-scoped access', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('ALTER TABLE audit_batch_metadata ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('audit_batch_metadata_org_read');
      expect(sql).toContain('org_members');
    });

    it('grants proper permissions to service_role for verification', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('GRANT SELECT ON audit_batch_metadata TO authenticated');
      expect(sql).toContain('GRANT SELECT, INSERT ON audit_batch_metadata TO service_role');
      expect(sql).toContain('GRANT EXECUTE ON FUNCTION verify_audit_batch_chain TO service_role');
      expect(sql).toContain('GRANT EXECUTE ON FUNCTION detect_chain_break TO service_role');
      expect(sql).toContain('GRANT EXECUTE ON FUNCTION update_batch_verification TO service_role');
    });
  });

  describe('Existing audit tables (idempotency check)', () => {
    it('audit_batch_trail migration exists and is idempotent', () => {
      const sql = readFileSync(
        'supabase/migrations/20260710133000_audit_batch_trail.sql',
        'utf8'
      );
      expect(sql).toContain('create table if not exists audit_batch_trail');
      expect(sql).toContain('create index if not exists');
    });

    it('agi_action_audit migration exists with hash chain support', () => {
      const sql = readFileSync(
        'supabase/migrations/20260610095000_add_agi_action_audit.sql',
        'utf8'
      );
      expect(sql).toContain('create table if not exists agi_action_audit');
      expect(sql).toContain('previous_hash text');
      expect(sql).toContain('event_hash text not null');
      expect(sql).toContain('idx_agi_audit_chain');
    });

    it('audit_log migration exists with org-scoped access', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000002_create_audit_log_table.sql',
        'utf8'
      );
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS audit_log');
      expect(sql).toContain('org_id UUID NOT NULL');
      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    });
  });

  describe('Hash chain integrity', () => {
    it('manifest_metadata and audit_batch_metadata use SHA256 format', () => {
      const manifest = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      const batch = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );

      // Both should validate hash format (64 hex chars)
      expect(manifest).toContain("^[a-f0-9]{64}$'");
      expect(batch).toContain("^[a-f0-9]{64}$'");
    });

    it('audit_batch_metadata hash chain can reference itself (recursive FK)', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('REFERENCES audit_batch_metadata(org_id, batch_hash)');
    });

    it('previous_hash in agi_action_audit follows same SHA256 format', () => {
      const sql = readFileSync(
        'supabase/migrations/20260610095000_add_agi_action_audit.sql',
        'utf8'
      );
      expect(sql).toContain('previous_hash is null or previous_hash');
      expect(sql).toContain("^sha256:[a-f0-9]{64}$'"); // Note: with 'sha256:' prefix in agi_audit
    });
  });

  describe('RLS and access control', () => {
    it('manifest_metadata policies enforce org-scoped read access', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('FOR SELECT');
      expect(sql).toContain('org_members');
      expect(sql).toContain('org_id IN');
    });

    it('audit_batch_metadata policies enforce org-scoped read access', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('FOR SELECT');
      expect(sql).toContain('org_members');
      expect(sql).toContain('org_id IN');
    });

    it('service_role has write access to audit tables for automated recording', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('TO service_role');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE');
    });
  });

  describe('Performance and indexing', () => {
    it('manifest_metadata has indexes for TTL cleanup (expires_at)', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000006_manifest_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('idx_manifest_metadata_expires');
      expect(sql).toContain('expires_at');
    });

    it('audit_batch_metadata has indexes for verification queries', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('idx_audit_batch_metadata_verification');
      expect(sql).toContain('verification_status');
    });

    it('audit tables have indexes for timestamp-based queries', () => {
      const sql = readFileSync(
        'supabase/migrations/20260730000007_audit_batch_metadata.sql',
        'utf8'
      );
      expect(sql).toContain('created_at DESC');
    });
  });
});
