import { buildPlanHash, buildPlanScopeHash, type HermesPlanScopeContract } from "./plan-scope-contract";

function getAdminClient() {
  try {
    // Lazy import to avoid build-time env var requirements in test environments
    const { getSupabaseAdmin } = require("../supabase-server");
    return getSupabaseAdmin() as ReturnType<typeof import("../supabase-server").getSupabaseAdmin>;
  } catch {
    return null;
  }
}

export async function lookupPlanContract(
  planHash: string,
  workspaceId: string,
): Promise<HermesPlanScopeContract | null> {
  const db = getAdminClient();
  if (!db) return null;

  try {
    const { data, error } = await db
      .from("dsg_plan_contracts" as never)
      .select("*")
      .eq("plan_hash", planHash)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as Record<string, unknown>;

    const contract: HermesPlanScopeContract = {
      planId: row.plan_id as string,
      planHash: row.plan_hash as string,
      scopeHash: row.scope_hash as string,
      workspaceId: row.workspace_id as string,
      agentId: row.agent_id as string,
      approvedBy: row.approved_by as string,
      approvedAt: row.approved_at as string,
      expiresAt: row.expires_at != null ? (row.expires_at as string) : undefined,
      allowedActionTypes: row.allowed_action_types as HermesPlanScopeContract["allowedActionTypes"],
      allowedTargetSystems: row.allowed_target_systems as string[],
      allowedOperations: row.allowed_operations as string[],
      maxRiskLevel: row.max_risk_level as HermesPlanScopeContract["maxRiskLevel"],
      evidenceRequirements: row.evidence_requirements as HermesPlanScopeContract["evidenceRequirements"],
      claimBoundary: row.claim_boundary as string,
    };

    // Verify stored hash fields match the contract's own computed values.
    // Protects against DB tampering or partial writes.
    const recomputedScopeHash = buildPlanScopeHash(contract);
    const recomputedPlanHash = buildPlanHash(contract);

    if (recomputedScopeHash !== contract.scopeHash || recomputedPlanHash !== contract.planHash) {
      return null;
    }

    return contract;
  } catch {
    // Table not yet migrated or DB unavailable — fail closed, no bypass granted
    return null;
  }
}

export async function storePlanContract(contract: HermesPlanScopeContract): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminClient();
  if (!db) return { ok: false, error: "DB_UNAVAILABLE" };

  const recomputedScopeHash = buildPlanScopeHash(contract);
  const recomputedPlanHash = buildPlanHash(contract);

  if (recomputedScopeHash !== contract.scopeHash || recomputedPlanHash !== contract.planHash) {
    return { ok: false, error: "PLAN_HASH_INTEGRITY_FAIL" };
  }

  try {
    const { error } = await db.from("dsg_plan_contracts" as never).insert({
      plan_id: contract.planId,
      plan_hash: contract.planHash,
      scope_hash: contract.scopeHash,
      workspace_id: contract.workspaceId,
      agent_id: contract.agentId,
      approved_by: contract.approvedBy,
      approved_at: contract.approvedAt,
      expires_at: contract.expiresAt ?? null,
      allowed_action_types: contract.allowedActionTypes,
      allowed_target_systems: contract.allowedTargetSystems,
      allowed_operations: contract.allowedOperations,
      max_risk_level: contract.maxRiskLevel,
      evidence_requirements: contract.evidenceRequirements,
      claim_boundary: contract.claimBoundary,
    } as never);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "STORE_FAILED" };
  }
}
