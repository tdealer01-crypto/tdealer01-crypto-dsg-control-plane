import { evaluateAutomationController } from "../../../lib/dsg/controller/automation-controller";
import {
  isProductionReadyDeterministicProof,
  proveDeterministicPlan,
} from "../../../lib/dsg/deterministic/proof-engine";
import type { DsgAutomationControllerRequest } from "../../../lib/dsg/controller/types";

function baseRequest(
  overrides: Partial<DsgAutomationControllerRequest> = {},
): DsgAutomationControllerRequest {
  return {
    actionId: "act-test-001",
    actionType: "agent_action",
    actor: {
      userId: "user-test-001",
      role: "operator",
      workspaceId: "org-test-001",
    },
    resource: {
      type: "workflow",
      id: "wf-test-001",
      classification: "internal",
    },
    evidence: [
      {
        id: "ev-test-001",
        title: "Repository-stated control evidence",
        state: "REPO_STATED",
        source: "repo",
      },
    ],
    context: {
      requirement_clear: true,
      tool_available: true,
      permission_granted: true,
      secret_bound: true,
      dependency_resolved: true,
      testable: true,
      audit_hook_available: true,
    },
    nonce: "nonce-test-001",
    idempotencyKey: "idem-test-001",
    ...overrides,
  };
}

async function fullProof() {
  return await proveDeterministicPlan({
    planId: "plan-test-001",
    nonce: "nonce-test-001",
    idempotencyKey: "idem-test-001",
    context: {
      requirement_clear: true,
      tool_available: true,
      permission_granted: true,
      secret_bound: true,
      dependency_resolved: true,
      testable: true,
      deploy_target_ready: true,
      audit_hook_available: true,
    },
  });
}

async function proofWith(overrides: Record<string, unknown>) {
  const baseProof = await fullProof();
  return { ...baseProof, ...overrides } as Awaited<ReturnType<typeof fullProof>>;
}

describe("DSG automation controller", () => {
  it("passes a fully evidenced low-risk agent action through the real deterministic gate scaffold", async () => {
    const result = evaluateAutomationController(
      baseRequest({
        resource: {
          type: "workflow",
          id: "wf-public-001",
          classification: "public",
        },
      }),
    );

    expect(result.type).toBe("dsg-automation-controller-decision");
    expect(result.ok).toBe(true);
    expect(result.decision).toBe("PASS");
    expect(result.gate.proof.proofHash).toBeTruthy();
    expect(result.evidenceBoundary.externalSolverInvoked).toBe(false);
    expect(result.evidenceBoundary.productionReadyClaim).toBe(true);
  });

  it("does not pass high-risk action when required approval is missing", async () => {
    const result = evaluateAutomationController(
      baseRequest({
        actionType: "deployment_action",
        resource: {
          type: "deployment",
          id: "deploy-test-001",
          classification: "secret",
        },
        context: {
          requirement_clear: true,
          tool_available: true,
          permission_granted: true,
          secret_bound: true,
          dependency_resolved: true,
          testable: true,
          deploy_target_ready: true,
          audit_hook_available: true,
          approval_available: false,
        },
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.requiredApproval).toBe(true);
    expect(result.decision).not.toBe("PASS");
    expect(result.policy.failureReasons).toContain(
      "required_approval_not_available",
    );
    expect(result.remediation).toContain(
      "attach_human_approval_before_execution",
    );
    expect(result.gate.proof.evidenceBoundary.productionReadyClaim).toBe(false);
    expect(result.evidenceBoundary.productionReadyClaim).toBe(false);
  });

  it("blocks unsupported evidence from becoming a passing consumer-facing decision", async () => {
    const result = evaluateAutomationController(
      baseRequest({
        evidence: [
          {
            id: "ev-unsupported-001",
            title: "Unsupported customer claim",
            state: "UNSUPPORTED",
            source: "unverified-copy",
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.decision).not.toBe("PASS");
    expect(result.policy.failureReasons).toContain(
      "blocked_or_unsupported_evidence_present",
    );
    expect(result.remediation).toContain(
      "attach_verified_or_repo_stated_evidence",
    );
    expect(result.gate.proof.evidenceBoundary.productionReadyClaim).toBe(false);
    expect(result.evidenceBoundary.productionReadyClaim).toBe(false);
  });
});

describe("production readiness proof boundary", () => {
  it("sets productionReadyClaim true for a complete PASS proof", async () => {
    const proof = await fullProof();

    expect(proof.status).toBe("PASS");
    expect(proof.evidenceBoundary.productionReadyClaim).toBe(true);
    expect(isProductionReadyDeterministicProof(proof)).toBe(true);
  });

  it("keeps productionReadyClaim false when any constraint fails", async () => {
    const proof = await proveDeterministicPlan({
      planId: "plan-test-constraint-fail",
      nonce: "nonce-test-001",
      idempotencyKey: "idem-test-001",
      context: {
        requirement_clear: true,
        tool_available: true,
        permission_granted: true,
        secret_bound: true,
        dependency_resolved: true,
        testable: true,
        deploy_target_ready: false,
        audit_hook_available: true,
      },
    });

    expect(proof.status).not.toBe("PASS");
    expect(proof.evidenceBoundary.productionReadyClaim).toBe(false);
    expect(isProductionReadyDeterministicProof(proof)).toBe(false);
  });

  it("returns false when proof is missing nonce", async () => {
    const overrides = {
      replayProtection: { ...(await fullProof()).replayProtection, nonce: "" },
    };
    expect(isProductionReadyDeterministicProof(await proofWith(overrides))).toBe(
      false,
    );
  });

  it("returns false when proof is missing idempotencyKey", async () => {
    const overrides = {
      replayProtection: {
        ...(await fullProof()).replayProtection,
        idempotencyKey: "",
      },
    };
    expect(isProductionReadyDeterministicProof(await proofWith(overrides))).toBe(
      false,
    );
  });

  it("returns false for missing policyVersion", async () => {
    expect(isProductionReadyDeterministicProof(await proofWith({ policyVersion: "" }))).toBe(
      false,
    );
  });

  it("returns false for missing constraintSetHash", async () => {
    expect(isProductionReadyDeterministicProof(await proofWith({ constraintSetHash: "" }))).toBe(
      false,
    );
  });

  it("returns false for missing proofHash", async () => {
    expect(isProductionReadyDeterministicProof(await proofWith({ proofHash: "" }))).toBe(
      false,
    );
  });

  it("returns false when solver.version is missing", async () => {
    const overrides = {
      solver: { ...(await fullProof()).solver, version: "" },
    };
    expect(isProductionReadyDeterministicProof(await proofWith(overrides))).toBe(
      false,
    );
  });

  it("returns false for empty constraints", async () => {
    expect(isProductionReadyDeterministicProof(await proofWith({ constraints: [] }))).toBe(
      false,
    );
  });

  it("keeps disallowed external/compliance boundary claims false", async () => {
    const result = evaluateAutomationController(
      baseRequest({
        resource: {
          type: "workflow",
          id: "wf-public-001",
          classification: "public",
        },
      }),
    );

    expect(result.evidenceBoundary.externalZ3ProductionSolverClaim).toBe(false);
    expect(result.evidenceBoundary.certificationClaim).toBe(false);
    expect(result.evidenceBoundary.independentAuditClaim).toBe(false);
    expect(result.evidenceBoundary.wormStorageCertifiedClaim).toBe(false);
    expect(result.evidenceBoundary.cryptographicSigningCompleteClaim).toBe(
      false,
    );
  });
});
