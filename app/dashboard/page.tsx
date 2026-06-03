"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Agent = {
  agent_id: string;
  name: string;
  status: string;
  monthly_limit: number;
  usage_this_month: number;
};

type Execution = {
  id: string;
  decision: "ALLOW" | "STABILIZE" | "BLOCK";
  latency_ms: number;
  reason: string | null;
  created_at: string;
};

type UsageSummary = {
  plan: string;
  subscription_status?: string;
  billing_period: string;
  executions: number;
  included_executions: number;
  projected_amount_usd: number;
};

type HealthPayload = {
  ok: boolean;
  core_ok?: boolean;
  core?: { version?: string };
  timestamp?: string;
};

type HermesHealth = {
  configured: boolean;
  provider: string;
  model: string;
  status: string;
};

type OnboardingState = {
  has_agent?: boolean;
  first_run_complete?: boolean;
  next_action?: string;
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/8 ${className}`} />;
}

function dot(ok: boolean | null) {
  if (ok === null) return "bg-slate-600";
  return ok ? "bg-emerald-400" : "bg-red-400";
}

function decisionBadge(d: string) {
  if (d === "BLOCK") return "border-red-400/30 bg-red-500/10 text-red-200";
  if (d === "STABILIZE") return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
}

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const PRODUCTS = [
  { href: "/delivery-proof",       label: "Delivery Proof",       sub: "AI code proof report",           icon: "📄", color: "amber" },
  { href: "/proofgate",            label: "ProofGate",            sub: "Runtime control layer",           icon: "🛡", color: "emerald" },
  { href: "/enterprise-ready",     label: "Enterprise Ready",     sub: "No-migration enterprise setup",   icon: "🏢", color: "blue" },
  { href: "/finance-governance/live", label: "Finance Governance",sub: "Payment & finance controls",      icon: "💰", color: "amber" },
  { href: "/finance-approval-gate",label: "Finance Approval Gate",sub: "AI payment approval pilot",       icon: "✅", color: "emerald" },
  { href: "/automation",           label: "Automation",           sub: "Webhook & workflow automation",   icon: "⚡", color: "violet" },
  { href: "/ai-compliance",        label: "AI Compliance",        sub: "ISO 42001, NIST AI RMF",          icon: "🔒", color: "blue" },
  { href: "/eu-ai-act",            label: "EU AI Act",            sub: "Block before damage, not after",  icon: "🇪🇺", color: "red" },
];

const COLOR_MAP: Record<string, string> = {
  amber:   "border-amber-400/20  bg-amber-400/8  hover:border-amber-400/40",
  emerald: "border-emerald-400/20 bg-emerald-400/8 hover:border-emerald-400/40",
  blue:    "border-blue-400/20   bg-blue-400/8   hover:border-blue-400/40",
  violet:  "border-violet-400/20 bg-violet-400/8 hover:border-violet-400/40",
  red:     "border-red-400/20    bg-red-400/8    hover:border-red-400/40",
};

export default function DashboardPage() {
  const [agents,    setAgents]    = useState<Agent[]>([]);
  const [execs,     setExecs]     = useState<Execution[]>([]);
  const [summary,   setSummary]   = useState<UsageSummary | null>(null);
  const [health,    setHealth]    = useState<HealthPayload | null>(null);
  const [hermes,    setHermes]    = useState<HermesHealth | null>(null);
  const [onboarding,setOnboarding]= useState<OnboardingState | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        fetch("/api/agents",               { cache: "no-store" }).then(r => r.json()),
        fetch("/api/executions?limit=8",   { cache: "no-store" }).then(r => r.json()),
        fetch("/api/usage",                { cache: "no-store" }).then(r => r.json()),
        fetch("/api/health",               { cache: "no-store" }).then(r => r.json()),
        fetch("/api/dsg/brain/execute",    { cache: "no-store" }).then(r => r.json()),
        fetch("/api/onboarding/state",     { cache: "no-store" }).then(r => r.json()),
      ]);

      const [a, e, u, h, hm, ob] = results;
      if (a.status  === "fulfilled") setAgents((a.value?.items ?? []).slice(0, 5));
      if (e.status  === "fulfilled") setExecs(e.value?.executions ?? []);
      if (u.status  === "fulfilled") setSummary(u.value?.summary ?? u.value ?? null);
      if (h.status  === "fulfilled") setHealth(h.value);
      if (hm.status === "fulfilled") setHermes(hm.value);
      if (ob.status === "fulfilled") setOnboarding(ob.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const kpis = useMemo(() => [
    {
      label: "Agents",
      value: loading ? null : String(agents.length),
      sub:   "active",
      href:  "/dashboard/agents",
      color: "emerald",
    },
    {
      label: "Executions",
      value: loading ? null : String(summary?.executions ?? execs.length),
      sub:   summary?.billing_period ?? "this period",
      href:  "/dashboard/executions",
      color: "blue",
    },
    {
      label: "Plan",
      value: loading ? null : (summary?.plan ?? "—"),
      sub:   summary?.subscription_status ?? "",
      href:  "/dashboard/billing",
      color: "amber",
    },
    {
      label: "Spend",
      value: loading ? null : `$${(summary?.projected_amount_usd ?? 0).toFixed(2)}`,
      sub:   "projected",
      href:  "/dashboard/billing",
      color: "slate",
    },
  ], [agents.length, execs.length, loading, summary]);

  const systemRows = [
    { label: "DSG Core",    ok: health  ? (health.core_ok ?? health.ok) : null,                href: "/api/health" },
    { label: "Hermes AI",   ok: hermes  ? hermes.configured && hermes.status === "ready" : null, href: "/dashboard/hermes" },
    { label: "Runtime DB",  ok: health  ? (health.core_ok ?? null) : null,                     href: "/dashboard/executions" },
    { label: "Agent live",  ok: agents.length > 0 ? agents.some(a => a.status === "active") : null, href: "/dashboard/agents" },
  ];

  const onboardingSteps = [
    { label: "Org created",        done: true },
    { label: "Agent connected",    done: Boolean(onboarding?.has_agent) },
    { label: "First execution run", done: Boolean(onboarding?.first_run_complete) },
  ];
  const doneCount = onboardingSteps.filter(s => s.done).length;

  return (
    <main className="min-h-screen bg-[#07080b] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">DSG Control Plane</p>
            <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">Command Center</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/command-center"
              className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-200 transition-colors">
              Command Center
            </Link>
            <button onClick={() => void load()}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-white/20 transition-colors">
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        )}

        {/* ── System status bar ───────────────────────────────────────── */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">System</p>
          {systemRows.map(row => (
            <Link key={row.label} href={row.href}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              <span className={`h-2 w-2 rounded-full ${loading ? "bg-slate-600 animate-pulse" : dot(row.ok)}`} />
              {row.label}
            </Link>
          ))}
          {!loading && hermes && (
            <span className="ml-auto text-[10px] text-slate-600">
              {hermes.provider === "nous-hermes" ? `Hermes ${hermes.model.split("/").pop()?.split("-").slice(0,3).join("-")}` : hermes.model}
            </span>
          )}
        </div>

        {/* ── KPI row ─────────────────────────────────────────────────── */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map(k => (
            <Link key={k.label} href={k.href}
              className="group rounded-2xl border border-white/8 bg-white/[0.025] p-5 hover:border-white/15 transition-colors">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{k.label}</p>
              <div className="mt-3">
                {k.value === null
                  ? <Skeleton className="h-8 w-16" />
                  : <p className="text-3xl font-semibold text-white group-hover:text-amber-200 transition-colors">{k.value}</p>
                }
              </div>
              <p className="mt-1 text-xs text-slate-600">{k.sub}</p>
            </Link>
          ))}
        </div>

        {/* ── Products grid ───────────────────────────────────────────── */}
        <div className="mt-6">
          <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">Products</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PRODUCTS.map(p => (
              <Link key={p.href} href={p.href}
                className={`rounded-2xl border p-4 transition-all ${COLOR_MAP[p.color] ?? COLOR_MAP.amber}`}>
                <span className="text-xl">{p.icon}</span>
                <p className="mt-2 text-sm font-semibold text-slate-100 leading-snug">{p.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{p.sub}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Middle row: onboarding + recent executions ──────────────── */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[340px_1fr]">

          {/* Onboarding */}
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/60">Setup</p>
            <p className="mt-1 text-lg font-semibold text-emerald-50">{doneCount}/3 complete</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
              <div className="h-1.5 rounded-full bg-emerald-300 transition-all duration-500"
                style={{ width: `${Math.round((doneCount / 3) * 100)}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {onboardingSteps.map(s => (
                <li key={s.label} className="flex items-center gap-2.5 text-sm">
                  <span className={`h-4 w-4 rounded-full border text-[9px] flex items-center justify-center font-bold ${s.done ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-300" : "border-white/15 text-transparent"}`}>
                    {s.done ? "✓" : ""}
                  </span>
                  <span className={s.done ? "text-emerald-100" : "text-slate-500"}>{s.label}</span>
                </li>
              ))}
            </ul>
            {!loading && onboarding?.next_action && (
              <p className="mt-4 text-xs text-emerald-300/60">Next: {onboarding.next_action}</p>
            )}
            <Link href={doneCount < 3 ? "/dashboard/skills" : "/dashboard/executions"}
              className="mt-4 inline-block rounded-xl border border-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/10 transition-colors">
              {doneCount < 3 ? "Continue setup →" : "View executions →"}
            </Link>
          </div>

          {/* Recent executions */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Recent decisions</p>
              <Link href="/dashboard/executions" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="mt-4 space-y-2">
                {[1,2,3,4].map(n => <Skeleton key={n} className="h-12 w-full" />)}
              </div>
            ) : execs.length === 0 ? (
              <div className="mt-6 rounded-xl border border-white/8 px-5 py-8 text-center">
                <p className="text-sm font-semibold text-slate-300">No executions yet</p>
                <p className="mt-1 text-xs text-slate-500">Run your first governed action to see decisions here.</p>
                <Link href="/dashboard/integrations"
                  className="mt-3 inline-block rounded-lg border border-emerald-400/20 px-4 py-2 text-xs font-bold text-emerald-300">
                  Set up integration
                </Link>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {execs.map(ex => (
                  <div key={ex.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-black/20 px-4 py-3">
                    <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${decisionBadge(ex.decision)}`}>
                      {ex.decision}
                    </span>
                    <span className="flex-1 truncate font-mono text-xs text-slate-500">{ex.id.slice(0, 20)}…</span>
                    {ex.reason && <span className="hidden truncate text-xs text-slate-500 sm:block max-w-[140px]">{ex.reason}</span>}
                    <span className="shrink-0 text-xs text-slate-600">{ex.latency_ms}ms</span>
                    <span className="shrink-0 text-[10px] text-slate-700">{ago(ex.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom row: agents + hermes ─────────────────────────────── */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">

          {/* Agents */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Active agents</p>
              <Link href="/dashboard/agents"
                className="rounded-lg border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors">
                + New agent
              </Link>
            </div>
            {loading ? (
              <div className="mt-4 space-y-2">
                {[1,2].map(n => <Skeleton key={n} className="h-14 w-full" />)}
              </div>
            ) : agents.length === 0 ? (
              <div className="mt-4 rounded-xl border border-white/8 px-4 py-6 text-center">
                <p className="text-sm text-slate-400">No agents — create one to start governing actions</p>
                <Link href="/dashboard/agents"
                  className="mt-3 inline-block rounded-lg bg-amber-300 px-4 py-1.5 text-xs font-bold text-slate-950">
                  Create agent
                </Link>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {agents.map(a => {
                  const pct = Math.min(100, Math.round((a.usage_this_month / (a.monthly_limit || 1)) * 100));
                  return (
                    <div key={a.agent_id} className="rounded-xl border border-white/6 bg-black/20 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{a.name}</p>
                          <p className="font-mono text-[10px] text-slate-600">{a.agent_id.slice(0, 16)}…</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wide ${
                          a.status === "active" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-slate-600 text-slate-400"
                        }`}>{a.status}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                          <div className={`h-1 rounded-full transition-all ${pct > 80 ? "bg-amber-400" : "bg-emerald-400"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-600">{a.usage_this_month.toLocaleString()} / {a.monthly_limit.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hermes AI status */}
          <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.03] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-violet-300/50">Hermes AI</p>
                <p className="mt-1 text-lg font-semibold text-violet-50">Brain Runtime</p>
              </div>
              {!loading && hermes && (
                <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                  hermes.status === "ready" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                                           : "border-red-400/25 bg-red-400/10 text-red-200"
                }`}>
                  {hermes.status}
                </span>
              )}
            </div>

            {loading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            ) : hermes ? (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between rounded-xl border border-white/6 bg-black/20 px-3 py-2">
                  <span className="text-slate-500">Provider</span>
                  <span className="font-mono text-xs text-violet-200">{hermes.provider}</span>
                </div>
                <div className="flex justify-between rounded-xl border border-white/6 bg-black/20 px-3 py-2">
                  <span className="text-slate-500">Model</span>
                  <span className="font-mono text-[10px] text-violet-200 max-w-[200px] truncate text-right">
                    {hermes.model}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl border border-white/6 bg-black/20 px-3 py-2">
                  <span className="text-slate-500">Configured</span>
                  <span className={`text-xs font-bold ${hermes.configured ? "text-emerald-300" : "text-red-300"}`}>
                    {hermes.configured ? "Yes" : "No — set API key"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Brain status unavailable</p>
            )}

            <div className="mt-4 flex gap-2">
              <Link href="/dashboard/hermes"
                className="rounded-xl border border-violet-400/20 bg-violet-400/8 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-400/15 transition-colors">
                Open Hermes →
              </Link>
              <Link href="/dashboard/dsg-brain"
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors">
                Brain config
              </Link>
            </div>
          </div>

        </div>

        {/* ── Quick links footer ──────────────────────────────────────── */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { href: "/dashboard/audit",       label: "Audit log" },
            { href: "/dashboard/webhooks",    label: "Webhooks" },
            { href: "/dashboard/policies",    label: "Policies" },
            { href: "/dashboard/billing",     label: "Billing" },
            { href: "/dashboard/team",        label: "Team" },
            { href: "/dashboard/breach-signal", label: "Breach Signal" },
            { href: "/dashboard/ledger",      label: "Ledger" },
            { href: "/dashboard/verification",label: "Verification" },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-400 hover:border-white/15 hover:text-slate-200 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
