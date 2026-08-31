'use client';

import { useEffect, useState } from 'react';
import { getFeatureFlagClient, type FeatureFlagName } from '../feature-flags';

/**
 * useFeatureFlag — Client-side feature flag hook.
 * Reads flags from window.__featureFlags set by the server and falls back to
 * the provider-neutral runtime defaults.
 */
export function useFeatureFlag(
  flagName: FeatureFlagName
): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const flagValue = getFeatureFlagClient(flagName);
    setEnabled(flagValue);
    setLoading(false);
  }, [flagName]);

  return { enabled, loading };
}

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
