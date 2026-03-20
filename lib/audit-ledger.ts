import crypto from "crypto";

export type AuditLedgerEntryInput = {
  agent: string;
  action_type: string;
  prev_state?: Record<string, unknown> | null;
  next_state?: Record<string, unknown> | null;
  decision: "ALLOW" | "STABILIZE" | "BLOCK";
  reason: string;
  phase: "UNITY" | "TUNING" | "CHAOS";
  drift: number;
  stability: number;
  harmonic_center: number;
  entropy: number;
  hash_prev?: string | null;
};

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stable).join(",") + "]";
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return "{" + entries.map(([k, v]) => JSON.stringify(k) + ":" + stable(v)).join(",") + "}";
}

export function buildLedgerEntry(input: AuditLedgerEntryInput) {
  const timestamp = new Date().toISOString();

  const body = {
    agent: input.agent,
    action_type: input.action_type,
    prev_state: input.prev_state ?? null,
    next_state: input.next_state ?? null,
    decision: input.decision,
    reason: input.reason,
    phase: input.phase,
    drift: input.drift,
    stability: input.stability,
    harmonic_center: input.harmonic_center,
    entropy: input.entropy,
    timestamp,
    hash_prev: input.hash_prev ?? null
  };

  const hash = crypto
    .createHash("sha256")
    .update(`${body.hash_prev ?? ""}:${stable(body)}`)
    .digest("hex");

  return {
    ...body,
    hash
  };
}
