import { describe, it, expect } from "vitest";
import {
  buildExecutionGrant,
  isGrantValid,
  renewExecutionGrant,
  buildControlledExecutionContext,
  createCredentialLease,
  isLeaseValid,
  renewCredentialLease,
} from "../../lib/dsg/brain/controlled-executor";
import { buildPlanAttempt } from "../../lib/dsg/brain/plan-attempt";

describe("DSG Brain Controlled Executor", () => {
  const basePlan = buildPlanAttempt({
    inputHash: "input-abc",
    attemptNo: 1,
    canonicalPlan: "echo hello",
    policyVersion: "v1.0.0",
    invariantVersion: "v1.0.0",
    toolManifestHash: "manifest-xyz",
  });

  it("builds an execution grant bound to planHash", () => {
    const grant = buildExecutionGrant(basePlan);
    expect(grant.planHash).toBe(basePlan.planHash);
    expect(grant.grantId).toContain(basePlan.planHash.slice(0, 16));
    expect(grant.issuedAt).toBeLessThanOrEqual(Date.now());
    expect(grant.ttlMs).toBe(5 * 60 * 1000);
    expect(grant.renewals).toBe(0);
    expect(grant.maxRenewals).toBe(2);
  });

  it("supports custom TTL and maxRenewals", () => {
    const grant = buildExecutionGrant(basePlan, 60_000, 5);
    expect(grant.ttlMs).toBe(60_000);
    expect(grant.maxRenewals).toBe(5);
  });

  it("validates grant against plan", () => {
    const grant = buildExecutionGrant(basePlan);
    expect(isGrantValid(grant, basePlan)).toBe(true);
  });

  it("invalidates grant when planHash mismatches", () => {
    const grant = buildExecutionGrant(basePlan);
    const otherPlan = buildPlanAttempt({
      inputHash: "input-xyz",
      attemptNo: 1,
      canonicalPlan: "echo world",
      policyVersion: "v1.0.0",
      invariantVersion: "v1.0.0",
      toolManifestHash: "manifest-abc",
    });
    expect(isGrantValid(grant, otherPlan)).toBe(false);
  });

  it("invalidates expired grant", () => {
    const grant = buildExecutionGrant(basePlan, -1);
    expect(isGrantValid(grant, basePlan)).toBe(false);
  });

  it("allows grace period for near-expired grants", () => {
    // Grant expired 10 seconds ago, but grace period is 30s
    const grant = buildExecutionGrant(basePlan, -10_000);
    expect(isGrantValid(grant, basePlan, 30_000)).toBe(true);
  });

  it("still blocks grants beyond grace period", () => {
    // Grant expired 60 seconds ago, grace period is 30s
    const grant = buildExecutionGrant(basePlan, -60_000);
    expect(isGrantValid(grant, basePlan, 30_000)).toBe(false);
  });

  it("renews execution grant extending TTL", () => {
    const grant = buildExecutionGrant(basePlan, 60_000);
    const renewed = renewExecutionGrant(grant, basePlan, 120_000);
    expect(renewed.planHash).toBe(grant.planHash);
    expect(renewed.renewals).toBe(1);
    expect(renewed.ttlMs).toBe(120_000);
    expect(renewed.issuedAt).toBeGreaterThanOrEqual(grant.issuedAt);
    expect(renewed.grantId).toContain("renewed-1");
  });

  it("blocks renewal of expired grant", () => {
    const grant = buildExecutionGrant(basePlan, -1);
    expect(() => renewExecutionGrant(grant, basePlan)).toThrow("CONFORMANCE BLOCK");
  });

  it("blocks renewal beyond maxRenewals", () => {
    const grant = buildExecutionGrant(basePlan, 60_000, 1);
    const once = renewExecutionGrant(grant, basePlan, 60_000);
    expect(once.renewals).toBe(1);
    expect(() => renewExecutionGrant(once, basePlan, 60_000)).toThrow(
      "CONFORMANCE BLOCK: Grant exceeded max renewals"
    );
  });

  it("builds controlled execution context without raw secrets", () => {
    const credentials = {
      leases: [
        createCredentialLease("ANTHROPIC_API_KEY", "sk-ant-secret-123", 60_000),
      ],
      unavailable: [],
    };
    const ctx = buildControlledExecutionContext(
      basePlan,
      ["echo", "cat"],
      ["/tmp/dsg"],
      credentials
    );

    expect(ctx.plan.planHash).toBe(basePlan.planHash);
    expect(ctx.allowedCommands).toContain("echo");
    expect(ctx.allowedPaths).toContain("/tmp/dsg");
    expect(ctx.credentials.leases).toHaveLength(1);

    // Ensure no raw secret value is present
    const ctxJson = JSON.stringify(ctx);
    expect(ctxJson).not.toContain("sk-ant-secret");
  });

  it("credential lease contains redaction fingerprint, not raw value", () => {
    const lease = createCredentialLease("DB_PASSWORD", "super-secret-42", 60_000);
    expect(lease.secretName).toBe("DB_PASSWORD");
    expect(lease.redactionFingerprint).toBeTruthy();
    expect(lease.redactionFingerprint).not.toBe("super-secret-42");
    expect(lease.leaseId).toContain("DB_PASSWORD");
    expect(lease.valid).toBe(true);
    expect(lease.renewals).toBe(0);
  });

  it("validates active lease", () => {
    const lease = createCredentialLease("API_KEY", "key-123", 60_000);
    expect(isLeaseValid(lease)).toBe(true);
  });

  it("invalidates expired lease", () => {
    const lease = createCredentialLease("API_KEY", "key-123", -1);
    expect(isLeaseValid(lease)).toBe(false);
  });

  it("allows grace period for near-expired leases", () => {
    const lease = createCredentialLease("API_KEY", "key-123", -10_000);
    expect(isLeaseValid(lease, 30_000)).toBe(true);
  });

  it("renews credential lease extending expiration", () => {
    const lease = createCredentialLease("API_KEY", "key-123", 60_000);
    const renewed = renewCredentialLease(lease, 120_000);
    expect(renewed.secretName).toBe(lease.secretName);
    expect(renewed.redactionFingerprint).toBe(lease.redactionFingerprint);
    expect(renewed.renewals).toBe(1);
    expect(renewed.expiresAt).toBeGreaterThan(lease.expiresAt);
    expect(renewed.leaseId).toContain("renewed-1");
  });

  it("blocks lease renewal beyond maxRenewals", () => {
    const lease = createCredentialLease("API_KEY", "key-123", 60_000, 1);
    const once = renewCredentialLease(lease, 60_000);
    expect(() => renewCredentialLease(once, 60_000)).toThrow(
      "CONFORMANCE BLOCK: Lease exceeded max renewals"
    );
  });
});
