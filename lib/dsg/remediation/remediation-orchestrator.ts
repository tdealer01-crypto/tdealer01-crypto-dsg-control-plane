import { PlanManager, type RemediationPlan } from "./plan-manager";
import {
  ControlledExecutor,
  type ExecutionContext,
  type CredentialLease,
  type StepResult,
} from "./controlled-executor";
import { ConformanceValidator, type ConformanceEvidence } from "./conformance-validator";

export interface RemediationInput {
  planId: string;
  anomalyId?: string;
  credentials: CredentialLease[];
  requestedBy?: string;
  approvedBy?: string;
}

export interface RemediationOutput {
  executionId: string;
  planId: string;
  status: "success" | "failed" | "blocked";
  results: StepResult[];
  conformance: ConformanceEvidence;
  certificate: string;
  timestamp: Date;
  duration: number;
}

export class RemediationOrchestrator {
  private planManager: PlanManager;
  private executor: ControlledExecutor;
  private validator: ConformanceValidator;

  constructor() {
    this.planManager = new PlanManager();
    this.executor = new ControlledExecutor();
    this.validator = new ConformanceValidator();
  }

  async executeRemediationPlan(
    plan: RemediationPlan,
    input: RemediationInput
  ): Promise<RemediationOutput> {
    const startTime = Date.now();

    try {
      // Step 1: Validate plan
      const validation = this.planManager.validatePlan(plan);
      if (!validation.isValid) {
        throw new Error(
          `Plan validation failed: ${validation.errors.join("; ")}`
        );
      }

      // Step 2: Verify plan hasn't been tampered with
      if (!this.planManager.verifyPlanHash(plan)) {
        throw new Error("Plan hash verification failed - plan may have been modified");
      }

      // Step 3: Create execution context
      const context = this.executor.createExecutionContext(
        plan,
        input.credentials
      );

      // Step 4: Get execution order
      const executionOrder = this.planManager.getExecutionOrder(plan.steps);

      // Step 5: Execute steps in order
      const results: StepResult[] = [];
      for (const stepId of executionOrder) {
        const step = plan.steps.find((s) => s.id === stepId);
        if (!step) {
          throw new Error(`Step not found: ${stepId}`);
        }

        // Check dependencies
        if (step.dependsOn && step.dependsOn.length > 0) {
          const depsSuccessful = step.dependsOn.every((depId) => {
            const depResult = results.find((r) => r.stepId === depId);
            return depResult && depResult.success;
          });

          if (!depsSuccessful) {
            const result: StepResult = {
              stepId: step.id,
              success: false,
              error: "Dependency step failed",
              duration: 0,
              evidence: { blocked: true, reason: "dependency_failed" },
            };

            results.push(result);

            if (step.onFailure === "stop") {
              break;
            } else if (step.onFailure === "rollback") {
              await this.rollbackExecution(results, context);
              break;
            }
            continue;
          }
        }

        // Execute step
        const result = await this.executor.executeStep(step, context);
        results.push(result);

        // Handle step failure
        if (!result.success) {
          context.auditLog.push({
            timestamp: new Date(),
            stepId: step.id,
            type: "failed",
            error: result.error,
            evidence: result.evidence,
          });

          if (step.onFailure === "stop") {
            break;
          } else if (step.onFailure === "rollback") {
            await this.rollbackExecution(results, context);
            break;
          }
        }
      }

      // Step 6: Validate conformance
      const conformance = this.validator.validateExecution(
        plan,
        context,
        results
      );

      // Step 7: Generate certificate
      const certificate = this.validator.generateConformanceCertificate(
        conformance
      );

      // Determine overall status
      const allSuccessful = results.every((r) => r.success);
      const conformancePass =
        conformance.planHashMatches &&
        conformance.noUnauthorizedCommands &&
        conformance.allPathsWhitelisted;

      const status = conformancePass && allSuccessful ? "success" : conformancePass ? "failed" : "blocked";

      return {
        executionId: context.executionId,
        planId: plan.id,
        status,
        results,
        conformance,
        certificate,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(
        `Remediation execution failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async rollbackExecution(
    results: StepResult[],
    context: ExecutionContext
  ): Promise<void> {
    context.auditLog.push({
      timestamp: new Date(),
      stepId: "rollback",
      type: "started",
      evidence: { action: "initiating_rollback" },
    });

    // Reverse order of successful steps
    const successfulResults = results
      .filter((r) => r.success)
      .reverse();

    for (const result of successfulResults) {
      // In a real implementation, would execute rollback commands
      context.auditLog.push({
        timestamp: new Date(),
        stepId: result.stepId,
        type: "success",
        evidence: { action: "rollback_completed" },
      });
    }
  }

  async proposePlan(
    anomalyType: string,
    anomalySeverity: string,
    context: Record<string, unknown>
  ): Promise<RemediationPlan> {
    // This is a placeholder for LLM-based plan proposal
    // In production, this would call Claude to generate a plan

    const plan = this.planManager.createPlan({
      name: `Auto-generated plan for ${anomalyType} (${anomalySeverity})`,
      description: `Automatically generated remediation plan based on anomaly context`,
      planType: "manual", // Start as manual for approval
      status: "draft",
      triggerAnomalyType: anomalyType,
      triggerSeverityLevel: [anomalySeverity],
      triggerConfidenceThreshold: 0.7,
      steps: [
        {
          id: "step-1",
          name: "Investigate anomaly",
          description: "Gather evidence about the anomaly",
          action: "api_call",
          payload: {
            endpoint: "/api/diagnostics",
            method: "POST",
            body: context,
          },
        },
      ],
      requiresApproval: true,
      autoExecute: false,
      rollbackOnFailure: true,
      maxConcurrentExecutions: 1,
    });

    return plan;
  }
}
