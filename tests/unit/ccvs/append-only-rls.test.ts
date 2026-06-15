/**
 * Append-Only RLS Pattern Verification
 *
 * Reads the actual migration SQL for claim_readiness_artifacts and verifies
 * that the WORM (Write-Once, Read-Many) pattern is encoded at the SQL level.
 *
 * These tests parse the SQL text directly — they verify the intent encoded
 * in the migration file, not live database state.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const MIGRATION_FILE = join(
  __dirname,
  "../../../supabase/migrations/20260612041000_create_claim_readiness_artifacts.sql"
);

function loadMigrationSql(): string {
  return readFileSync(MIGRATION_FILE, "utf-8");
}

// ---------------------------------------------------------------------------
// Table structure
// ---------------------------------------------------------------------------

describe("claim_readiness_artifacts migration — table structure", () => {
  it("migration file exists and is non-empty", () => {
    const sql = loadMigrationSql();
    expect(sql.length).toBeGreaterThan(100);
  });

  it("creates the claim_readiness_artifacts table with IF NOT EXISTS (idempotent)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS claim_readiness_artifacts/i);
  });

  it("defines artifact_hash column as UNIQUE (deduplication guard)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/artifact_hash\s+TEXT\s+NOT NULL\s+UNIQUE/i);
  });

  it("defines chain_hash column for cryptographic chaining", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/chain_hash/i);
  });

  it("includes a status CHECK constraint allowing only valid lifecycle values", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/status_check/i);
    expect(sql).toMatch(/PENDING/);
    expect(sql).toMatch(/VERIFIED/);
    expect(sql).toMatch(/ARCHIVED/);
    expect(sql).toMatch(/FAILED/);
  });
});

// ---------------------------------------------------------------------------
// Append-only / WORM pattern — permission grants
// ---------------------------------------------------------------------------

describe("claim_readiness_artifacts migration — append-only permission design", () => {
  it("GRANT SELECT is present (read access is allowed)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/GRANT SELECT ON claim_readiness_artifacts/i);
  });

  it("GRANT INSERT is present (append/write is allowed)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/GRANT INSERT ON claim_readiness_artifacts/i);
  });

  it("GRANT DELETE is NOT present (delete is intentionally omitted for WORM)", () => {
    const sql = loadMigrationSql();
    // The migration should not grant DELETE. Only a comment mentions GRANT DELETE.
    // We check that no executable GRANT DELETE statement appears (outside a comment).
    const lines = sql.split("\n");
    const grantDeleteLines = lines.filter(
      (line) =>
        /GRANT\s+DELETE/i.test(line) &&
        !line.trim().startsWith("--")
    );
    expect(grantDeleteLines).toHaveLength(0);
  });

  it("comment explicitly states 'No delete permissions (append-only design)'", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/No delete permissions.*append-only/i);
  });

  it("RLS is disabled with DISABLE ROW LEVEL SECURITY (enforcement via application logic)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/DISABLE ROW LEVEL SECURITY/i);
  });
});

// ---------------------------------------------------------------------------
// Cryptographic chain / immutability markers
// ---------------------------------------------------------------------------

describe("claim_readiness_artifacts migration — cryptographic and immutability fields", () => {
  it("includes s3_version_id column for Object Lock tracking", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/s3_version_id/i);
  });

  it("includes immutable_at column for Object Lock archival timestamp", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/immutable_at/i);
  });

  it("includes signature_bundle column for Cosign/Sigstore support", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/signature_bundle/i);
  });
});

// ---------------------------------------------------------------------------
// WORM pattern verification via comment block
// The migration documents UPDATE and DELETE restrictions in comments.
// These test the documented intent of the append-only design.
// ---------------------------------------------------------------------------

describe("claim_readiness_artifacts migration — documented WORM policy intent", () => {
  it("migration comment documents DELETE policy as permanently disabled", () => {
    const sql = loadMigrationSql();
    // Comment block in the RLS section documents DELETE being disabled
    expect(sql).toMatch(/DELETE.*permanently disabled|permanently disabled.*DELETE/i);
  });

  it("migration comment documents append-only design rationale", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/append-only/i);
  });

  it("UPDATE grant is restricted to postgres (service role only — not authenticated users)", () => {
    const sql = loadMigrationSql();
    // UPDATE should be granted to postgres but the authenticated role
    // should NOT appear on the UPDATE GRANT line.
    const lines = sql.split("\n");
    const updateGrantLine = lines.find(
      (line) => /GRANT UPDATE ON claim_readiness_artifacts/i.test(line) && !line.trim().startsWith("--")
    );
    expect(updateGrantLine).toBeDefined();
    // The UPDATE grant line should include 'postgres' only
    expect(updateGrantLine).toMatch(/postgres/i);
    // It should NOT grant UPDATE to 'authenticated'
    expect(updateGrantLine).not.toMatch(/authenticated/i);
  });
});

// ---------------------------------------------------------------------------
// Index coverage
// ---------------------------------------------------------------------------

describe("claim_readiness_artifacts migration — indexes", () => {
  it("creates index on claim_id for fast claim lookups", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_claim_readiness_claim_id/i);
  });

  it("creates index on artifact_hash for deduplication queries", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_claim_readiness_artifact_hash/i);
  });

  it("creates index on chain_hash for chain traversal", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_claim_readiness_chain_hash/i);
  });
});
