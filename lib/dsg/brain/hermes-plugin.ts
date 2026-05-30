/**
 * Hermes Plugin Scaffold for DSG Brain.
 * Hermes proposes/remediates plans; all execution goes through Controlled Executor.
 * No direct DB write, no production claim, no raw secret exposure.
 */

import { PlanAttempt, buildPlanAttempt, PlanAttemptInput } from "./plan-attempt";
import {
  ControlledExecutionContext,
  ControlledExecutionResult,
  CredentialBrokerResult,
  buildControlledExecutionContext,
  buildExecutionGrant,
  renewExecutionGrant,
  renewCredentialLease,
  isGrantValid,
  isLeaseValid,
} from "./controlled-executor";
import { checkConformance, ConformanceReport } from "./conformance-gate";
import {
  generatePlanViaLLM,
  remediatePlanViaLLM,
  type LLMPlanRequest,
  type LLMRemediationRequest,
} from "./hermes-llm";
import { sha256Raw } from "./hash-utils";
import {
  saveGrant,
  getAllActiveGrants,
} from "./grant-persistence";
import {
  saveLease,
  getAllActiveLeases,
} from "./lease-persistence";

/**
 * Hermes planning proposal.
 */
export interface HermesPlanProposal {
  /** The proposed plan attempt */
  plan: PlanAttempt;
  /** Human-readable rationale */
  rationale: string;
  /** Risk assessment tags */
  riskTags: string[];
}

/**
 * Hermes remediation proposal when a plan fails conformance.
 */
export interface HermesRemediation {
  /** Original plan that failed */
  originalPlan: PlanAttempt;
  /** Remediated plan attempt */
  remediatedPlan: PlanAttempt;
  /** Description of what was changed */
  changes: string[];
}

/**
 * Hermes plugin configuration.
 */
export interface HermesPluginConfig {
  /** Maximum number of remediation retries */
  maxRemediationAttempts: number;
  /** Default allowed commands whitelist */
  defaultAllowedCommands: string[];
  /** Default allowed paths whitelist */
  defaultAllowedPaths: string[];
  /** Default grant TTL in milliseconds */
  defaultGrantTtlMs: number;
  /** Default max grant renewals */
  defaultMaxRenewals: number;
  /** Grace period for lease/grant expiry in milliseconds */
  gracePeriodMs: number;
}

/**
 * Default Hermes plugin config.
 */
export const DEFAULT_HERMES_CONFIG: HermesPluginConfig = {
  maxRemediationAttempts: 3,
  defaultAllowedCommands: [],
  defaultAllowedPaths: [],
  defaultGrantTtlMs: 5 * 60 * 1000,
  defaultMaxRenewals: 2,
  gracePeriodMs: 30_000,
};

/**
 * Hermes Plugin for DSG Brain.
 * Orchestrates plan proposal and controlled execution.
 */
export class HermesPlugin {
  private config: HermesPluginConfig;

  constructor(config: Partial<HermesPluginConfig> = {}) {
    this.config = { ...DEFAULT_HERMES_CONFIG, ...config };
  }

  /**
   * Propose a plan from raw input.
   * Calls the Anthropic API via server-side key to generate an executable plan.
   * The API key is never exposed in model context or client-side.
   */
  async proposePlan(
    input: PlanAttemptInput,
    userInput?: string,
    allowedCommands?: string[],
    allowedPaths?: string[]
  ): Promise<HermesPlanProposal> {
    try {
      // Use provided overrides or fall back to config defaults
      const commands = allowedCommands ?? this.config.defaultAllowedCommands;
      const paths = allowedPaths ?? this.config.defaultAllowedPaths;

      // Construct LLM request
      const llmRequest: LLMPlanRequest = {
        userInput: userInput || input.canonicalPlan || "Generate a plan",
        allowedCommands: commands,
        allowedPaths: paths,
        policyVersion: input.policyVersion,
        toolManifestHash: input.toolManifestHash,
      };

      // Call Anthropic API to generate plan
      const llmResponse = await generatePlanViaLLM(llmRequest);

      // Build plan attempt with LLM-generated canonical plan
      const planInput: PlanAttemptInput = {
        inputHash: input.inputHash,
        attemptNo: input.attemptNo,
        canonicalPlan: llmResponse.canonicalPlan,
        policyVersion: input.policyVersion,
        invariantVersion: input.invariantVersion,
        toolManifestHash: input.toolManifestHash,
      };

      const plan = buildPlanAttempt(planInput);

      return {
        plan,
        rationale: llmResponse.rationale,
        riskTags: llmResponse.riskTags,
      };
    } catch (err) {
      // If LLM call fails, fall back to scaffold with error annotation
      const errorMsg = (err as Error).message;
      const plan = buildPlanAttempt(input);

      return {
        plan,
        rationale: `Hermes LLM error: ${errorMsg}. Plan not generated.`,
        riskTags: ["llm-error", "fallback"],
      };
    }
  }

  /**
   * Remediate a plan that failed conformance.
   * Calls Anthropic API to fix violations while maintaining intent.
   */
  async remediatePlan(
    original: PlanAttempt,
    conformanceReport: ConformanceReport,
    allowedCommands?: string[],
    allowedPaths?: string[]
  ): Promise<HermesRemediation> {
    try {
      // If no violations, return unchanged
      if (conformanceReport.violations.length === 0) {
        return {
          originalPlan: original,
          remediatedPlan: original,
          changes: [],
        };
      }

      // Use provided overrides or fall back to config defaults
      const commands = allowedCommands ?? this.config.defaultAllowedCommands;
      const paths = allowedPaths ?? this.config.defaultAllowedPaths;

      // Construct LLM remediation request
      const llmRequest: LLMRemediationRequest = {
        originalPlan: original.canonicalPlan,
        violations: conformanceReport.violations,
        allowedCommands: commands,
        allowedPaths: paths,
      };

      // Call Anthropic API to remediate plan
      const llmResponse = await remediatePlanViaLLM(llmRequest);

      // Build remediated plan attempt
      const remediatedInput: PlanAttemptInput = {
        inputHash: original.inputHash,
        attemptNo: original.attemptNo + 1,
        canonicalPlan: llmResponse.remediatedPlan,
        policyVersion: original.policyVersion,
        invariantVersion: original.invariantVersion,
        toolManifestHash: original.toolManifestHash,
      };

      const remediatedPlan = buildPlanAttempt(remediatedInput);

      // Extract change descriptions from violations
      const changeList = conformanceReport.violations.map((v) => v.message);
      changeList.push(`LLM remediation: ${llmResponse.changeDescription}`);

      return {
        originalPlan: original,
        remediatedPlan,
        changes: changeList,
      };
    } catch (err) {
      // If LLM remediation fails, fall back to simple annotation
      const errorMsg = (err as Error).message;
      const remediatedInput: PlanAttemptInput = {
        inputHash: original.inputHash,
        attemptNo: original.attemptNo + 1,
        canonicalPlan: original.canonicalPlan + `\n\n[REMEDIATION FAILED: ${errorMsg}]`,
        policyVersion: original.policyVersion,
        invariantVersion: original.invariantVersion,
        toolManifestHash: original.toolManifestHash,
      };

      return {
        originalPlan: original,
        remediatedPlan: buildPlanAttempt(remediatedInput),
        changes: conformanceReport.violations.map((v) => `[UNRESOLVED] ${v.message}`),
      };
    }
  }

  /**
   * Build a controlled execution context for an approved plan.
   * This is the ONLY way Hermes/OpenHands execution should run.
   * No direct DB write; all changes go through the Controlled Executor.
   */
  buildExecutionContext(
    plan: PlanAttempt,
    credentials: CredentialBrokerResult,
    overrides?: {
      allowedCommands?: string[];
      allowedPaths?: string[];
      ttlMs?: number;
      maxRenewals?: number;
    }
  ): ControlledExecutionContext {
    return buildControlledExecutionContext(
      plan,
      overrides?.allowedCommands ?? this.config.defaultAllowedCommands,
      overrides?.allowedPaths ?? this.config.defaultAllowedPaths,
      credentials,
      overrides?.ttlMs ?? this.config.defaultGrantTtlMs,
      overrides?.maxRenewals ?? this.config.defaultMaxRenewals
    );
  }

  /**
   * Renew execution context grant and leases mid-execution.
   * Useful for long-running tasks to prevent TTL race conditions.
   * Optionally persist to database for recovery on restart.
   */
  async renewExecutionContext(
    ctx: ControlledExecutionContext,
    additionalTtlMs?: number,
    persist: boolean = false
  ): Promise<ControlledExecutionContext> {
    const newGrant = renewExecutionGrant(
      ctx.grant,
      ctx.plan,
      additionalTtlMs ?? this.config.defaultGrantTtlMs
    );

    const newCredentials: CredentialBrokerResult = {
      leases: ctx.credentials.leases.map((lease) =>
        renewCredentialLease(lease, additionalTtlMs ?? this.config.defaultGrantTtlMs)
      ),
      unavailable: ctx.credentials.unavailable,
    };

    const renewed = {
      ...ctx,
      grant: newGrant,
      credentials: newCredentials,
    };

    // Optionally save to database
    if (persist) {
      await this.saveExecutionContext(renewed);
    }

    return renewed;
  }

  /**
   * Validate execution result against the approved plan.
   * Returns conformance report; caller must BLOCK if not approved.
   */
  validateExecution(
    ctx: ControlledExecutionContext,
    result: ControlledExecutionResult
  ): ConformanceReport {
    return checkConformance(ctx, result);
  }

  /**
   * Execute a plan through the Controlled Executor.
   * This scaffold does not call Anthropic live.
   * Production status remains NO-GO until live health/readiness evidence exists.
   */
  async executePlan(
    ctx: ControlledExecutionContext,
    runner: (ctx: ControlledExecutionContext) => Promise<ControlledExecutionResult>
  ): Promise<{ result: ControlledExecutionResult; report: ConformanceReport }> {
    const result = await runner(ctx);
    const report = this.validateExecution(ctx, result);
    return { result, report };
  }

  /**
   * Save execution context (grant + leases) to database for recovery on restart.
   * Only saves if persistence is available.
   */
  async saveExecutionContext(ctx: ControlledExecutionContext): Promise<void> {
    try {
      // Save grant
      await saveGrant(ctx.grant);

      // Save all credential leases
      for (const lease of ctx.credentials.leases) {
        await saveLease(lease);
      }
    } catch (err) {
      console.error("Failed to save execution context:", err);
      throw err;
    }
  }

  /**
   * Restore active execution contexts from database.
   * Called on startup to recover active sessions from previous server instances.
   * Returns grants and leases that are still valid and not expired.
   */
  async restoreActiveContexts(): Promise<{
    grants: Awaited<ReturnType<typeof getAllActiveGrants>>;
    leases: Awaited<ReturnType<typeof getAllActiveLeases>>;
  }> {
    try {
      const [grants, leases] = await Promise.all([
        getAllActiveGrants(),
        getAllActiveLeases(),
      ]);

      return {
        grants,
        leases,
      };
    } catch (err) {
      console.error("Failed to restore active contexts:", err);
      throw err;
    }
  }
}

/**
 * Factory to create a HermesPlugin with environment-derived config.
 */
export function createHermesPlugin(
  env: NodeJS.ProcessEnv = process.env
): HermesPlugin {
  const allowedCommands = env.DSG_HERMES_ALLOWED_COMMANDS
    ? env.DSG_HERMES_ALLOWED_COMMANDS.split(",")
    : [];
  const allowedPaths = env.DSG_HERMES_ALLOWED_PATHS
    ? env.DSG_HERMES_ALLOWED_PATHS.split(",")
    : [];

  return new HermesPlugin({
    defaultAllowedCommands: allowedCommands,
    defaultAllowedPaths: allowedPaths,
  });
}
