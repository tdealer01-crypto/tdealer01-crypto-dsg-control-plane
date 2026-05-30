/**
 * Example: Using the Credential Broker in DSG Brain execution flow.
 * This file demonstrates the integration pattern for real credential brokering.
 *
 * NOT production code — for documentation/example purposes only.
 */

import { HermesPlugin } from "./hermes-plugin";
import { brokerCredentials } from "./credential-broker";
import { PlanAttemptInput } from "./plan-attempt";

/**
 * Example: Execute a plan with real credentials from Supabase.
 *
 * Flow:
 * 1. Hermes proposes a plan (e.g., "Deploy to production")
 * 2. Broker credentials for required secrets (e.g., ANTHROPIC_API_KEY, VERCEL_TOKEN)
 * 3. Build execution context with leased credentials (never raw values)
 * 4. Run the plan through Controlled Executor
 * 5. Validate execution against conformance gates
 *
 * Truth boundary: Only Supabase data is trusted evidence for secret existence.
 */
export async function exampleExecutePlanWithCredentials() {
  // Initialize Hermes plugin
  const hermes = new HermesPlugin({
    defaultAllowedCommands: ["npm", "git", "curl"],
    defaultAllowedPaths: ["/workspace/*"],
  });

  // Step 1: Propose a plan
  const planInput: PlanAttemptInput = {
    inputHash: "hash-of-input",
    attemptNo: 1,
    canonicalPlan: "Deploy to production and run smoke tests",
    policyVersion: "2026-05-30",
    invariantVersion: "1.0",
    toolManifestHash: "hash-of-tools",
  };

  const proposal = await hermes.proposePlan(planInput);
  console.log("Plan proposed:", proposal.plan.planHash);

  // Step 2: Broker credentials
  // These are the secrets required for the plan
  const requiredSecrets = ["ANTHROPIC_API_KEY", "VERCEL_TOKEN", "GITHUB_PAT"];

  try {
    const credentials = await hermes.brokerCredentials(requiredSecrets);

    if (credentials.unavailable.length > 0) {
      console.warn(
        "Missing secrets:",
        credentials.unavailable,
        "Plan cannot proceed without these credentials."
      );
      // In production, this would trigger an alert or manual remediation
    }

    console.log(`Brokered ${credentials.leases.length} credentials`);
    for (const lease of credentials.leases) {
      console.log(`- ${lease.secretName}: lease ID ${lease.leaseId.slice(0, 16)}...`);
      console.log(`  Fingerprint: ${lease.redactionFingerprint.slice(0, 16)}...`);
      console.log(`  Expires in ${(lease.expiresAt - Date.now()) / 1000}s`);
    }

    // Step 3: Build execution context
    // The context contains leases (fingerprints only), NOT raw secrets
    const ctx = hermes.buildExecutionContext(proposal.plan, credentials, {
      ttlMs: 10 * 60 * 1000, // 10 minute execution window
      maxRenewals: 1, // Allow one renewal for long-running tasks
    });

    console.log(
      "Execution context built. Ready to execute with",
      ctx.credentials.leases.length,
      "active leases."
    );

    // Step 4: Execute plan
    // In real code, this would:
    // - Call Controlled Executor with the context
    // - Runner retrieves actual secret values from secure storage (e.g., env vars, vault)
    // - Runner is responsible for NOT leaking secrets in logs, errors, or outputs
    const result = await hermes.executePlan(ctx, async (execCtx) => {
      console.log("Executing plan:", execCtx.plan.canonicalPlan);

      // Example: A runner would use lease IDs to retrieve actual secrets
      // For demonstration:
      // const apiKey = await vault.getSecret(execCtx.credentials.leases[0].leaseId);
      // Then execute commands using that key.

      return {
        success: true,
        planHash: execCtx.plan.planHash,
        executedCommands: [],
        fileChanges: [],
        evidence: [],
      };
    });

    // Step 5: Validate execution
    console.log(
      "Execution result:",
      result.report.approved ? "CONFORMANT" : "NON_CONFORMANT"
    );
    if (!result.report.approved) {
      console.log("Violations:", result.report.violations);
    }
  } catch (error) {
    console.error("Credential brokering failed:", error);
    // In production: log error, alert, trigger manual review
  }
}

/**
 * Example: Preflight validation before plan execution.
 * Check which credentials are available before proposing a plan.
 */
export async function examplePreflightValidation(requiredSecrets: string[]) {
  try {
    const credentials = await brokerCredentials(requiredSecrets);

    const available = credentials.leases.map((l) => l.secretName);
    const missing = credentials.unavailable;

    console.log("Credential preflight validation:");
    console.log("Available:", available);
    console.log("Missing:", missing);

    // Only proceed if all required secrets are available
    if (missing.length === 0) {
      console.log("All credentials available. Plan execution approved.");
      return { approved: true, credentials };
    } else {
      console.log(`Plan blocked: missing credentials: ${missing.join(", ")}`);
      return { approved: false, missingSecrets: missing };
    }
  } catch (error) {
    console.error("Preflight validation failed:", error);
    return { approved: false, error: String(error) };
  }
}

/**
 * Example: Handling credential lease renewal during long-running execution.
 */
export async function exampleExecutionWithLeaseRenewal() {
  const hermes = new HermesPlugin();

  // Assume we already have a context with credentials
  let ctx: any = {}; // Would be populated from earlier steps

  // Monitor lease expiration during execution
  setInterval(() => {
    const now = Date.now();
    for (const lease of ctx.credentials.leases) {
      const timeRemaining = lease.expiresAt - now;

      // If lease expires in less than 1 minute, renew it
      if (timeRemaining < 60_000) {
        console.log(`Lease ${lease.secretName} expiring soon. Renewing...`);
        ctx = hermes.renewExecutionContext(ctx);
        console.log("Execution context renewed.");
        break;
      }
    }
  }, 30_000); // Check every 30 seconds
}

/**
 * Example: Error handling and graceful degradation.
 */
export async function exampleErrorHandling() {
  try {
    const hermes = new HermesPlugin();

    // Attempt to broker credentials
    const creds = await hermes.brokerCredentials([
      "ANTHROPIC_API_KEY",
      "OPTIONAL_FEATURE_KEY",
    ]);

    // Proceed even if some credentials are missing
    const mandatory = ["ANTHROPIC_API_KEY"];
    const optional = ["OPTIONAL_FEATURE_KEY"];

    const missingMandatory = mandatory.filter((s) => creds.unavailable.includes(s));
    const missingOptional = optional.filter((s) => creds.unavailable.includes(s));

    if (missingMandatory.length > 0) {
      throw new Error(
        `Cannot proceed: missing mandatory credentials ${missingMandatory.join(", ")}`
      );
    }

    if (missingOptional.length > 0) {
      console.warn(
        `Running in degraded mode: optional features disabled due to missing credentials`
      );
    }

    console.log("Plan can proceed with available credentials");
  } catch (error) {
    console.error("Error during credential brokering:", error);
    // Log incident, alert on-call, trigger manual review
  }
}
