import { createHash } from "crypto";
import type { EvidencePayload, StepResult } from "./types";

export class EvidenceRecorder {
  private previousHash: string | null = null;

  recordStepEvidence(
    submissionId: string,
    stepNumber: number,
    action: string,
    stepResult: StepResult,
    stepTarget: string,
  ): EvidencePayload {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const evidenceJson = {
      step: stepNumber,
      action,
      timestamp: new Date().toISOString(),
      duration: stepResult.duration,
      success: stepResult.success,
      screenshot: stepResult.screenshot,
      formData: stepResult.formData ? this.sanitizeFormData(stepResult.formData) : undefined,
      result: {
        success: stepResult.success,
        error: stepResult.error,
        errorCode: stepResult.errorCode,
      },
    };

    const eventContent = JSON.stringify({
      eventId,
      jobId: submissionId,
      tool: "stripe_app_submission",
      action,
      target: stepTarget,
      evidence: evidenceJson,
      previousHash: this.previousHash,
    });

    const eventHash = createHash("sha256").update(eventContent).digest("hex");

    const evidence: EvidencePayload = {
      eventId,
      jobId: submissionId,
      tool: "stripe_app_submission",
      action,
      target: stepTarget,
      decision: stepResult.success ? "ALLOW" : "BLOCK",
      reason: stepResult.success ? `Step ${stepNumber} completed` : stepResult.error || "Unknown error",
      evidenceJson,
      previousHash: this.previousHash,
      eventHash,
      createdAt: new Date().toISOString(),
    };

    this.previousHash = eventHash;
    return evidence;
  }

  private sanitizeFormData(formData: Record<string, any>): Record<string, any> {
    const sensitive = ["password", "secret", "token", "key", "credit_card", "ssn"];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(formData)) {
      const lowerKey = key.toLowerCase();
      if (sensitive.some((s) => lowerKey.includes(s))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "string") {
        sanitized[key] = value.substring(0, 100);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  getHashChain(): string[] {
    return this.previousHash ? [this.previousHash] : [];
  }

  reset(): void {
    this.previousHash = null;
  }
}

export async function persistEvidenceToAudit(
  evidence: EvidencePayload,
  supabaseAdmin: any,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin.from("agi_action_audit").insert({
      id: evidence.eventId,
      org_id: "dsg-stripe-submission",
      plan_id: evidence.jobId,
      tool_name: evidence.tool,
      action: evidence.action,
      mode: "submission",
      decision: evidence.decision,
      actor_id: "stripe-browser-agent",
      actor_role: "agent_operator",
      risk: "medium",
      status: "recorded",
      request_hash: null,
      decision_hash: null,
      record_hash: evidence.eventHash,
      audit_token: `sat_${Date.now()}`,
      input: evidence.evidenceJson,
      result: { ok: evidence.decision === "ALLOW" },
      constraints: {
        decision: evidence.decision,
        expiresInSeconds: 86400,
      },
      created_at: evidence.createdAt,
      updated_at: evidence.createdAt,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
