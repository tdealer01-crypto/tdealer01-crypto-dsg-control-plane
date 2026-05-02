import React from "react";

export type EvidenceAvailability = "present" | "missing" | "planned" | "unsupported";

type EvidenceField = {
  key: string;
  label: string;
  availability: EvidenceAvailability;
  detail: string;
};

type EvidenceDrawerProps = {
  title?: string;
  fields: EvidenceField[];
  demoLabel?: string;
};

const availabilityClass: Record<EvidenceAvailability, string> = {
  present: "text-emerald-300",
  missing: "text-rose-300",
  planned: "text-amber-300",
  unsupported: "text-slate-300"
};

const availabilitySymbol: Record<EvidenceAvailability, string> = {
  present: "✓",
  missing: "!",
  planned: "?",
  unsupported: "—"
};

export function EvidenceDrawer({ title = "Evidence", fields, demoLabel }: EvidenceDrawerProps) {
  return (
    <aside className="rounded-lg border border-slate-700 bg-slate-900/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {demoLabel ? <span className="text-xs text-slate-300">Demo data: {demoLabel}</span> : null}
      </div>
      <ul className="space-y-2">
        {fields.map((field) => (
          <li key={field.key} className="rounded border border-slate-700 p-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-slate-100">{field.label}</p>
              <span className={`text-xs uppercase ${availabilityClass[field.availability]}`}>
                {availabilitySymbol[field.availability]} {field.availability}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{field.detail}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
