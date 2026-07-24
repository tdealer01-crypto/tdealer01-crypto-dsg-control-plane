import { createHash } from "crypto";
import type { RemediationPlan } from "./plan-manager";
import type { StepResult, ExecutionContext } from "./controlled-executor";

export interface ConformanceEvidence {
  planId: string;
  executionId: string;
  planHashMatches: boolean;
  allStepsCompleted: boolean;
  noUnauthorizedCommands: boolean;
  allPathsWhitelisted: boolean;
  credentialsVerified: boolean;
  auditTrailComplete: boolean;
  executionHash: string;
  summary: string;
}

export interface ConformanceViolation {
  type: "plan_mismatch" | "unauthorized_command" | "path_violation" | "incomplete_execution" | "missing_audit";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: Record<string, unknown>;
}

export class ConformanceValidator {
  validateExecution(
    plan: RemediationPlan,
    context: ExecutionContext,
    results: StepResult[]
  ): ConformanceEvidence {
    const violations: ConformanceViolation[] = [];

    // Check 1: Plan hash integrity
    const planHashMatches = this.verifyPlanHash(plan, context);
    if (!planHashMatches) {
      violations.push({
        type: "plan_mismatch",
        severity: "critical",
        description: "Plan hash does not match executed plan",
        evidence: {
          expectedHash: plan.planHash,
          executedHash: context.planHash,
        },
      });
    }

    // Check 2: All steps completed
    const expectedSteps = new Set(plan.steps.map((s) => s.id));
    const completedSteps = new Set(results.map((r) => r.stepId));
    const allStepsCompleted = expectedSteps.size === completedSteps.size;

    if (!allStepsCompleted) {
      const missingSteps = Array.from(expectedSteps).filter(
        (id) => !completedSteps.has(id)
      );
      violations.push({
        type: "incomplete_execution",
        severity: "high",
        description: `${missingSteps.length} steps not completed`,
        evidence: { missingSteps },
      });
    }

    // Check 3: No unauthorized commands
    const noUnauthorizedCommands = this.verifyAuthorizedCommands(
      context
    );
    if (!noUnauthorizedCommands) {
      violations.push({
        type: "unauthorized_command",
        severity: "critical",
        description: "Unauthorized commands detected in audit log",
        evidence: this.findUnauthorizedCommands(context),
      });
    }

    // Check 4: All file paths whitelisted
    const allPathsWhitelisted = this.verifyWhitelistedPaths(context);
    if (!allPathsWhitelisted) {
      violations.push({
        type: "path_violation",
        severity: "critical",
        description: "Non-whitelisted file paths accessed",
        evidence: this.findViolatedPaths(context),
      });
    }

    // Check 5: Credentials verified
    const credentialsVerified = this.verifyCredentialUsage(context);
    if (!credentialsVerified) {
      violations.push({
        type: "unauthorized_command",
        severity: "high",
        description: "Credential usage anomalies detected",
        evidence: this.findCredentialViolations(context),
      });
    }

    // Check 6: Complete audit trail
    const auditTrailComplete = context.auditLog.length > 0;
    if (!auditTrailComplete) {
      violations.push({
        type: "missing_audit",
        severity: "high",
        description: "No audit trail recorded",
        evidence: {},
      });
    }

    // Generate execution hash
    const executionHash = this.hashExecution(context, results);

    // Determine if conformance is met
    const isCriticalViolation = violations.some((v) => v.severity === "critical");

    return {
      planId: plan.id,
      executionId: context.executionId,
      planHashMatches,
      allStepsCompleted,
      noUnauthorizedCommands,
      allPathsWhitelisted,
      credentialsVerified,
      auditTrailComplete,
      executionHash,
      summary: isCriticalViolation
        ? `BLOCKED: ${violations.length} conformance violations detected`
        : violations.length === 0
          ? "PASSED: Full conformance verified"
          : `WARNING: ${violations.length} non-critical violations`,
    };
  }

  private verifyPlanHash(plan: RemediationPlan, context: ExecutionContext): boolean {
    return plan.planHash === context.planHash;
  }

  private verifyAuthorizedCommands(context: ExecutionContext): boolean {
    return context.auditLog.every((event) => {
      if (event.type === "blocked") {
        return false;
      }
      if (event.command) {
        return context.allowedCommands.some(
          (allowed) =>
            event.command === allowed ||
            event.command!.startsWith(allowed + " ")
        );
      }
      return true;
    });
  }

  private findUnauthorizedCommands(
    context: ExecutionContext
  ): Record<string, unknown> {
    const unauthorized = context.auditLog.filter(
      (event) =>
        event.command &&
        !context.allowedCommands.some(
          (allowed) =>
            event.command === allowed ||
            event.command!.startsWith(allowed + " ")
        )
    );

    return {
      count: unauthorized.length,
      commands: unauthorized.map((e) => ({
        stepId: e.stepId,
        command: e.command,
        timestamp: e.timestamp,
      })),
    };
  }

  private verifyWhitelistedPaths(context: ExecutionContext): boolean {
    return context.auditLog.every((event) => {
      if (event.evidence?.path) {
        const path = event.evidence.path as string;
        return context.allowedPaths.some((allowed) => path.startsWith(allowed));
      }
      return true;
    });
  }

  private findViolatedPaths(
    context: ExecutionContext
  ): Record<string, unknown> {
    const violated = context.auditLog.filter((event) => {
      if (event.evidence?.path) {
        const path = event.evidence.path as string;
        return !context.allowedPaths.some((allowed) =>
          path.startsWith(allowed)
        );
      }
      return false;
    });

    return {
      count: violated.length,
      paths: violated.map((e) => ({
        stepId: e.stepId,
        path: e.evidence?.path,
        timestamp: e.timestamp,
      })),
    };
  }

  private verifyCredentialUsage(context: ExecutionContext): boolean {
    for (const lease of context.credentialLeases.values()) {
      if (new Date() > lease.expiresAt) {
        return false;
      }
      if (lease.usesRemaining < 0) {
        return false;
      }
    }
    return true;
  }

  private findCredentialViolations(
    context: ExecutionContext
  ): Record<string, unknown> {
    const violations = [];
    for (const [credId, lease] of context.credentialLeases.entries()) {
      if (new Date() > lease.expiresAt) {
        violations.push({
          credentialId: credId,
          reason: "expired",
          expiresAt: lease.expiresAt,
        });
      }
      if (lease.usesRemaining < 0) {
        violations.push({
          credentialId: credId,
          reason: "usage_exhausted",
          usesRemaining: lease.usesRemaining,
        });
      }
    }
    return {
      count: violations.length,
      violations,
    };
  }

  private hashExecution(
    context: ExecutionContext,
    results: StepResult[]
  ): string {
    const data = {
      planId: context.planId,
      executionId: context.executionId,
      planHash: context.planHash,
      steps: results.map((r) => ({
        stepId: r.stepId,
        success: r.success,
      })),
      auditLog: context.auditLog.map((event) => ({
        stepId: event.stepId,
        type: event.type,
        timestamp: event.timestamp.toISOString(),
      })),
    };

    return createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
  }

  generateConformanceCertificate(evidence: ConformanceEvidence): string {
    return `
REMEDIATION CONFORMANCE CERTIFICATE
====================================

Plan ID: ${evidence.planId}
Execution ID: ${evidence.executionId}
Execution Hash: ${evidence.executionHash}

CONFORMANCE CHECKS:
✓ Plan Hash Matches: ${evidence.planHashMatches}
✓ All Steps Completed: ${evidence.allStepsCompleted}
✓ No Unauthorized Commands: ${evidence.noUnauthorizedCommands}
✓ All Paths Whitelisted: ${evidence.allPathsWhitelisted}
✓ Credentials Verified: ${evidence.credentialsVerified}
✓ Audit Trail Complete: ${evidence.auditTrailComplete}

SUMMARY: ${evidence.summary}

This certificate verifies that the remediation plan was executed in conformance
with the approved plan, all access controls were respected, and a complete
audit trail was recorded.
    `.trim();
  }
}
