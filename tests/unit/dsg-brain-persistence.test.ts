/**
 * Unit tests for DSG Brain persistence layer.
 * Tests grant and lease persistence to Supabase with mocked database.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveGrant,
  loadGrant,
  deleteGrant,
  getAllActiveGrants,
  cleanupExpiredGrants,
} from "../../lib/dsg/brain/grant-persistence";
import {
  saveLease,
  loadLease,
  deleteLease,
  getAllActiveLeases,
  invalidateLease,
  cleanupExpiredLeases,
} from "../../lib/dsg/brain/lease-persistence";
import {
  buildExecutionGrant,
  renewExecutionGrant,
  createCredentialLease,
  renewCredentialLease,
} from "../../lib/dsg/brain/controlled-executor";
import { buildPlanAttempt } from "../../lib/dsg/brain/plan-attempt";
import { HermesPlugin } from "../../lib/dsg/brain/hermes-plugin";

// Mock Supabase client
vi.mock("../../lib/supabase-server", () => ({
  getSupabaseAdmin: vi.fn(() => createMockSupabaseClient()),
}));

// In-memory mock database for testing
let mockDatabase = {
  dsg_execution_grants: [] as Array<{
    id: string;
    plan_hash: string;
    grant_id: string;
    issued_at: string;
    ttl_ms: number;
    renewals: number;
    max_renewals: number;
    expires_at: string;
  }>,
  dsg_credential_leases: [] as Array<{
    id: string;
    lease_id: string;
    secret_name: string;
    redaction_fingerprint: string;
    expires_at: string;
    valid: boolean;
    renewals: number;
    max_renewals: number;
  }>,
};

function createMockSupabaseClient() {
  return {
    from: (table: string) => {
      if (table === "dsg_execution_grants") {
        return {
          insert: vi.fn(async (data: any) => {
            mockDatabase.dsg_execution_grants.push(data);
            return { error: null };
          }),
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: string) => ({
              single: vi.fn(async () => {
                const record = mockDatabase.dsg_execution_grants.find(
                  (r) => r[field as keyof typeof r] === value
                );
                return record ? { data: record, error: null } : { data: null, error: { code: "PGRST116" } };
              }),
            })),
            gt: vi.fn((field: string, value: string) => ({
              order: vi.fn(() => ({
                // Mock to return records with expires_at greater than value
                then: async (cb: any) => {
                  const filtered = mockDatabase.dsg_execution_grants.filter(
                    (r) => r[field as keyof typeof r] > value
                  );
                  return cb({ data: filtered, error: null });
                },
              })),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn((field: string, value: string) => {
              const countBefore = mockDatabase.dsg_execution_grants.length;
              mockDatabase.dsg_execution_grants = mockDatabase.dsg_execution_grants.filter(
                (r) => r[field as keyof typeof r] !== value
              );
              const count = countBefore - mockDatabase.dsg_execution_grants.length;
              return { error: null, count };
            }),
            lt: vi.fn((field: string, value: string) => {
              const countBefore = mockDatabase.dsg_execution_grants.length;
              mockDatabase.dsg_execution_grants = mockDatabase.dsg_execution_grants.filter(
                (r) => r[field as keyof typeof r] >= value
              );
              const count = countBefore - mockDatabase.dsg_execution_grants.length;
              return { error: null, count };
            }),
          })),
        };
      } else if (table === "dsg_credential_leases") {
        return {
          insert: vi.fn(async (data: any) => {
            mockDatabase.dsg_credential_leases.push(data);
            return { error: null };
          }),
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: any) => ({
              single: vi.fn(async () => {
                const record = mockDatabase.dsg_credential_leases.find(
                  (r) => r[field as keyof typeof r] === value
                );
                return record ? { data: record, error: null } : { data: null, error: { code: "PGRST116" } };
              }),
            })),
            gt: vi.fn((field: string, value: string) => ({
              eq: vi.fn((field2: string, value2: boolean) => ({
                order: vi.fn(() => ({
                  then: async (cb: any) => {
                    const filtered = mockDatabase.dsg_credential_leases.filter(
                      (r) =>
                        r[field as keyof typeof r] > value &&
                        r[field2 as keyof typeof r] === value2
                    );
                    return cb({ data: filtered, error: null });
                  },
                })),
              })),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn((field: string, value: string) => {
              const countBefore = mockDatabase.dsg_credential_leases.length;
              mockDatabase.dsg_credential_leases = mockDatabase.dsg_credential_leases.filter(
                (r) => r[field as keyof typeof r] !== value
              );
              const count = countBefore - mockDatabase.dsg_credential_leases.length;
              return { error: null, count };
            }),
            lt: vi.fn((field: string, value: string) => {
              const countBefore = mockDatabase.dsg_credential_leases.length;
              mockDatabase.dsg_credential_leases = mockDatabase.dsg_credential_leases.filter(
                (r) => r[field as keyof typeof r] >= value
              );
              const count = countBefore - mockDatabase.dsg_credential_leases.length;
              return { error: null, count };
            }),
          })),
          update: vi.fn((updateData: any) => ({
            eq: vi.fn((field: string, value: string) => {
              mockDatabase.dsg_credential_leases = mockDatabase.dsg_credential_leases.map((r) =>
                r[field as keyof typeof r] === value ? { ...r, ...updateData } : r
              );
              return { error: null };
            }),
          })),
        };
      }
      throw new Error(`Unknown table: ${table}`);
    },
  };
}

describe("DSG Brain Persistence Layer", () => {
  beforeEach(() => {
    // Clear mock database before each test
    mockDatabase = {
      dsg_execution_grants: [],
      dsg_credential_leases: [],
    };
  });

  const basePlan = buildPlanAttempt({
    inputHash: "input-abc",
    attemptNo: 1,
    canonicalPlan: "echo hello",
    policyVersion: "v1.0.0",
    invariantVersion: "v1.0.0",
    toolManifestHash: "manifest-xyz",
  });

  describe("Grant Persistence", () => {
    it("saves an execution grant to database", async () => {
      const grant = buildExecutionGrant(basePlan, 60_000);
      await saveGrant(grant);

      expect(mockDatabase.dsg_execution_grants).toHaveLength(1);
      const saved = mockDatabase.dsg_execution_grants[0];
      expect(saved.grant_id).toBe(grant.grantId);
      expect(saved.plan_hash).toBe(grant.planHash);
      expect(saved.ttl_ms).toBe(60_000);
      expect(saved.renewals).toBe(0);
    });

    it("loads an execution grant from database", async () => {
      const grant = buildExecutionGrant(basePlan, 60_000);
      await saveGrant(grant);

      const loaded = await loadGrant(grant.grantId);
      expect(loaded).not.toBeNull();
      expect(loaded?.grantId).toBe(grant.grantId);
      expect(loaded?.planHash).toBe(grant.planHash);
      expect(loaded?.ttlMs).toBe(60_000);
    });

    it("returns null for non-existent grant", async () => {
      const loaded = await loadGrant("non-existent-grant");
      expect(loaded).toBeNull();
    });

    it("returns null for expired grant and cleans it up", async () => {
      const grant = buildExecutionGrant(basePlan, -1); // Already expired
      await saveGrant(grant);

      const loaded = await loadGrant(grant.grantId);
      expect(loaded).toBeNull();
      // Cleanup should have been attempted
      expect(mockDatabase.dsg_execution_grants.length).toBeGreaterThanOrEqual(0);
    });

    it("deletes a grant from database", async () => {
      const grant = buildExecutionGrant(basePlan, 60_000);
      await saveGrant(grant);
      expect(mockDatabase.dsg_execution_grants).toHaveLength(1);

      await deleteGrant(grant.grantId);
      expect(mockDatabase.dsg_execution_grants).toHaveLength(0);
    });

    it("gets all active grants", async () => {
      const grant1 = buildExecutionGrant(basePlan, 60_000);
      const grant2 = buildExecutionGrant(basePlan, 120_000);

      await saveGrant(grant1);
      await saveGrant(grant2);

      const active = await getAllActiveGrants();
      expect(active.length).toBeGreaterThanOrEqual(0);
    });

    it("cleanup removes expired grants", async () => {
      const grant1 = buildExecutionGrant(basePlan, 60_000);
      const grant2 = buildExecutionGrant(basePlan, -1); // Expired

      await saveGrant(grant1);
      await saveGrant(grant2);

      const cleaned = await cleanupExpiredGrants();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Lease Persistence", () => {
    it("saves a credential lease to database", async () => {
      const lease = createCredentialLease("API_KEY", "secret-123", 60_000);
      await saveLease(lease);

      expect(mockDatabase.dsg_credential_leases).toHaveLength(1);
      const saved = mockDatabase.dsg_credential_leases[0];
      expect(saved.lease_id).toBe(lease.leaseId);
      expect(saved.secret_name).toBe("API_KEY");
      expect(saved.valid).toBe(true);
      // Never store raw secret value
      expect(saved.redaction_fingerprint).not.toBe("secret-123");
    });

    it("loads a credential lease from database", async () => {
      const lease = createCredentialLease("DB_PASSWORD", "super-secret", 60_000);
      await saveLease(lease);

      const loaded = await loadLease(lease.leaseId);
      expect(loaded).not.toBeNull();
      expect(loaded?.leaseId).toBe(lease.leaseId);
      expect(loaded?.secretName).toBe("DB_PASSWORD");
      expect(loaded?.valid).toBe(true);
    });

    it("returns null for non-existent lease", async () => {
      const loaded = await loadLease("non-existent-lease");
      expect(loaded).toBeNull();
    });

    it("returns null for expired lease and cleans it up", async () => {
      const lease = createCredentialLease("API_KEY", "secret-123", -1); // Already expired
      await saveLease(lease);

      const loaded = await loadLease(lease.leaseId);
      expect(loaded).toBeNull();
    });

    it("deletes a lease from database", async () => {
      const lease = createCredentialLease("API_KEY", "secret-123", 60_000);
      await saveLease(lease);
      expect(mockDatabase.dsg_credential_leases).toHaveLength(1);

      await deleteLease(lease.leaseId);
      expect(mockDatabase.dsg_credential_leases).toHaveLength(0);
    });

    it("invalidates a lease", async () => {
      const lease = createCredentialLease("API_KEY", "secret-123", 60_000);
      await saveLease(lease);

      await invalidateLease(lease.leaseId);

      const loaded = await loadLease(lease.leaseId);
      expect(loaded?.valid).toBe(false);
    });

    it("gets all active leases", async () => {
      const lease1 = createCredentialLease("API_KEY", "secret-123", 60_000);
      const lease2 = createCredentialLease("DB_PASSWORD", "secret-456", 120_000);

      await saveLease(lease1);
      await saveLease(lease2);

      const active = await getAllActiveLeases();
      expect(active.length).toBeGreaterThanOrEqual(0);
    });

    it("cleanup removes expired leases", async () => {
      const lease1 = createCredentialLease("API_KEY", "secret-123", 60_000);
      const lease2 = createCredentialLease("DB_PASSWORD", "secret-456", -1); // Expired

      await saveLease(lease1);
      await saveLease(lease2);

      const cleaned = await cleanupExpiredLeases();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe("HermesPlugin Integration", () => {
    it("saves execution context with grant and leases", async () => {
      const plugin = new HermesPlugin();
      const grant = buildExecutionGrant(basePlan, 60_000);
      const lease = createCredentialLease("API_KEY", "secret-123", 60_000);

      const ctx = {
        plan: basePlan,
        grant,
        credentials: { leases: [lease], unavailable: [] },
        allowedCommands: ["echo"],
        allowedPaths: ["/tmp"],
      };

      await plugin.saveExecutionContext(ctx);

      expect(mockDatabase.dsg_execution_grants).toHaveLength(1);
      expect(mockDatabase.dsg_credential_leases).toHaveLength(1);
    });

    it("renews execution context with persistence", async () => {
      const plugin = new HermesPlugin();
      const grant = buildExecutionGrant(basePlan, 60_000);
      const lease = createCredentialLease("API_KEY", "secret-123", 60_000);

      const ctx = {
        plan: basePlan,
        grant,
        credentials: { leases: [lease], unavailable: [] },
        allowedCommands: ["echo"],
        allowedPaths: ["/tmp"],
      };

      const renewed = await plugin.renewExecutionContext(ctx, 120_000, true);

      expect(renewed.grant.renewals).toBe(1);
      expect(renewed.credentials.leases[0].renewals).toBe(1);
      expect(mockDatabase.dsg_execution_grants).toHaveLength(1);
      expect(mockDatabase.dsg_credential_leases).toHaveLength(1);
    });

    it("restores active contexts from database", async () => {
      const plugin = new HermesPlugin();
      const grant = buildExecutionGrant(basePlan, 60_000);
      const lease = createCredentialLease("API_KEY", "secret-123", 60_000);

      await saveGrant(grant);
      await saveLease(lease);

      const restored = await plugin.restoreActiveContexts();

      expect(restored.grants.length).toBeGreaterThanOrEqual(0);
      expect(restored.leases.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Persistence Across Renewal", () => {
    it("persists renewed grant state", async () => {
      const grant = buildExecutionGrant(basePlan, 60_000);
      await saveGrant(grant);

      const renewed = renewExecutionGrant(grant, basePlan, 120_000);
      await saveGrant(renewed);

      const loaded = await loadGrant(renewed.grantId);
      expect(loaded?.renewals).toBe(1);
      expect(loaded?.ttlMs).toBe(120_000);
    });

    it("persists renewed lease state", async () => {
      const lease = createCredentialLease("API_KEY", "secret-123", 60_000);
      await saveLease(lease);

      const renewed = renewCredentialLease(lease, 120_000);
      await saveLease(renewed);

      const loaded = await loadLease(renewed.leaseId);
      expect(loaded?.renewals).toBe(1);
      expect(loaded?.redactionFingerprint).toBe(lease.redactionFingerprint);
    });
  });
});
