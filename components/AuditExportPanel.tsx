import React from "react";

type AuditExportFormat = "JSON" | "CSV" | "PDF";

type AuditExportPanelProps = {
  availableFormats: AuditExportFormat[];
  bundleLabel: string;
  exportTimestamp: string;
  packHash?: string;
  demoLabel?: string;
};

export function AuditExportPanel({ availableFormats, bundleLabel, exportTimestamp, packHash, demoLabel }: AuditExportPanelProps) {
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Audit evidence export</h3>
        {demoLabel ? <span className="text-xs text-slate-300">Demo data: {demoLabel}</span> : null}
      </div>
      <p className="text-sm text-slate-200">Bundle: {bundleLabel}</p>
      <p className="mt-1 text-xs text-slate-400">Export timestamp: {exportTimestamp}</p>
      <p className="mt-1 text-xs text-slate-400">Pack hash: {packHash ?? "missing"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {availableFormats.map((format) => (
          <button
            type="button"
            key={format}
            className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200"
            aria-label={`Export ${bundleLabel} as ${format}`}
          >
            Export {format}
          </button>
        ))}
      </div>
    </section>
  );
}
