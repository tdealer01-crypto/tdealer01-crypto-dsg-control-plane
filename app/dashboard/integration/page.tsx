import Link from "next/link";
import { getDSGCoreHealth } from "../../../lib/dsg-core";
import {
  KNOWN_GAPS,
  SOURCE_OF_TRUTH_MAP,
  VERIFIED_FORMAL_CORE,
} from "../../../lib/integration-status";

export const dynamic = "force-dynamic";

function EntryCard({
  title,
  repo,
  role,
}: {
  title: string;
  repo: string;
  role: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm uppercase tracking-[0.15em] text-slate-400">{title}</p>
      <p className="mt-3 text-lg font-semibold text-slate-100">{repo}</p>
      <p className="mt-3 text-sm text-slate-300">{role}</p>
    </div>
  );
}

export default async function IntegrationPage() {
  const core = await getDSGCoreHealth();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">DSG</p>
            <h1 className="mt-2 text-3xl font-semibold">Integration Truth</h1>
            <p className="mt-2 text-slate-400">
              Verified topology for the current DSG product surface, formal core, runtime plane, and audit plane.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">
              Dashboard
            </Link>
            <Link href="/dashboard/audit" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">
              Audit
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <EntryCard
            title="Product Shell"
            repo={SOURCE_OF_TRUTH_MAP.product_shell.repo}
            role={SOURCE_OF_TRUTH_MAP.product_shell.role}
          />
          <EntryCard
            title="Canonical Gate"
            repo={SOURCE_OF_TRUTH_MAP.canonical_gate.repo}
            role={SOURCE_OF_TRUTH_MAP.canonical_gate.role}
          />
          <EntryCard
            title="Runtime"
            repo={SOURCE_OF_TRUTH_MAP.runtime.repo}
            role={SOURCE_OF_TRUTH_MAP.runtime.role}
          />
          <EntryCard
            title="Audit"
            repo={SOURCE_OF_TRUTH_MAP.audit.repo}
            role={SOURCE_OF_TRUTH_MAP.audit.role}
          />
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Canonical Core Health</h2>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
              {core.ok ? "online" : "offline"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <p>Core URL: {core.url}</p>
            <p>Status: {core.ok ? core.status || "ok" : core.error || "unreachable"}</p>
            <p>Version: {core.version || "-"}</p>
            <p>Deterministic: {String("deterministic" in core ? (core as Record<string, unknown>).deterministic : "-")}</p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Verified Formal Core</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <p>Verified: {VERIFIED_FORMAL_CORE.verified ? "yes" : "no"}</p>
            <p>Solver: {VERIFIED_FORMAL_CORE.solver}</p>
            <p>Artifact format: {VERIFIED_FORMAL_CORE.artifact_format}</p>
            <p>Expected result: {VERIFIED_FORMAL_CORE.expected_result}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {VERIFIED_FORMAL_CORE.properties.map((item) => (
              <span key={item} className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h2 className="text-xl font-semibold text-amber-100">Known Gaps</h2>
          <ul className="mt-4 space-y-3 text-sm text-amber-100">
            {KNOWN_GAPS.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
