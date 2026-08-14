// components/dashboard/feature-flag-gate.tsx
// Vercel Flags SDK integration for progressive feature rollout

import { type ReactNode } from "react";
import { Lock, Clock } from "lucide-react";

interface FeatureFlagGateProps {
  flag: boolean;
  featureName: string;
  plannedRelease?: string;
  blockedBy?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureFlagGate({
  flag: isEnabled,
  featureName,
  plannedRelease,
  blockedBy,
  children,
  fallback,
}: FeatureFlagGateProps) {
  if (isEnabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <FeatureComingSoon
      name={featureName}
      plannedRelease={plannedRelease}
      blockedBy={blockedBy}
    />
  );
}

function FeatureComingSoon({
  name,
  plannedRelease,
  blockedBy,
}: {
  name: string;
  plannedRelease?: string;
  blockedBy?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
        <Lock size={24} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {name}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        This feature is currently in development
      </p>
      {(plannedRelease || blockedBy) && (
        <div className="flex flex-col items-center gap-1 text-xs text-gray-400">
          {plannedRelease && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Planned: {plannedRelease}
            </span>
          )}
          {blockedBy && (
            <span className="text-amber-500">
              Blocked by: {blockedBy}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
