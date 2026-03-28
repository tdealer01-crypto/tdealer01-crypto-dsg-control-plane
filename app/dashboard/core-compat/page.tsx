import Link from "next/link";
import { getDSGCoreCompatibility } from "../../../lib/core-compat";

export const dynamic = "force-dynamic";

export default async function CoreCompatPage() {
  const compatibility = await getDSGCoreCompatibility();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">DSG</p>
            <h1 className="mt-2 text-3xl font-semibold">Core Compatibility</h1>
            <p className="mt-2 text-slate-400">
              Read-only probe of the current DSG core target to identify which endpoint profile is actually reachable.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/integration" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">
              Integration Truth
            </Link>
            <Link href="/dashboard" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">
              Dashboard
            </Link>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Target</h2>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
              {compatibility.inferred.profile}
            </span>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <p>Target URL: {compatibility.target_url}</p>
            <p>Inference reason: {compatibility.inferred.reason}</p>
            <p>Recommended health path: {compatibility.inferred.recommended_paths.health || "-"}</p>
            <p>Recommended execute path: {compatibility.inferred.recommended_paths.execute || "-"}</p>
            <p>Recommended ledger path: {compatibility.inferred.recommended_paths.ledger || "-"}</p>
            <p>Recommended metrics path: {compatibility.inferred.recommended_paths.metrics || "-"}</p>
          </div>
          <p className="mt-4 text-sm text-slate-400">{compatibility.note}</p>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Read Probes</h2>
          <div className="mt-4 space-y-3">
            {compatibility.probes.map((probe) => (
              <div key={probe.path} className="rounded-xl border border-slate-800 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{probe.path}</p>
                    <p className="mt-1 text-sm text-slate-400">Status: {probe.status ?? "unreachable"}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                    {probe.ok ? "ok" : "missing"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-300">
                  <p>Error: {probe.error || "-"}</p>
                  <p>Keys: {probe.keys.length > 0 ? probe.keys.join(", ") : "-"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
