"use client";

import { useEffect, useState } from "react";

type NudgeLevel = "none" | "soft" | "hard" | "blocked";

type QuotaSnapshot = {
  pct: number;
  nudge: NudgeLevel;
  used: number;
  limit: number;
  upgradeUrl?: string | null;
  nextPlan?: string | null;
};

function BannerContent({
  snapshot,
  onDismiss,
}: {
  snapshot: QuotaSnapshot;
  onDismiss?: () => void;
}) {
  const { pct, nudge, nextPlan, upgradeUrl } = snapshot;

  if (nudge === "blocked") {
    return (
      <div className="flex w-full items-center justify-between gap-4 bg-red-950/80 px-5 py-3 text-sm text-red-200 border-b border-red-800">
        <span>
          <strong>Quota exceeded — executions blocked.</strong> Upgrade now to
          resume agent operations.
        </span>
        {upgradeUrl && (
          <a
            href={upgradeUrl}
            className="shrink-0 rounded-lg bg-red-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-400"
          >
            Upgrade now →
          </a>
        )}
      </div>
    );
  }

  if (nudge === "hard") {
    return (
      <div className="flex w-full items-center justify-between gap-4 bg-red-950/60 px-5 py-3 text-sm text-red-300 border-b border-red-900">
        <span>
          <strong>{pct}% quota used</strong> — executions will stop at 100%.{" "}
          {nextPlan && `Upgrade to ${nextPlan} to avoid interruption.`}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {upgradeUrl && (
            <a
              href={upgradeUrl}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-500"
            >
              Upgrade →
            </a>
          )}
        </div>
      </div>
    );
  }

  if (nudge === "soft") {
    return (
      <div className="flex w-full items-center justify-between gap-4 bg-amber-950/60 px-5 py-3 text-sm text-amber-200 border-b border-amber-900">
        <span>
          <strong>{pct}% of your monthly quota used.</strong>{" "}
          {nextPlan
            ? `Upgrade to ${nextPlan} to avoid interruption.`
            : "Consider upgrading before you hit your limit."}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {upgradeUrl && (
            <a
              href={upgradeUrl}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-400"
            >
              Upgrade →
            </a>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="rounded-lg px-2 py-1.5 text-xs text-amber-400 hover:text-amber-300"
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default function NudgeBanner() {
  const [snapshot, setSnapshot] = useState<QuotaSnapshot | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/usage/analytics", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.quota) return;
        const q = data.quota;
        setSnapshot({
          pct: q.pct,
          nudge: q.nudge,
          used: q.used,
          limit: q.limit,
          upgradeUrl: q.upgradeUrl,
          nextPlan: q.nextPlan,
        });
      })
      .catch(() => null);
  }, []);

  if (!snapshot || snapshot.nudge === "none") return null;
  if (dismissed && snapshot.nudge === "soft") return null;

  function handleDismiss() {
    setDismissed(true);
  }

  return (
    <BannerContent
      snapshot={snapshot}
      onDismiss={snapshot.nudge === "soft" ? handleDismiss : undefined}
    />
  );
}
