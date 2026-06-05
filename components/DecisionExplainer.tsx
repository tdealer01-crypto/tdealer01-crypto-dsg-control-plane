"use client";

import Link from "next/link";
import OnboardingMascot, { type MascotPose } from "./OnboardingMascot";

/**
 * DecisionExplainer — turns a raw gate decision into a plain-language summary
 * of what happened, why, and what to do next.
 *
 * Evidence-first: it only states what the data actually carries (decision,
 * reason, policy version, and an optional risk/stability score). It never
 * invents thresholds or outcomes. The raw evidence stays visible alongside it;
 * this is the human-readable layer on top, not a replacement.
 */

type DecisionKind = "ALLOW" | "STABILIZE" | "BLOCK" | "UNKNOWN";

type Props = {
  decision?: string | null;
  reason?: string | null;
  policyVersion?: string | null;
  /** Optional risk/stability score from the runtime ledger, when available. */
  riskScore?: number | null;
  className?: string;
};

function classify(decision?: string | null): DecisionKind {
  const d = String(decision || "").toUpperCase();
  if (["ALLOW", "PASS", "ALLOWED"].includes(d)) return "ALLOW";
  if (["STABILIZE", "REVIEW", "NEEDS_REVIEW", "MANUAL_REVIEW"].includes(d))
    return "STABILIZE";
  if (["BLOCK", "FREEZE", "BLOCKED", "DENY", "DENIED"].includes(d))
    return "BLOCK";
  return "UNKNOWN";
}

type Copy = {
  pose: MascotPose;
  border: string;
  badge: string;
  headline: string;
  body: string;
  actions: { href: string; label: string; primary?: boolean }[];
};

function copyFor(kind: DecisionKind): Copy {
  switch (kind) {
    case "ALLOW":
      return {
        pose: "thumbsUp",
        border: "border-emerald-400/30 bg-emerald-400/5",
        badge: "bg-emerald-400/15 text-emerald-200",
        headline: "Allowed — the action ran",
        body: "This action passed the gate because its risk was within your policy bounds. Nothing to do — it's recorded with a tamper-evident stamp in the audit trail.",
        actions: [{ href: "/dashboard/audit", label: "View audit trail" }],
      };
    case "STABILIZE":
      return {
        pose: "pointing",
        border: "border-sky-400/30 bg-sky-400/5",
        badge: "bg-sky-400/15 text-sky-200",
        headline: "Flagged for review — not blocked",
        body: "This action wasn't blocked, but it sat above the safe threshold, so the gate held it for guardrails or approval before it's fully trusted. Review it, then approve or tighten the policy.",
        actions: [
          { href: "/dashboard/approvals", label: "Review approvals", primary: true },
          { href: "/dashboard/policies", label: "Tune policy" },
        ],
      };
    case "BLOCK":
      return {
        pose: "blocked",
        border: "border-rose-400/30 bg-rose-400/5",
        badge: "bg-rose-400/15 text-rose-200",
        headline: "Blocked before it could run",
        body: "The gate stopped this action before execution — nothing happened downstream. This is the control plane working as intended. If this action should be allowed, adjust the policy; otherwise keep it blocked and check the evidence.",
        actions: [
          { href: "/dashboard/policies", label: "Adjust policy", primary: true },
          { href: "/dashboard/audit", label: "Open audit" },
        ],
      };
    default:
      return {
        pose: "idle",
        border: "border-white/10 bg-white/[0.03]",
        badge: "bg-white/10 text-slate-300",
        headline: "Decision recorded",
        body: "This action passed through the runtime gate. See the evidence below for the recorded decision and reason.",
        actions: [{ href: "/dashboard/audit", label: "View audit trail" }],
      };
  }
}

export function DecisionExplainer({
  decision,
  reason,
  policyVersion,
  riskScore,
  className,
}: Props) {
  const kind = classify(decision);
  const c = copyFor(kind);
  const hasRisk = typeof riskScore === "number" && Number.isFinite(riskScore);

  return (
    <div className={`rounded-2xl border p-4 ${c.border} ${className ?? ""}`}>
      <div className="flex items-start gap-4">
        <OnboardingMascot pose={c.pose} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${c.badge}`}>
              {String(decision || "—").toUpperCase()}
            </span>
            <h3 className="text-sm font-bold text-white">{c.headline}</h3>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-slate-300">{c.body}</p>

          {/* Real evidence carried by this decision */}
          <dl className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
            {reason ? (
              <div className="sm:col-span-2">
                <dt className="inline font-semibold text-slate-400">Reason: </dt>
                <dd className="inline text-slate-200">{reason}</dd>
              </div>
            ) : null}
            {hasRisk ? (
              <div>
                <dt className="inline font-semibold text-slate-400">Risk/stability score: </dt>
                <dd className="inline text-slate-200">{riskScore!.toFixed(2)}</dd>
              </div>
            ) : null}
            {policyVersion ? (
              <div>
                <dt className="inline font-semibold text-slate-400">Policy version: </dt>
                <dd className="inline text-slate-200">{policyVersion}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            {c.actions.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className={
                  a.primary
                    ? "rounded-xl bg-amber-300 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-200"
                    : "rounded-xl border border-white/15 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:border-white/30"
                }
              >
                {a.label} →
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DecisionExplainer;
