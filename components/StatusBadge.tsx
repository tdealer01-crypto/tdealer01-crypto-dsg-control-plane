import React from "react";

export type GateStatus = "PASS" | "BLOCK" | "REVIEW" | "UNSUPPORTED";

type StatusBadgeProps = {
  status: GateStatus;
  explanation: string;
  className?: string;
};

const STYLES: Record<GateStatus, string> = {
  PASS: "border-emerald-400/50 bg-emerald-900/30 text-emerald-100",
  BLOCK: "border-rose-400/60 bg-rose-900/30 text-rose-100",
  REVIEW: "border-amber-400/60 bg-amber-900/30 text-amber-100",
  UNSUPPORTED: "border-slate-500/60 bg-slate-800 text-slate-200"
};

export function StatusBadge({ status, explanation, className }: StatusBadgeProps) {
  return (
    <div className={`inline-flex items-start gap-2 rounded-md border px-3 py-2 ${STYLES[status]} ${className ?? ""}`}>
      <span className="text-xs font-semibold tracking-wide">{status}</span>
      <span className="text-xs leading-5">{explanation}</span>
    </div>
  );
}
