/**
 * Vercel Feature Flags Adapter
 *
 * This module provides integration with Vercel's edge-compatible feature flag system.
 * Feature flags control Phase 1 feature rollout and can be toggled without deployment.
 *
 * Usage in server components:
 *   const client = vercelFlagClient();
 *   const isEnabled = await client.flag('ENABLE_MONITOR_DASHBOARD');
 *
 * Usage in client components:
 *   const isEnabled = useFeatureFlag('ENABLE_MONITOR_DASHBOARD');
 *
 * Current flags:
 * - ENABLE_MONITOR_DASHBOARD: Show Monitor pillar dashboard
 * - ENABLE_AUDIT_LOG: Show Audit pillar and audit log features
 * - ENABLE_BILLING_UI: Show Optimize pillar billing UI
 * - ENABLE_DELIVERY_PROOF: Show Delivery Proof scanning features
 */

type FeatureFlagName =
  | 'ENABLE_MONITOR_DASHBOARD'
  | 'ENABLE_AUDIT_LOG'
  | 'ENABLE_BILLING_UI'
  | 'ENABLE_DELIVERY_PROOF';

interface FeatureFlagConfig {
  name: FeatureFlagName;
  enabled: boolean;
  rolloutPercentage?: number;
  targetEnvironments?: ('development' | 'preview' | 'production')[];
}

/**
 * Default feature flag configuration
 * In production, these should be overridden by Vercel environment settings
 */
const DEFAULT_FLAGS: Record<FeatureFlagName, boolean> = {
  ENABLE_MONITOR_DASHBOARD: true,
  ENABLE_AUDIT_LOG: false,
  ENABLE_BILLING_UI: true,
  ENABLE_DELIVERY_PROOF: true,
};

/**
 * Get feature flag status from environment or defaults
 * Server-side only: Use this in server components or API routes
 */
export function getFeatureFlagServer(name: FeatureFlagName): boolean {
  // First check environment variable (Vercel system env or .env)
  const envValue = process.env[`FEATURE_FLAG_${name}`];
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }

  // Fall back to default configuration
  return DEFAULT_FLAGS[name] ?? false;
}

/**
 * Create a server-side feature flag client
 * Use this in server components to check flags
 */
export function vercelFlagClient() {
  return {
    flag: async (name: FeatureFlagName): Promise<boolean> => {
      return getFeatureFlagServer(name);
    },
    flags: async (): Promise<Record<FeatureFlagName, boolean>> => {
      const flagNames: FeatureFlagName[] = [
        'ENABLE_MONITOR_DASHBOARD',
        'ENABLE_AUDIT_LOG',
        'ENABLE_BILLING_UI',
        'ENABLE_DELIVERY_PROOF',
      ];
      const result: Record<string, boolean> = {};
      for (const name of flagNames) {
        result[name] = getFeatureFlagServer(name);
      }
      return result as Record<FeatureFlagName, boolean>;
    },
  };
}

/**
 * List all available feature flags with their current status
 * Server-side only
 */
export async function listFeatureFlags(): Promise<
  Array<{ name: FeatureFlagName; enabled: boolean }>
> {
  const client = vercelFlagClient();
  const allFlags = await client.flags();
  return Object.entries(allFlags).map(([name, enabled]) => ({
    name: name as FeatureFlagName,
    enabled,
  }));
}

/**
 * Check if a feature flag is enabled (client-side version)
 * Reads from window.__featureFlags set by server in initial render
 */
export function getFeatureFlagClient(name: FeatureFlagName): boolean {
  if (typeof window === 'undefined') return false;
  const flags = (window as any).__featureFlags as Record<FeatureFlagName, boolean> | undefined;
  return flags?.[name] ?? DEFAULT_FLAGS[name] ?? false;
}

export type { FeatureFlagName, FeatureFlagConfig };
