"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { MetricsSummary } from "@/components/monitoring";
import SupportQueueWidget from "@/components/SupportQueueWidget";

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
  db_ok?: boolean;
  core?: { version?: string; status?: string };
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
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />;
}

function statusDot(ok: boolean | null) {
  if (ok === null) return "bg-slate-600";
  return ok ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]";
}

function decisionBadge(d: string) {
  if (d === "BLOCK") return "border-red-400/30 bg-red-500/10 text-red-300";
  if (d === "STABILIZE") return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s} วินาทีที่แล้ว`;
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(s / 86400)} วันที่แล้ว`;
}

const PRODUCTS = [
  { href: "/delivery-proof", label: "Delivery Proof", sub: "รายงานการพิสูจน์โค้ด AI", icon: "📄", color: "amber" },
  { href: "/proofgate", label: "ProofGate", sub: "เลเยอร์ควบคุมรันไทม์", icon: "🛡", color: "emerald" },
  { href: "/enterprise-ready", label: "Enterprise Ready", sub: "ตั้งค่าองค์กรไม่ต้องย้าย", icon: "🏢", color: "blue" },
  { href: "/finance-governance/live", label: "Finance Governance", sub: "ควบคุมการชำระเงิน", icon: "💰", color: "amber" },
  { href: "/finance-approval-gate", label: "Finance Approval Gate", sub: "ทดลองอนุมัติการชำระด้วย AI", icon: "✅", color: "emerald" },
  { href: "/automation", label: "Automation", sub: "Webhook และ workflow อัตโนมัติ", icon: "⚡", color: "violet" },
  { href: "/ai-compliance", label: "AI Compliance", sub: "ISO 42001, NIST AI RMF", icon: "🔒", color: "blue" },
  { href: "/eu-ai-act", label: "EU AI Act", sub: "บล็อกก่อนเกิดความเสียหาย", icon: "🇪🇺", color: "red" },
];

const COLOR_MAP: Record<string, string> = {
  amber: "border-amber-400/20 bg-amber-400/[0.06] hover:border-amber-400/40 hover:bg-amber-400/[0.1]",
  emerald: "border-emerald-400/20 bg-emerald-400/[0.06] hover:border-emerald-400/40 hover:bg-emerald-400/[0.1]",
  blue: "border-blue-400/20 bg-blue-400/[0.06] hover:border-blue-400/40 hover:bg-blue-400/[0.1]",
  violet: "border-violet-400/20 bg-violet-400/[0.06] hover:border-violet-400/40 hover:bg-violet-400/[0.1]",
  red: "border-red-400/20 bg-red-400/[0.06] hover:border-red-400/40 hover:bg-red-400/[0.1]",
};

const KPI_COLORS: Record<string, { border: string; text: string; glow: string }> = {
  emerald: { border: "border-emerald-400/20", text: "text-emerald-400", glow: "shadow-emerald-500/10" },
  blue: { border: "border-blue-400/20", text: "text-blue-400", glow: "shadow-blue-500/10" },
  amber: { border: "border-amber-400/20", text: "text-amber-400", glow: "shadow-amber-500/10" },
  violet: { border: "border-violet-400/20", text: "text-violet-400", glow: "shadow-violet-500/10" },
};

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [execs, setExecs] = useState<Execution[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [hermes, setHermes] = useState<HermesHealth | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        fetch("/api/agents", { cache: "no-store", credentials: "include" }).then((r) => r.json()),
        fetch("/api/executions?limit=8", { cache: "no-store", credentials: "include" }).then((r) => r.json()),
        fetch("/api/usage", { cache: "no-store", credentials: "include" }).then((r) => r.json()),
        fetch("/api/health", { cache: "no-store", credentials: "include" }).then((r) => r.json()),
        fetch("/api/dsg/brain/execute", { cache: "no-store", credentials: "include" }).then((r) => r.json()),
        fetch("/api/onboarding/state", { cache: "no-store", credentials: "include" }).then((r) => r.json()),
      ]);

      const [a, e, u, h, hm, ob] = results;
      if (a.status === "fulfilled") setAgents((a.value?.items ?? []).slice(0, 5));
      if (e.status === "fulfilled") setExecs(e.value?.executions ?? []);
      if (u.status === "fulfilled") setSummary(u.value?.summary ?? u.value ?? null);
      if (h.status === "fulfilled") setHealth(h.value);
      if (hm.status === "fulfilled") setHermes(hm.value);
      if (ob.status === "fulfilled") setOnboarding(ob.value);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeAgents = useMemo(() => agents.filter((a) => a.status === "active").length, [agents]);

  const kpis = useMemo(() => [
    {
      label: "ตัวแทนที่ใช้งาน",
      value: loading ? null : String(activeAgents),
      sub: `จากทั้งหมด ${agents.length} ตัวแทน`,
      href: "/dashboard/agents",
      color: "emerald" as const,
      icon: "🤖",
    },
    {
      label: "การดำเนินการทั้งหมด",
      value: loading ? null : String(summary?.executions ?? execs.length),
      sub: summary?.billing_period ?? "งวดปัจจุบัน",
      href: "/dashboard/executions",
      color: "blue" as const,
      icon: "⚙️",
    },
    {
      label: "สถานะ Core",
      value: loading ? null : (health?.core_ok ? "ปกติ" : "ผิดปกติ"),
      sub: health?.core?.version ?? "ไม่ทราบเวอร์ชัน",
      href: "/api/health",
      color: "amber" as const,
      icon: "🔌",
    },
    {
      label: "สถานะฐานข้อมูล",
      value: loading ? null : (health?.db_ok ? "เชื่อมต่อ" : "ขาดการเชื่อมต่อ"),
      sub: health?.db_ok ? "Supabase Online" : "ตรวจสอบการเชื่อมต่อ",
      href: "/dashboard/executions",
      color: "violet" as const,
      icon: "🗄️",
    },
  ], [activeAgents, agents.length, execs.length, loading, summary, health]);

  const systemHealth = useMemo(() => {
    if (loading) return null;
    const coreOk = health?.core_ok ?? false;
    const dbOk = health?.db_ok ?? false;
    const hermesOk = hermes?.configured && hermes?.status === "ready";
    const allGood = coreOk && dbOk && hermesOk;
    const score = [coreOk, dbOk, hermesOk].filter(Boolean).length;
    return { allGood, score, total: 3 };
  }, [loading, health, hermes]);

  const onboardingSteps = [
    { label: "สร้างองค์กร", done: true, href: "/dashboard/settings/go-live", ring: "white" },
    { label: "เชือมต่อตัวแทน", done: Boolean(onboarding?.has_agent), href: "/dashboard/agents", ring: "blue" },
    { label: "รันการดำเนินการครั้งแรก", done: Boolean(onboarding?.first_run_complete), href: "/delivery-proof", ring: "purple" },
    { label: "เปิดใช้งาน Ring Hermes", done: systemHealth?.allGood ?? false, href: "/dashboard/hermes", ring: "green" },
  ];
  const doneCount = onboardingSteps.filter((s) => s.done).length;

  return (
    <main className="min-h-screen bg-[#07080b] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
              DSG Control Plane
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              ศูนย์ควบคุม
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/command-center"
              className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:brightness-110"
            >
              ศูนย์บัญชาการ
            </Link>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? "⟳ กำลังโหลด..." : "↻ รีเฟรช"}
            </button>
          </div>
        </div>

        {error && (
          <Card variant="error" className="mt-4">
            <span className="font-bold">⚠ ข้อผิดพลาด:</span> {error}
          </Card>
        )}

        {/* ── System Health Indicator ────────────────────────────── */}
        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${loading ? "bg-slate-600 animate-pulse" : systemHealth?.allGood ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"}`} />
              <div>
                <p className="text-sm font-semibold text-white">สถานะระบบ</p>
                <p className="text-xs text-slate-500">
                  {loading ? "กำลังตรวจสอบ..." : systemHealth?.allGood ? "ระบบทำงานปกติทั้งหมด" : "มีระบบบางส่วนผิดปกติ"}
                </p>
              </div>
            </div>
            {!loading && systemHealth && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-2 w-6 rounded-full transition-colors ${
                        i < systemHealth.score ? "bg-emerald-400" : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500">
                  {systemHealth.score}/{systemHealth.total}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {kpis.map((k) => {
            const colors = KPI_COLORS[k.color] ?? KPI_COLORS.amber;
            return (
              <Link
                key={k.label}
                href={k.href}
                className={`group relative overflow-hidden rounded-2xl border ${colors.border} bg-white/[0.025] p-4 shadow-lg ${colors.glow} transition-all hover:bg-white/[0.05] hover:scale-[1.02] sm:p-5`}
              >
                <div className="absolute -right-4 -top-4 text-4xl opacity-10 transition-opacity group-hover:opacity-20">
                  {k.icon}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">{k.icon}</span>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:text-[11px]">
                    {k.label}
                  </p>
                </div>
                <div className="mt-3">
                  {k.value === null ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className={`text-2xl font-bold ${colors.text} sm:text-3xl`}>
                      {k.value}
                    </p>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-600">{k.sub}</p>
              </Link>
            );
          })}
        </div>

        {/* ── Monitoring Metrics (NEW - Phase 2) ─────────────────── */}
        <div className="mt-8">
          <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-slate-500">
            📊 Agent Monitoring Metrics
          </p>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <MetricsSummary period="month" autoRefresh={true} />
          </div>
        </div>

        {/* ── Products Grid ──────────────────────────────────────── */}
        <div className="mt-8">
          <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">
            ผลิตภัณฑ์
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {PRODUCTS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`group rounded-2xl border p-4 transition-all hover:scale-[1.02] ${COLOR_MAP[p.color] ?? COLOR_MAP.amber}`}
              >
                <span className="text-2xl">{p.icon}</span>
                <p className="mt-2 text-sm font-semibold text-slate-100 leading-snug group-hover:text-white">
                  {p.label}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  {p.sub}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Middle Row: Onboarding + Recent Executions ─────────── */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[360px_1fr]">

          {/* Onboarding */}
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.03] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/60">
                การตั้งค่า
              </p>
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                {doneCount}/3
              </span>
            </div>
            <p className="mt-1 text-lg font-semibold text-emerald-50">
              ความคืบหน้า
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/30">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-500"
                style={{ width: `${Math.round((doneCount / onboardingSteps.length) * 100)}%` }}
              />
            </div>
            <ul className="mt-4 space-y-1">
              {onboardingSteps.map((s) => (
                <li key={s.label}>
                  <Link
                    href={s.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      s.done ? "hover:bg-emerald-400/5" : "hover:bg-white/5"
                    }`}
                  >
                    {/* Ring indicator */}
                    <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                      <span className={`absolute inset-0 rounded-full border-2 ${
                        s.done
                          ? "border-emerald-400/60 bg-emerald-400/20"
                          : "border-white/15"
                      }`} />
                      {s.ring === "green" && s.done && (
                        <span className="absolute -inset-1 animate-ping rounded-full bg-emerald-400/30" />
                      )}
                      <span className={`relative z-10 text-[10px] font-bold ${
                        s.done ? "text-emerald-300" : "text-slate-600"
                      }`}>
                        {s.done ? "✓" : s.ring === "green" ? "●" : "○"}
                      </span>
                    </span>
                    <span
                      className={s.done ? "text-emerald-100" : "text-slate-400 underline decoration-dotted"}
                    >
                      {s.label}
                    </span>
                    {!s.done && <span className="ml-auto text-[10px] text-slate-600">→</span>}
                  </Link>
                </li>
              ))}
            </ul>
            {!loading && onboarding?.next_action && (
              <p className="mt-3 text-xs text-emerald-300/60">
                ขั้นตอนถัดไป: {onboarding.next_action}
              </p>
            )}
            <Link
              href={(() => {
                const next = onboardingSteps.find((s) => !s.done);
                return next ? next.href : "/dashboard/executions";
              })()}
              className="mt-4 inline-block rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-400/10"
            >
              {doneCount < 3 ? `ถัดไป: ${onboardingSteps.find((s) => !s.done)?.label ?? "ดำเนินการต่อ"} →` : "ดูการดำเนินการทั้งหมด →"}
            </Link>
          </div>

          {/* Recent Executions */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                การดำเนินการล่าสุด
              </p>
              <Link
                href="/dashboard/executions"
                className="text-xs text-slate-500 transition-colors hover:text-slate-300"
              >
                ดูทั้งหมด →
              </Link>
            </div>

            {loading ? (
              <div className="mt-4 space-y-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Skeleton key={n} className="h-14 w-full" />
                ))}
              </div>
            ) : execs.length === 0 ? (
              <div className="mt-6 rounded-xl border border-white/[0.06] px-5 py-10 text-center">
                <p className="text-3xl">📭</p>
                <p className="mt-2 text-sm font-semibold text-slate-300">
                  ยังไม่มีการดำเนินการ
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  รันการดำเนินการควบคุมครั้งแรกเพื่อดูผลลัพธ์ที่นี่
                </p>
                <Link
                  href="/dashboard/integrations"
                  className="mt-4 inline-block rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-400/10"
                >
                  ตั้งค่าการเชื่อมต่อ
                </Link>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {execs.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3 sm:px-4"
                  >
                    <span
                      className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${decisionBadge(ex.decision)}`}
                    >
                      {ex.decision === "ALLOW" ? "อนุญาต" : ex.decision === "BLOCK" ? "บล็อก" : "เสถียร"}
                    </span>
                    <span className="flex-1 truncate font-mono text-xs text-slate-500">
                      {ex.id.slice(0, 20)}…
                    </span>
                    {ex.reason && (
                      <span className="hidden truncate text-xs text-slate-500 sm:block max-w-[140px]">
                        {ex.reason}
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-slate-600">
                      {ex.latency_ms}ms
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-700">
                      {timeAgo(ex.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Support Queue ──────────────────────────────────────── */}
        <div className="mt-8">
          <SupportQueueWidget />
        </div>

        {/* ── Bottom Row: Agents + Hermes + Support ────────────────────────── */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">

          {/* Agents */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                ตัวแทนที่ใช้งาน
              </p>
              <Link
                href="/dashboard/agents"
                className="rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
              >
                + สร้างตัวแทนใหม่
              </Link>
            </div>
            {loading ? (
              <div className="mt-4 space-y-2">
                {[1, 2].map((n) => (
                  <Skeleton key={n} className="h-16 w-full" />
                ))}
              </div>
            ) : agents.length === 0 ? (
              <div className="mt-4 rounded-xl border border-white/[0.06] px-4 py-8 text-center">
                <p className="text-sm text-slate-400">
                  ยังไม่มีตัวแทน — สร้างตัวแทนเพื่อเริ่มควบคุมการดำเนินการ
                </p>
                <Link
                  href="/dashboard/agents"
                  className="mt-3 inline-block rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-300"
                >
                  สร้างตัวแทน
                </Link>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {agents.map((a) => {
                  const pct = Math.min(
                    100,
                    Math.round((a.usage_this_month / (a.monthly_limit || 1)) * 100)
                  );
                  return (
                    <div
                      key={a.agent_id}
                      className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {a.name}
                          </p>
                          <p className="font-mono text-[10px] text-slate-600">
                            {a.agent_id.slice(0, 16)}…
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wide ${
                            a.status === "active"
                              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                              : "border-slate-600 text-slate-400"
                          }`}
                        >
                          {a.status === "active" ? "ใช้งาน" : a.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              pct > 80 ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-600">
                          {a.usage_this_month.toLocaleString()} / {a.monthly_limit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Support Queue (Alternative position - comment out if using separate widget above) */}
          {/* <SupportQueueWidget /> */}

          {/* Hermes AI Status */}
          <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.03] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-violet-300/50">
                  Hermes AI
                </p>
                <p className="mt-1 text-lg font-semibold text-violet-50">
                  Brain Runtime
                </p>
              </div>
              {!loading && hermes && (
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    hermes.status === "ready"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                      : "border-red-400/25 bg-red-400/10 text-red-200"
                  }`}
                >
                  {hermes.status === "ready" ? "พร้อม" : hermes.status}
                </span>
              )}
            </div>

            {loading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : hermes ? (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                  <span className="text-slate-500">ผู้ให้บริการ</span>
                  <span className="font-mono text-xs text-violet-200">
                    {hermes.provider}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                  <span className="text-slate-500">โมเดล</span>
                  <span className="max-w-[200px] truncate text-right font-mono text-[10px] text-violet-200">
                    {hermes.model}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                  <span className="text-slate-500">สถานะ</span>
                  <span
                    className={`text-xs font-bold ${
                      hermes.configured ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {hermes.configured ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้งค่า — ใส่ API key"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                ไม่สามารถโหลดสถานะ Brain ได้
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <Link
                href="/dashboard/hermes"
                className="rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-3 py-2 text-xs font-semibold text-violet-200 transition-colors hover:bg-violet-400/15"
              >
                เปิด Hermes →
              </Link>
              <Link
                href="/dashboard/dsg-brain"
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
              >
                ตั้งค่า Brain
              </Link>
            </div>
          </div>
        </div>

        {/* ── Quick Links Footer ──────────────────────────────────── */}
        <div className="mt-8 flex flex-wrap gap-2">
          {[
            { href: "/dashboard/audit", label: "บันทึกการตรวจสอบ" },
            { href: "/dashboard/webhooks", label: "Webhooks" },
            { href: "/dashboard/policies", label: "นโยบาย" },
            { href: "/dashboard/billing", label: "การเรียกเก็บเงิน" },
            { href: "/dashboard/team", label: "ทีม" },
            { href: "/dashboard/breach-signal", label: "สัญญาณละเมิด" },
            { href: "/dashboard/ledger", label: "บัญชีแยกประเภท" },
            { href: "/dashboard/verification", label: "การยืนยัน" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-white/15 hover:text-slate-200"
            >
              {l.label}
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
