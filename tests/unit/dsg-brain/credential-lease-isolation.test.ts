/**
 * Credential Broker — Lease Isolation Tests
 *
 * Verifies that brokerCredentials() never returns raw secret values.
 * All assertions run against mocked Supabase — no live DB required.
 *
 * Core invariant: the raw secret string must NEVER appear in the
 * serialised result from brokerCredentials().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Supabase mock setup (must precede the import of brokerCredentials)
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockIn = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

mockSelect.mockReturnValue({ in: mockIn, eq: mockEq, single: mockSingle });
mockIn.mockReturnValue({ data: [], error: null });
mockEq.mockReturnValue({ single: mockSingle });
mockSingle.mockReturnValue({ data: null, error: null });

vi.mock("../../../lib/supabase-server", () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

// Import after mock is set up
import { brokerCredentials } from "../../../lib/dsg/brain/credential-broker";

// Helper: compute expected SHA-256 fingerprint for a secret value
function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// beforeEach — reset mock state
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Re-wire chain after clearAllMocks
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ in: mockIn, eq: mockEq, single: mockSingle });
  mockIn.mockReturnValue({ data: [], error: null });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSingle.mockReturnValue({ data: null, error: null });
});

// ---------------------------------------------------------------------------
// Core isolation invariant — raw secret must never appear in result
// ---------------------------------------------------------------------------

describe("brokerCredentials — raw secret value is never returned", () => {
  it("does NOT expose the raw secret string in JSON-serialised result", async () => {
    const rawSecret = "sk_test_secret123";

    mockIn.mockReturnValue({
      data: [
        {
          id: "abc-uuid",
          name: "stripe_key",
          value: rawSecret,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await brokerCredentials(["stripe_key"]);
    const serialised = JSON.stringify(result);

    // The raw secret value must NOT appear anywhere in the serialised result
    expect(serialised).not.toContain(rawSecret);
  });

  it("returned lease redactionFingerprint equals SHA-256 hex of the secret value", async () => {
    const rawSecret = "sk_test_secret123";
    const expectedFingerprint = sha256Hex(rawSecret);

    mockIn.mockReturnValue({
      data: [
        {
          id: "abc-uuid",
          name: "stripe_key",
          value: rawSecret,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await brokerCredentials(["stripe_key"]);

    expect(result.leases).toHaveLength(1);
    expect(result.leases[0].redactionFingerprint).toBe(expectedFingerprint);
  });
});

// ---------------------------------------------------------------------------
// Lease structure
// ---------------------------------------------------------------------------

describe("brokerCredentials — lease has required fields", () => {
  it("lease has secretName, leaseId, redactionFingerprint, expiresAt, maxRenewals fields", async () => {
    const rawSecret = "anthropic_key_test_value_xyz";

    mockIn.mockReturnValue({
      data: [
        {
          id: "def-uuid",
          name: "ANTHROPIC_API_KEY",
          value: rawSecret,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await brokerCredentials(["ANTHROPIC_API_KEY"]);

    expect(result.leases).toHaveLength(1);
    const lease = result.leases[0];

    // Required fields per CredentialLease interface
    expect(lease).toHaveProperty("secretName", "ANTHROPIC_API_KEY");
    expect(lease).toHaveProperty("leaseId");
    expect(lease).toHaveProperty("redactionFingerprint");
    expect(lease).toHaveProperty("expiresAt");
    expect(lease).toHaveProperty("maxRenewals");
    expect(lease).toHaveProperty("renewals");
    expect(lease).toHaveProperty("valid");

    // leaseId should be a non-empty string
    expect(typeof lease.leaseId).toBe("string");
    expect(lease.leaseId.length).toBeGreaterThan(0);

    // expiresAt should be a future timestamp
    expect(lease.expiresAt).toBeGreaterThan(Date.now() - 1000);

    // maxRenewals should be a non-negative integer
    expect(typeof lease.maxRenewals).toBe("number");
    expect(lease.maxRenewals).toBeGreaterThanOrEqual(0);
  });

  it("lease is initially valid and has zero renewals", async () => {
    mockIn.mockReturnValue({
      data: [
        {
          id: "ghi-uuid",
          name: "my_secret",
          value: "some_secret_value",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await brokerCredentials(["my_secret"]);
    const lease = result.leases[0];

    expect(lease.valid).toBe(true);
    expect(lease.renewals).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Unavailable secrets
// ---------------------------------------------------------------------------

describe("brokerCredentials — unavailable secrets list", () => {
  it("adds missing secret to unavailable when Supabase returns empty array", async () => {
    // Mock returns no data (secret not found)
    mockIn.mockReturnValue({
      data: [],
      error: null,
    });

    const result = await brokerCredentials(["missing_key"]);

    expect(result.leases).toHaveLength(0);
    expect(result.unavailable).toContain("missing_key");
  });

  it("adds only unfound secrets to unavailable when some are found", async () => {
    mockIn.mockReturnValue({
      data: [
        {
          id: "jkl-uuid",
          name: "found_key",
          value: "secret_value_abc",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await brokerCredentials(["found_key", "missing_key"]);

    expect(result.leases).toHaveLength(1);
    expect(result.leases[0].secretName).toBe("found_key");
    expect(result.unavailable).toContain("missing_key");
    expect(result.unavailable).not.toContain("found_key");
  });

  it("returns empty leases and unavailable when secretNames is empty", async () => {
    const result = await brokerCredentials([]);

    expect(result.leases).toHaveLength(0);
    expect(result.unavailable).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple secrets in one call
// ---------------------------------------------------------------------------

describe("brokerCredentials — multiple secrets in one batch", () => {
  it("brokers multiple secrets in a single Supabase query", async () => {
    const secret1 = "first_secret_value";
    const secret2 = "second_secret_value";

    mockIn.mockReturnValue({
      data: [
        { id: "uuid-1", name: "key_one", value: secret1, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
        { id: "uuid-2", name: "key_two", value: secret2, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      ],
      error: null,
    });

    const result = await brokerCredentials(["key_one", "key_two"]);

    expect(result.leases).toHaveLength(2);
    expect(result.unavailable).toHaveLength(0);

    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain(secret1);
    expect(serialised).not.toContain(secret2);

    const leaseNames = result.leases.map((l) => l.secretName);
    expect(leaseNames).toContain("key_one");
    expect(leaseNames).toContain("key_two");
  });
});

// ---------------------------------------------------------------------------
// Error propagation
// ---------------------------------------------------------------------------

describe("brokerCredentials — DB error propagation", () => {
  it("throws when Supabase returns an error", async () => {
    mockIn.mockReturnValue({
      data: null,
      error: { message: "relation dsg_secrets does not exist" },
    });

    await expect(brokerCredentials(["some_key"])).rejects.toThrow(
      /Failed to query secrets from Supabase/i
    );
  });
});
