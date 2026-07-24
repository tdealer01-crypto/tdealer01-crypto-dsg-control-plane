import { createHash } from "crypto";
import type { RemediationPlan, RemediationStep } from "./plan-manager";

export interface ExecutionContext {
  planId: string;
  executionId: string;
  planHash: string;
  allowedCommands: string[];
  allowedPaths: string[];
  credentialLeases: Map<string, CredentialLease>;
  auditLog: ExecutionEvent[];
  startTime: Date;
  timeoutMs: number;
}

export interface CredentialLease {
  id: string;
  credentialId: string;
  credentialType: string;
  issuedAt: Date;
  expiresAt: Date;
  fingerprint: string;
  usesRemaining: number;
  redactedValue?: string;
}

export interface ExecutionEvent {
  timestamp: Date;
  stepId: string;
  type: "started" | "success" | "failed" | "blocked";
  command?: string;
  output?: string;
  error?: string;
  evidence?: Record<string, unknown>;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  evidence: Record<string, unknown>;
}

export class ControlledExecutor {
  async executeStep(
    step: RemediationStep,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      // Check execution timeout
      if (Date.now() - context.startTime.getTime() > context.timeoutMs) {
        throw new Error("Plan execution timeout exceeded");
      }

      // Log execution start
      context.auditLog.push({
        timestamp: new Date(),
        stepId: step.id,
        type: "started",
        evidence: { planHash: context.planHash },
      });

      // Validate step action
      const validationError = this.validateStepAction(step, context);
      if (validationError) {
        throw new Error(validationError);
      }

      // Execute based on action type
      let result: string = "";
      switch (step.action) {
        case "command":
          result = await this.executeCommand(step, context);
          break;
        case "api_call":
          result = await this.executeApiCall(step, context);
          break;
        case "workflow":
          result = await this.executeWorkflow(step, context);
          break;
        default:
          throw new Error(`Unknown action type: ${step.action}`);
      }

      // Log success
      context.auditLog.push({
        timestamp: new Date(),
        stepId: step.id,
        type: "success",
        output: result,
        evidence: { duration: Date.now() - startTime },
      });

      return {
        stepId: step.id,
        success: true,
        output: result,
        duration: Date.now() - startTime,
        evidence: { planHash: context.planHash },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Log failure
      context.auditLog.push({
        timestamp: new Date(),
        stepId: step.id,
        type: "failed",
        error: errorMsg,
        evidence: { duration: Date.now() - startTime },
      });

      return {
        stepId: step.id,
        success: false,
        error: errorMsg,
        duration: Date.now() - startTime,
        evidence: { blocked: true, planHash: context.planHash },
      };
    }
  }

  private validateStepAction(
    step: RemediationStep,
    context: ExecutionContext
  ): string | null {
    if (step.action === "command") {
      const command = step.payload.command as string;
      if (!command) return "Command is required in payload";

      // Check if command is in whitelist
      const isAllowed = context.allowedCommands.some(
        (allowed) => command === allowed || command.startsWith(allowed + " ")
      );

      if (!isAllowed) {
        context.auditLog.push({
          timestamp: new Date(),
          stepId: step.id,
          type: "blocked",
          command,
          evidence: { reason: "Command not whitelisted" },
        });
        return `Command not in whitelist: ${command}`;
      }

      // Validate file paths if present
      if (step.payload.workingDir) {
        const dir = step.payload.workingDir as string;
        const isPathAllowed = context.allowedPaths.some((allowed) =>
          dir.startsWith(allowed)
        );

        if (!isPathAllowed) {
          context.auditLog.push({
            timestamp: new Date(),
            stepId: step.id,
            type: "blocked",
            command,
            evidence: { reason: "Path not whitelisted", path: dir },
          });
          return `Path not whitelisted: ${dir}`;
        }
      }
    }

    // Validate credentials
    if (step.requiredCredentials && step.requiredCredentials.length > 0) {
      for (const credId of step.requiredCredentials) {
        const lease = context.credentialLeases.get(credId);
        if (!lease) {
          return `Credential not available: ${credId}`;
        }

        if (new Date() > lease.expiresAt) {
          return `Credential expired: ${credId}`;
        }

        if (lease.usesRemaining <= 0) {
          return `Credential usage exhausted: ${credId}`;
        }

        // Decrement uses
        lease.usesRemaining--;
      }
    }

    return null;
  }

  private async executeCommand(
    step: RemediationStep,
    context: ExecutionContext
  ): Promise<string> {
    const command = step.payload.command as string;
    const workingDir = (step.payload.workingDir as string) || "/";

    // Simulate command execution (in real implementation, would use child_process)
    // This is a placeholder that would be replaced with actual execution
    return `[simulated] Executed: ${command} in ${workingDir}`;
  }

  private async executeApiCall(
    step: RemediationStep,
    context: ExecutionContext
  ): Promise<string> {
    const endpoint = step.payload.endpoint as string;
    const method = (step.payload.method as string) || "GET";

    // Simulate API call
    return `[simulated] ${method} ${endpoint}`;
  }

  private async executeWorkflow(
    step: RemediationStep,
    context: ExecutionContext
  ): Promise<string> {
    const workflowId = step.payload.workflowId as string;

    // Simulate workflow execution
    return `[simulated] Executed workflow: ${workflowId}`;
  }

  createExecutionContext(
    plan: RemediationPlan,
    credentials: CredentialLease[] = []
  ): ExecutionContext {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const credentialLeases = new Map<string, CredentialLease>();

    credentials.forEach((lease) => {
      credentialLeases.set(lease.credentialId, lease);
    });

    return {
      planId: plan.id,
      executionId,
      planHash: plan.planHash,
      allowedCommands: plan.steps
        .filter((s) => s.action === "command")
        .map((s) => s.payload.command as string),
      allowedPaths: [
        "/var/lib/app",
        "/etc/app",
        "/home/app",
      ], // Example whitelisted paths
      credentialLeases,
      auditLog: [],
      startTime: new Date(),
      timeoutMs: 300000, // 5 minutes default
    };
  }

  hashExecution(executionId: string, steps: StepResult[]): string {
    const data = {
      executionId,
      steps: steps.map((s) => ({
        stepId: s.stepId,
        success: s.success,
      })),
    };

    return createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
  }
}
