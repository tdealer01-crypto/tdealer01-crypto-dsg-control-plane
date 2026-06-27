import { describe, it, expect, beforeEach, vi } from "vitest";
import { brokerCredentials, checkSecretExists, checkSecretsExist } from "../../lib/dsg/brain/credential-broker";
import * as supabaseServer from "../../lib/supabase-server";

// Mock the Supabase admin client
vi.mock("../../lib/supabase-server", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("Credential Broker (DSG Brain)", () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      from: vi.fn(),
    };

    // Mock getSupabaseAdmin to return our mock client
    vi.mocked(supabaseServer.getSupabaseAdmin).mockReturnValue(mockSupabaseClient);
  });

  describe("brokerCredentials", () => {
    it("should return empty arrays for empty secret names", async () => {
      const result = await brokerCredentials([]);
      expect(result).toEqual({ leases: [], unavailable: [] });
    });

    it("should create leases for existing secrets", async () => {
      const secretName = "ANTHROPIC_API_KEY";
      const secretValue = "sk-ant-test-key-value-12345";

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: "secret-1",
              name: secretName,
              value: secretValue,
              created_at: "2026-05-30T00:00:00Z",
              updated_at: "2026-05-30T00:00:00Z",
            },
          ],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await brokerCredentials([secretName]);

      expect(result.leases).toHaveLength(1);
      expect(result.leases[0]).toEqual(
        expect.objectContaining({
          secretName,
          leaseId: expect.stringContaining("lease-ANTHROPIC_API_KEY-"),
          redactionFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA256 hex
          expiresAt: expect.any(Number),
          valid: true,
          renewals: 0,
          maxRenewals: 2,
        })
      );
      expect(result.unavailable).toHaveLength(0);
    });

    it("should track unavailable secrets", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [], // No secrets found
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await brokerCredentials(["MISSING_KEY_1", "MISSING_KEY_2"]);

      expect(result.leases).toHaveLength(0);
      expect(result.unavailable).toEqual(["MISSING_KEY_1", "MISSING_KEY_2"]);
    });

    it("should mix found and unavailable secrets", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: "secret-1",
              name: "ANTHROPIC_API_KEY",
              value: "sk-ant-test-12345",
              created_at: "2026-05-30T00:00:00Z",
              updated_at: "2026-05-30T00:00:00Z",
            },
          ],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await brokerCredentials(["ANTHROPIC_API_KEY", "MISSING_KEY"]);

      expect(result.leases).toHaveLength(1);
      expect(result.leases[0].secretName).toBe("ANTHROPIC_API_KEY");
      expect(result.unavailable).toEqual(["MISSING_KEY"]);
    });

    it("should throw on database error", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(brokerCredentials(["SOME_KEY"])).rejects.toThrow(
        /Credential broker: Failed to query secrets from Supabase/
      );
    });

    it("should skip malformed secret records", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: "secret-1",
              name: "VALID_KEY",
              value: "valid-value",
              created_at: "2026-05-30T00:00:00Z",
              updated_at: "2026-05-30T00:00:00Z",
            },
            {
              id: "secret-2",
              name: "EMPTY_VALUE_KEY",
              value: "", // Malformed: empty value
              created_at: "2026-05-30T00:00:00Z",
              updated_at: "2026-05-30T00:00:00Z",
            },
          ],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await brokerCredentials(["VALID_KEY", "EMPTY_VALUE_KEY"]);

      expect(result.leases).toHaveLength(1);
      expect(result.leases[0].secretName).toBe("VALID_KEY");
      expect(result.unavailable).toContain("EMPTY_VALUE_KEY");
    });

    it("should create leases with correct redaction fingerprints", async () => {
      const secretName = "OPENAI_API_KEY";
      const secretValue = "sk-openai-test-value";

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: "secret-1",
              name: secretName,
              value: secretValue,
              created_at: "2026-05-30T00:00:00Z",
              updated_at: "2026-05-30T00:00:00Z",
            },
          ],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await brokerCredentials([secretName]);

      // Verify that the fingerprint is a SHA256 hash of the secret value
      expect(result.leases[0].redactionFingerprint).toMatch(/^[a-f0-9]{64}$/);
      // And it should NOT contain the actual secret value
      expect(result.leases[0].redactionFingerprint).not.toContain(secretValue);
    });

    it("should use custom broker config", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: "secret-1",
              name: "TEST_KEY",
              value: "test-value",
              created_at: "2026-05-30T00:00:00Z",
              updated_at: "2026-05-30T00:00:00Z",
            },
          ],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const customTtlMs = 10 * 60 * 1000; // 10 minutes
      const customMaxRenewals = 5;

      const result = await brokerCredentials(["TEST_KEY"], {
        defaultLeaseTtlMs: customTtlMs,
        defaultMaxRenewals: customMaxRenewals,
      });

      expect(result.leases[0].maxRenewals).toBe(customMaxRenewals);
      // Check that expiration is approximately correct (within 1 second)
      const now = Date.now();
      const expectedExpiration = now + customTtlMs;
      expect(result.leases[0].expiresAt).toBeGreaterThan(expectedExpiration - 1000);
      expect(result.leases[0].expiresAt).toBeLessThanOrEqual(expectedExpiration + 1000);
    });
  });

  describe("checkSecretExists", () => {
    it("should return true when secret exists", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "secret-1" },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const exists = await checkSecretExists("TEST_KEY");
      expect(exists).toBe(true);
    });

    it("should return false when secret does not exist", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const exists = await checkSecretExists("MISSING_KEY");
      expect(exists).toBe(false);
    });

    it("should throw on database error", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST500", message: "Server error" },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(checkSecretExists("TEST_KEY")).rejects.toThrow(
        /Failed to check secret existence/
      );
    });
  });

  describe("checkSecretsExist", () => {
    it("should return empty arrays for empty input", async () => {
      const result = await checkSecretsExist([]);
      expect(result).toEqual({ existing: [], missing: [] });
    });

    it("should separate existing and missing secrets", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ name: "KEY_1" }, { name: "KEY_3" }],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await checkSecretsExist(["KEY_1", "KEY_2", "KEY_3"]);

      expect(result.existing).toEqual(["KEY_1", "KEY_3"]);
      expect(result.missing).toEqual(["KEY_2"]);
    });

    it("should throw on database error", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Connection error" },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(checkSecretsExist(["KEY_1"])).rejects.toThrow(
        /checkSecretsExist failed/
      );
    });
  });
});
