"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Plug,
  Zap,
} from "lucide-react";
import OnboardingMascot, { type MascotPose } from "./OnboardingMascot";

// Evidence-based onboarding steps.
//
// Each step's completion is DERIVED from real workspace state returned by
// GET /api/onboarding/state (the `progress` object), never from a manual
// checkbox. This keeps onboarding progress consistent with the evidence-first
// model: a step is "done" only when the backing record actually exists.
type ProgressKey = "workspace_ready" | "agent_ready" | "first_execution_ready";

type Step = {
  id: ProgressKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta: { label: string; href: string };
};

const STEPS: Step[] = [
  {
    id: "workspace_ready",
    icon: Building2,
    title: "Create your workspace",
    description: "Your organization workspace is provisioned and active.",
    cta: { label: "Open dashboard", href: "/dashboard" },
  },
  {
    id: "agent_ready",
    icon: Plug,
    title: "Connect your first agent",
    description: "Run Quick Setup to create a governed agent and API key.",
    cta: { label: "Go to Quick Setup", href: "/dashboard/welcome" },
  },
  {
    id: "first_execution_ready",
    icon: Zap,
    title: "Run your first governed action",
    description: "Execute one action through the gate to generate evidence.",
    cta: { label: "Go to Quick Setup", href: "/dashboard/welcome" },
  },
];

type OnboardingStateResponse = {
  progress?: Partial<Record<ProgressKey, unknown>>;
  widget?: {
    dismissed?: boolean;
  };
};

function progressDone(progress: OnboardingStateResponse["progress"], key: ProgressKey): boolean {
  return progress?.[key] === true;
}

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [progress, setProgress] = useState<OnboardingStateResponse["progress"]>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const persistDismissed = useCallback(async (nextDismissed: boolean) => {
    const response = await fetch("/api/onboarding/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed: nextDismissed }),
    });

    if (!response.ok) {
      throw new Error("Could not save onboarding state");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const response = await fetch("/api/onboarding/state", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Could not load onboarding state");
        }

        const payload = (await response.json()) as OnboardingStateResponse;
        if (cancelled) return;

        setDismissed(payload.widget?.dismissed === true);
        setProgress(payload.progress ?? {});
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load onboarding state",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    const previousDismissed = dismissed;
    setDismissed(true);
    persistDismissed(true).catch((err) => {
      setDismissed(previousDismissed);
      setError(
        err instanceof Error ? err.message : "Could not save onboarding state",
      );
    });
  }

  if (loading || dismissed) return null;

  const total = STEPS.length;
  const done = STEPS.filter((s) => progressDone(progress, s.id)).length;
  const percent = Math.round((done / total) * 100);

  // Decorative guide. Mirrors the real step state; never the source of truth.
  const nextStep = STEPS.find((s) => !progressDone(progress, s.id));
  const mascotPose: MascotPose =
    done === total ? "waving" : nextStep ? "pointing" : "idle";

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-3xl border border-white/10 bg-[#0b0d10] shadow-2xl shadow-black/70">
      {error ? (
        <div className="rounded-t-3xl border-b border-red-400/20 bg-red-500/10 px-4 py-2 text-xs text-red-100">
          {error}
        </div>
      ) : null}

      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between gap-3 rounded-t-3xl border-b border-white/10 px-4 py-3 select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">
            Get started with DSG
          </span>
          <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2 py-0.5 text-xs font-semibold text-[#F5D76E]">
            {done}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            className="rounded-md p-0.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!collapsed && (
        <div className="h-0.5 w-full bg-white/[0.06]">
          <div
            className="h-0.5 bg-[#D4AF37] transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {/* Steps — completion is read-only, derived from real evidence */}
      {!collapsed && (
        <div className="divide-y divide-white/[0.06] px-1 py-1">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isComplete = progressDone(progress, step.id);
            return (
              <div
                key={step.id}
                className="flex items-start gap-3 rounded-2xl px-3 py-3"
              >
                <span
                  className="mt-0.5 shrink-0"
                  aria-label={isComplete ? "Complete" : "Not yet complete"}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-500" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                    <p
                      className={`text-sm font-semibold leading-5 ${
                        isComplete
                          ? "text-slate-600 line-through"
                          : "text-slate-100"
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                  {!isComplete && (
                    <p className="mt-0.5 text-xs leading-4 text-slate-500">
                      {step.description}
                    </p>
                  )}
                  {!isComplete && (
                    <Link
                      href={step.cta.href}
                      className="mt-1.5 inline-block rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2.5 py-1 text-xs font-semibold text-[#F5D76E] transition hover:bg-[#D4AF37]/20"
                    >
                      {step.cta.label} →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guide mascot — decorative, sits below the steps so it never covers
          them. Points at the next step, or waves when everything is done. */}
      {!collapsed && done < total && (
        <div className="flex items-center gap-3 border-t border-white/[0.06] px-4 py-3">
          <OnboardingMascot pose={mascotPose} size={40} />
          <p className="text-xs leading-snug text-slate-400">
            {nextStep ? (
              <>
                Next: <span className="font-semibold text-slate-200">{nextStep.title}</span>
              </>
            ) : (
              "Keep going — you're almost set."
            )}
          </p>
        </div>
      )}

      {/* Footer when all done */}
      {!collapsed && done === total && (
        <div className="flex flex-col items-center px-4 pb-4 pt-3 text-center">
          <OnboardingMascot pose="waving" size={44} />
          <p className="mt-1 text-xs font-semibold text-emerald-400">
            All steps complete — your workspace is ready.
          </p>
          <button
            onClick={dismiss}
            className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08]"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
