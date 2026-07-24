import { createHash, randomBytes } from "crypto";

export interface RemediationStep {
  id: string;
  name: string;
  description: string;
  action: string; // command, api_call, workflow
  payload: Record<string, unknown>;
  retries?: number;
  timeout?: number;
  requiredCredentials?: string[];
  onFailure?: "stop" | "continue" | "rollback";
  dependsOn?: string[]; // step IDs
}

export interface RemediationPlan {
  id: string;
  name: string;
  description?: string;
  planType: "automated" | "manual" | "hybrid";
  status: "draft" | "approved" | "active" | "archived";

  // Trigger rules
  triggerAnomalyType?: string;
  triggerSeverityLevel?: string[];
  triggerConfidenceThreshold?: number;

  // Plan definition
  steps: RemediationStep[];
  planHash: string;

  // Execution settings
  requiresApproval: boolean;
  autoExecute: boolean;
  rollbackOnFailure: boolean;
  maxConcurrentExecutions: number;

  // Success/failure criteria
  successCriteria?: Record<string, unknown>;
  failureActions?: Array<{
    condition: string;
    action: string;
    payload: Record<string, unknown>;
  }>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface PlanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class PlanManager {
  createPlan(input: Omit<RemediationPlan, "id" | "planHash" | "createdAt" | "updatedAt">): RemediationPlan {
    const id = `plan-${Date.now()}-${randomBytes(6).toString('hex')}`;
    const planHash = this.hashPlan(input.steps);

    return {
      ...input,
      id,
      planHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  validatePlan(plan: RemediationPlan): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!plan.name || plan.name.trim().length === 0) {
      errors.push("Plan name is required");
    }

    if (!plan.steps || plan.steps.length === 0) {
      errors.push("Plan must contain at least one step");
    }

    if (!plan.planType) {
      errors.push("Plan type is required");
    }

    // Validate steps
    const stepIds = new Set<string>();
    plan.steps.forEach((step, index) => {
      if (!step.id) {
        errors.push(`Step ${index}: ID is required`);
      } else {
        stepIds.add(step.id);
      }

      if (!step.name) {
        errors.push(`Step ${index}: Name is required`);
      }

      if (!step.action) {
        errors.push(`Step ${index}: Action is required`);
      }

      // Validate dependencies
      if (step.dependsOn && step.dependsOn.length > 0) {
        step.dependsOn.forEach((depId) => {
          if (!stepIds.has(depId)) {
            errors.push(`Step ${step.id}: Dependency '${depId}' not found`);
          }
        });
      }

      // Warn about timeouts
      if (!step.timeout) {
        warnings.push(`Step ${step.id}: No timeout specified (recommended: set timeout)`);
      }

      // Warn about retries
      if (step.retries === undefined) {
        warnings.push(`Step ${step.id}: No retry count specified (default: 0)`);
      }
    });

    // Detect circular dependencies
    if (this.hasCircularDependencies(plan.steps)) {
      errors.push("Plan has circular dependencies between steps");
    }

    // Validate trigger configuration
    if (
      !plan.triggerAnomalyType &&
      (!plan.triggerSeverityLevel || plan.triggerSeverityLevel.length === 0)
    ) {
      warnings.push(
        "No trigger rules configured; plan will require manual execution"
      );
    }

    // Validate settings consistency
    if (plan.autoExecute && plan.requiresApproval) {
      warnings.push(
        "Plan has both autoExecute=true and requiresApproval=true; approval takes precedence"
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  updatePlan(plan: RemediationPlan): RemediationPlan {
    const validation = this.validatePlan(plan);
    if (!validation.isValid) {
      throw new Error(
        `Plan validation failed: ${validation.errors.join("; ")}`
      );
    }

    const updatedPlan = {
      ...plan,
      planHash: this.hashPlan(plan.steps),
      updatedAt: new Date(),
    };

    return updatedPlan;
  }

  private hasCircularDependencies(steps: RemediationStep[]): boolean {
    const graph = new Map<string, string[]>();
    const visited = new Set<string>();
    const recStack = new Set<string>();

    steps.forEach((step) => {
      graph.set(step.id, step.dependsOn || []);
    });

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const stepId of graph.keys()) {
      if (!visited.has(stepId)) {
        if (hasCycle(stepId)) {
          return true;
        }
      }
    }

    return false;
  }

  hashPlan(steps: RemediationStep[]): string {
    const stepsSerialized = steps
      .map((step) => JSON.stringify({ id: step.id, action: step.action, payload: step.payload }))
      .join("|");

    return createHash("sha256")
      .update(stepsSerialized)
      .digest("hex");
  }

  verifyPlanHash(plan: RemediationPlan): boolean {
    const currentHash = this.hashPlan(plan.steps);
    return currentHash === plan.planHash;
  }

  getExecutionOrder(steps: RemediationStep[]): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return;
      if (visiting.has(stepId)) {
        throw new Error(`Circular dependency detected for step ${stepId}`);
      }

      visiting.add(stepId);

      const step = steps.find((s) => s.id === stepId);
      if (step && step.dependsOn) {
        step.dependsOn.forEach((depId) => visit(depId));
      }

      visiting.delete(stepId);
      visited.add(stepId);
      order.push(stepId);
    };

    steps.forEach((step) => visit(step.id));
    return order;
  }
}
