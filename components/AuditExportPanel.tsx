import React from "react";

type AuditExportFormat = "JSON" | "CSV" | "PDF";
type ExportAvailability = "available" | "planned" | "unsupported";

type AvailableFormat = {
  label: AuditExportFormat;
  availability: ExportAvailability;
};

type AuditExportPanelProps = {
  availableFormats: AvailableFormat[];
  bundleLabel: string;
  exportTimestamp: string;
  packHash?: string;
  demoLabel?: string;
  onExport?: (format: AuditExportFormat) => void;
};

export function AuditExportPanel({ availableFormats, bundleLabel, exportTimestamp, packHash, demoLabel, onExport }: AuditExportPanelProps) {
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Audit evidence export</h3>
        {demoLabel ? <span className="text-xs text-slate-300">Demo data: {demoLabel}</span> : null}
      </div>
      <p className="text-sm text-slate-200">Bundle: {bundleLabel}</p>
      <p className="mt-1 text-xs text-slate-400">Export timestamp: {exportTimestamp}</p>
      <p className="mt-1 text-xs text-slate-400">
        Pack hash: {packHash ? `present (${packHash})` : "missing — export evidence is incomplete"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {availableFormats.map((format) => (
          <button
            type="button"
            key={format.label}
            disabled={format.availability !== "available" || !onExport}
            className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Export ${bundleLabel} as ${format.label}`}
            onClick={() => onExport?.(format.label)}
          >
            {format.availability === "available"
              ? onExport
                ? `Export ${format.label}`
                : `Export ${format.label} (Export not wired)`
              : `${format.label} (${format.availability})`}
          </button>
        ))}
      </div>
    </section>
  );
}
