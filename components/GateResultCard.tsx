import React from "react";
import { GateStatus, StatusBadge } from "./StatusBadge";

type GateResultCardProps = {
  status: GateStatus;
  summary: string;
  reason?: string;
  nextReviewerOrAction?: string;
  ruleRefs?: string[];
  demoLabel?: string;
};

export function GateResultCard({
  status,
  summary,
  reason,
  nextReviewerOrAction,
  ruleRefs = [],
  demoLabel
}: GateResultCardProps) {
  const statusExplanation =
    status === "PASS"
      ? `Passed because ${summary}`
      : status === "BLOCK"
        ? `Blocked because ${reason ?? summary}`
        : status === "REVIEW"
          ? `Review required: ${nextReviewerOrAction ?? "next reviewer not specified"}`
          : `Unsupported because ${reason ?? "required connector or policy capability is unavailable"}`;

  return (
    <article className="rounded-lg border border-slate-700 bg-slate-900/90 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <StatusBadge status={status} explanation={statusExplanation} />
        {demoLabel ? <span className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300">Demo: {demoLabel}</span> : null}
      </div>
      <p className="text-sm text-slate-100">{summary}</p>
      {reason ? <p className="mt-2 text-sm text-slate-300">Reason: {reason}</p> : null}
      {status === "REVIEW" ? (
        <p className="mt-2 text-sm text-amber-200">Next reviewer/action required: {nextReviewerOrAction ?? "TBD"}</p>
      ) : null}
      {ruleRefs.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Rule references</p>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
            {ruleRefs.map((ruleRef) => (
              <li key={ruleRef}>{ruleRef}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
