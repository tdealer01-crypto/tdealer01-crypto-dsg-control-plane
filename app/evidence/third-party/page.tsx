import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Third-Party Evidence | DSG ONE',
  description:
    'Dated external ecosystem evidence for the legacy DSG Governance Control Plane, with explicit boundaries separating directory signals from current DSG ONE production claims.',
  alternates: { canonical: '/evidence/third-party' },
};

const snapshotMetrics = [
  ['Overall rating', 'Strong · 71/100'],
  ['Community health', '85%'],
  ['Adoption', '27/100'],
  ['Popularity', '45/100'],
  ['Maintenance', '100/100'],
  ['Documentation', '100/100'],
  ['Trust', '100/100'],
  ['Capability', '100/100'],
] as const;

const activityMetrics = [
  ['Copy clicks', '17'],
  ['Copy-click benchmark', 'Top 5% among 78,225 active plugins'],
  ['GitHub stars shown', '11'],
  ['Forks shown', '1'],
  ['Owner status', 'Verified owner'],
  ['Snapshot checked', '19 Sep 2026'],
] as const;

const componentSignals = [
  ['dsg-rca-anal…', 'MCP', '3 views', 'Copy attribution unavailable'],
  ['dsg-monitori…', 'MCP', '2 views', 'Copy attribution unavailable'],
  ['runpod-docs', 'MCP', '2 views', 'Copy attribution unavailable'],
  ['dsg-secrets-…', 'Skill', '2 views', '0 copies'],
  ['dsg-mcp', 'Skill', '1 view', '0 copies'],
] as const;

export default function ThirdPartyEvidencePage() {
  return (
    <main className="min-h-screen bg-[#060914] text-white">
      <section className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-200">External evidence</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-[-0.04em] sm:text-6xl">
            Third-party signals, with the claim boundary visible.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-400 sm:text-lg">
            This page preserves a dated ClaudePluginHub owner-dashboard snapshot for the legacy DSG Governance Control Plane.
            It is historical lineage evidence for the earlier control-plane plugin, not a score for the current DSG ONE /
            DSG Spacetime production runtime.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://www.claudepluginhub.com/top-plugins"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950"
            >
              Open ClaudePluginHub methodology
            </a>
            <a
              href="https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white"
            >
              Open legacy Control Plane source
            </a>
            <Link
              href="/#proof"
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300"
            >
              Current runtime proof
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.07] bg-[#080d18]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.04] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">ClaudePluginHub snapshot</p>
                <h2 className="mt-2 text-2xl font-bold">Legacy DSG Governance Control Plane</h2>
              </div>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
                VERIFIED OWNER
              </span>
            </div>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-400">
              The dashboard snapshot supplied by the verified owner reports a Strong overall rating and full marks in
              maintenance, documentation, trust and capability. ClaudePluginHub is a community-maintained directory and
              states that it is not affiliated with Anthropic.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {snapshotMetrics.map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{label}</p>
                <p className="mt-3 text-xl font-bold text-white">{value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.07]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-200">Engagement evidence</p>
            <h2 className="mt-3 text-3xl font-bold">What the snapshot actually measures.</h2>
            <div className="mt-6 space-y-3">
              {activityMetrics.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-right text-sm font-bold text-slate-100">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-100">Interpretation</p>
            <h2 className="mt-3 text-3xl font-bold">Useful signal, not certification.</h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-400">
              <p>
                ClaudePluginHub explains that copy clicks record clicks on an install/copy action. They are intent signals,
                not verified local installations. Public-repository adoption, stars, maintenance, trending momentum and
                Sparks are separate signals in its ranking system.
              </p>
              <p>
                The Top 5% statement is preserved exactly as a dated dashboard benchmark. Because directory rankings and
                counts change over time, it must not be presented as a permanent rank.
              </p>
              <p>
                No score on this page is transferred to the current DSG ONE runtime. New DSG ONE releases require their
                own production, CI, runtime and external evaluation evidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.07] bg-[#080d18]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-200">Component attention</p>
          <h2 className="mt-3 text-3xl font-bold">What visitors opened in the snapshot period.</h2>
          <div className="mt-7 overflow-hidden rounded-3xl border border-white/[0.07]">
            <div className="hidden grid-cols-[1.4fr_0.6fr_0.6fr_1.4fr] gap-4 border-b border-white/[0.07] bg-white/[0.035] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 sm:grid">
              <span>Component</span><span>Type</span><span>Attention</span><span>Copy signal</span>
            </div>
            {componentSignals.map(([name, type, attention, copy]) => (
              <div key={name} className="grid gap-2 border-b border-white/[0.06] px-5 py-4 last:border-b-0 sm:grid-cols-[1.4fr_0.6fr_0.6fr_1.4fr] sm:gap-4">
                <span className="font-semibold text-white">{name}</span>
                <span className="text-sm text-slate-500">{type}</span>
                <span className="text-sm text-slate-300">{attention}</span>
                <span className="text-sm text-slate-500">{copy}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-600">
            The dashboard explicitly showed “Copy attribution unavailable” for several MCP components, so those rows are
            not interpreted as zero installs.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.04] p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-100">Truth boundary</p>
            <h2 className="mt-3 text-2xl font-bold">What this page does not claim.</h2>
            <ul className="mt-5 space-y-2 text-sm leading-7 text-slate-400">
              <li>• It does not claim Anthropic certification or endorsement.</li>
              <li>• It does not claim 17 verified installations or 17 production users.</li>
              <li>• It does not claim that the legacy 71/100 score is the current DSG ONE score.</li>
              <li>• It does not claim independent security certification or an independent audit of the current production runtime.</li>
            </ul>
            <p className="mt-5 text-sm leading-7 text-slate-500">
              Source boundary: ClaudePluginHub owner-dashboard snapshot supplied on 21 Sep 2026, showing metrics checked
              19 Sep 2026. Public ranking methodology is linked above. Repository provenance remains available in GitHub.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
