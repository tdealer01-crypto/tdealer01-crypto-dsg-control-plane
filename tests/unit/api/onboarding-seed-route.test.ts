import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../lib/auth/require-active-profile", () => ({
  requireActiveProfile: vi.fn(),
}));

vi.mock("../../../lib/supabase-server", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("../../../lib/security/api-error", () => ({
  internalErrorMessage: () => "Internal error",
  logApiError: vi.fn(),
}));

import { POST } from "../../../app/api/onboarding/seed/route";
import { requireActiveProfile } from "../../../lib/auth/require-active-profile";

const mockRequireActiveProfile = vi.mocked(requireActiveProfile);

describe("POST /api/onboarding/seed (deprecated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 410 Gone in production without the opt-in flag", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_ONBOARDING_SEED", "");

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(410);
    expect(body.deprecated).toBe(true);
    // The deprecation gate runs before any auth/DB work.
    expect(mockRequireActiveProfile).not.toHaveBeenCalled();
  });

  it("stays usable in production when explicitly opted in", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_ONBOARDING_SEED", "true");
    mockRequireActiveProfile.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    } as any);

    const res = await POST();

    // Gate passes, so auth is enforced (mocked here as 401).
    expect(res.status).toBe(401);
    expect(mockRequireActiveProfile).toHaveBeenCalled();
  });

  it("passes the deprecation gate outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    mockRequireActiveProfile.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    } as any);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(mockRequireActiveProfile).toHaveBeenCalled();
  });
});
