"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type SetupStep = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  icon: string;
};

type ConfigStatus = {
  format: "env" | "json" | "yaml";
  hasSupabase: boolean;
  hasStripe: boolean;
  hasAnthropic: boolean;
  completionPercent: number;
};

export function SetupStatusWidget() {
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup/status", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch setup status");
      const data = await res.json();
      setSteps(data.steps || []);
      setConfig(data.config || null);
    } catch (err) {
      console.error("Setup status error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.03] p-5 animate-pulse">
        <div className="h-6 w-32 rounded-lg bg-white/10" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const completedCount = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  return (
    <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.03] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-300/60">
            Setup Status
          </p>
          <p className="mt-1 text-lg font-semibold text-amber-50">
            Configuration
          </p>
        </div>
        <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
          {completedCount}/{totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/30">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Config format badge */}
      {config && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-amber-300/60">Format:</span>
          <span className="rounded-lg bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-300 uppercase tracking-wide">
            {config.format}
          </span>
          <span className="text-[10px] text-amber-300/60">
            {config.completionPercent}% filled
          </span>
        </div>
      )}

      {/* Integration status */}
      {config && (
        <div className="mt-3 flex gap-2">
          {config.hasSupabase && (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              ✓ Supabase
            </span>
          )}
          {config.hasStripe && (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              ✓ Stripe
            </span>
          )}
          {config.hasAnthropic && (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              ✓ Anthropic
            </span>
          )}
        </div>
      )}

      {/* Steps list */}
      <ul className="mt-4 space-y-1">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                step.completed ? "hover:bg-amber-400/5" : "hover:bg-white/5"
              }`}
            >
              <span className="text-lg">{step.icon}</span>
              <div className="flex-1">
                <p className={step.completed ? "text-amber-100" : "text-slate-400"}>
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-500">{step.description}</p>
              </div>
              {step.completed && <span className="text-emerald-400">✓</span>}
            </Link>
          </li>
        ))}
      </ul>

      {/* Action button */}
      <Link
        href="/dashboard/settings/configuration"
        className="mt-4 inline-block rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400/10"
      >
        View Configuration →
      </Link>
    </div>
  );
}
