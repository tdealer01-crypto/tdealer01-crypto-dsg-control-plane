'use client';

import { useEffect, useState } from 'react';
import { getFeatureFlagClient, type FeatureFlagName } from '../vercel-flags';

/**
 * useFeatureFlag — Client-side feature flag hook
 *
 * Use this in client components to conditionally render based on feature flags.
 *
 * Example:
 *   const isDashboardEnabled = useFeatureFlag('ENABLE_MONITOR_DASHBOARD');
 *   return isDashboardEnabled && <Dashboard />;
 *
 * The hook reads flags from window.__featureFlags (set by server during initial render)
 * and falls back to default configuration if not available.
 */

export function useFeatureFlag(
  flagName: FeatureFlagName
): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Read flag from client-side source (server-injected)
    const flagValue = getFeatureFlagClient(flagName);
    setEnabled(flagValue);
    setLoading(false);
  }, [flagName]);

  return { enabled, loading };
}

/**
 * useFeatureFlags — Check multiple feature flags at once
 *
 * Example:
 *   const flags = useFeatureFlags(['ENABLE_MONITOR_DASHBOARD', 'ENABLE_BILLING_UI']);
 *   return {
 *     monitoring: flags.ENABLE_MONITOR_DASHBOARD,
 *     billing: flags.ENABLE_BILLING_UI,
 *   };
 */

export function useFeatureFlags(
  flagNames: FeatureFlagName[]
): { flags: Record<FeatureFlagName, boolean>; loading: boolean } {
  const [flags, setFlags] = useState<Record<FeatureFlagName, boolean>>({} as Record<FeatureFlagName, boolean>);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const result: Record<string, boolean> = {};
    for (const name of flagNames) {
      result[name] = getFeatureFlagClient(name);
    }
    setFlags(result as Record<FeatureFlagName, boolean>);
    setLoading(false);
  }, [flagNames]);

  return { flags, loading };
}
