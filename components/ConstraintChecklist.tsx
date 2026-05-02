import React from "react";

export type ConstraintState = "pass" | "fail" | "review";

type ConstraintItem = {
  id: string;
  label: string;
  detail: string;
  state: ConstraintState;
};

type ConstraintChecklistProps = {
  items: ConstraintItem[];
  demoLabel?: string;
};

const stateLabel: Record<ConstraintState, string> = {
  pass: "PASS",
  fail: "BLOCK",
  review: "REVIEW"
};

export function ConstraintChecklist({ items, demoLabel }: ConstraintChecklistProps) {
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Constraints checked</h3>
        {demoLabel ? <span className="text-xs text-slate-300">Demo data: {demoLabel}</span> : null}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded border border-slate-700 p-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-slate-100">{item.label}</p>
              <span className="text-xs font-semibold text-slate-300">{stateLabel[item.state]}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
