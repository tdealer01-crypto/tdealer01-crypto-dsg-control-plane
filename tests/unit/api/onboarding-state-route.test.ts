import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../lib/auth/require-org-permission", () => ({
  requireOrgPermission: vi.fn(),
}));

vi.mock("../../../lib/supabase-server", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { GET, PATCH } from "../../../app/api/onboarding/state/route";
import { requireOrgPermission } from "../../../lib/auth/require-org-permission";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

const mockRequireOrgPermission = vi.mocked(requireOrgPermission);
const mockGetSupabaseAdmin = vi.mocked(getSupabaseAdmin);

function jsonPatch(body: unknown) {
  return new Request("http://localhost/api/onboarding/state", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

function makeAdmin() {
  const onboardingRows = [
    {
      id: "onboarding-1",
      bootstrap_status: "pending",
      checklist: {
        dashboard_widget_v1: { dismissed: false, completedStepIds: [] },
      },
      bootstrapped_at: null,
    },
    {
      id: "onboarding-1",
      bootstrap_status: "pending",
      checklist: {
        dashboard_widget_v1: {
          dismissed: false,
          completedStepIds: ["connect_integration"],
        },
      },
      bootstrapped_at: null,
    },
  ];

  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: { id: "onboarding-1" },
            error: null,
          })),
        })),
      })),
    })),
  }));

  const auditInsert = vi.fn(async () => ({ error: null }));

  return {
    update,
    auditInsert,
    from: vi.fn((table: string) => {
      if (table === "org_onboarding_states") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: onboardingRows.shift() ?? null,
                error: null,
              })),
            })),
          })),
          update,
          insert: vi.fn(async () => ({ error: null })),
        };
      }

      if (table === "agents") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({ count: 1, error: null })),
          })),
        };
      }

      if (table === "executions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({ count: 0, error: null })),
          })),
        };
      }

      if (table === "audit_logs") {
        return { insert: auditInsert };
      }

      throw new Error(`unexpected table ${table}`);
    }),
  };
}

describe("/api/onboarding/state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks anonymous GET through org.view_reports permission", async () => {
    mockRequireOrgPermission.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(mockRequireOrgPermission).toHaveBeenCalledWith("org.view_reports");
  });

  it("returns evidence-derived progress and points next_action at Quick Setup, not Skills", async () => {
    mockRequireOrgPermission.mockResolvedValueOnce({
      ok: true,
      orgId: "org-1",
      userId: "user-1",
      authUserId: "auth-1",
      email: "operator@example.com",
      role: "operator",
    });
    mockGetSupabaseAdmin.mockReturnValue(makeAdmin() as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockRequireOrgPermission).toHaveBeenCalledWith("org.view_reports");
    // Progress is derived from real agent/execution counts, not a manual checkbox.
    expect(body.progress).toEqual({
      workspace_ready: true,
      agent_ready: true,
      first_execution_ready: false,
    });
    expect(body.has_agent).toBe(true);
    // next_action must guide users to the real Quick Setup location.
    expect(body.next_action).toMatch(/Quick Setup/);
    expect(body.next_action).not.toMatch(/Skills/);
  });

  it("rejects invalid normalized checklist step ids before persistence", async () => {
    mockRequireOrgPermission.mockResolvedValueOnce({
      ok: true,
      orgId: "org-1",
      userId: "user-1",
      authUserId: "auth-1",
      email: "operator@example.com",
      role: "operator",
    });
    mockGetSupabaseAdmin.mockReturnValue(makeAdmin() as any);

    const res = await PATCH(jsonPatch({ completedStepIds: ["not_a_step"] }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid onboarding step id");
  });

  it("persists valid org-scoped widget state and writes an audit row", async () => {
    mockRequireOrgPermission.mockResolvedValueOnce({
      ok: true,
      orgId: "org-1",
      userId: "user-1",
      authUserId: "auth-1",
      email: "operator@example.com",
      role: "operator",
    });
    const admin = makeAdmin();
    mockGetSupabaseAdmin.mockReturnValue(admin as any);

    const res = await PATCH(
      jsonPatch({
        dismissed: false,
        completedStepIds: ["connect_integration"],
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockRequireOrgPermission).toHaveBeenCalledWith("org.manage_agents");
    expect(admin.update).toHaveBeenCalledWith(
      expect.objectContaining({
        checklist: expect.objectContaining({
          dashboard_widget_v1: {
            dismissed: false,
            completedStepIds: ["connect_integration"],
          },
        }),
      }),
    );
    expect(admin.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org-1",
        policy_version: "onboarding-state-v1",
        decision: "ALLOW",
        metadata: expect.objectContaining({ permission: "org.manage_agents" }),
        evidence: expect.objectContaining({
          source: "api/onboarding/state",
          completed_step_ids: ["connect_integration"],
        }),
      }),
    );
    expect(body.widget.completedStepIds).toEqual(["connect_integration"]);
  });
});
