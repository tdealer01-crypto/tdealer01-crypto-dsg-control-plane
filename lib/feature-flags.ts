/**
 * Runtime feature flags.
 *
 * Flags are provider-neutral and read from application environment settings.
 * Azure App Service/Key Vault remains the production configuration authority.
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
  targetEnvironments?: ('development' | 'staging' | 'production')[];
}

const DEFAULT_FLAGS: Record<FeatureFlagName, boolean> = {
  ENABLE_MONITOR_DASHBOARD: true,
  ENABLE_AUDIT_LOG: false,
  ENABLE_BILLING_UI: true,
  ENABLE_DELIVERY_PROOF: true,
};

export function getFeatureFlagServer(name: FeatureFlagName): boolean {
  const envValue = process.env[`FEATURE_FLAG_${name}`];
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }
  return DEFAULT_FLAGS[name] ?? false;
}

export function featureFlagClient() {
  return {
    flag: async (name: FeatureFlagName): Promise<boolean> => getFeatureFlagServer(name),
    flags: async (): Promise<Record<FeatureFlagName, boolean>> => {
      const flagNames: FeatureFlagName[] = [
        'ENABLE_MONITOR_DASHBOARD',
        'ENABLE_AUDIT_LOG',
        'ENABLE_BILLING_UI',
        'ENABLE_DELIVERY_PROOF',
      ];
      const result: Record<string, boolean> = {};
      for (const name of flagNames) result[name] = getFeatureFlagServer(name);
      return result as Record<FeatureFlagName, boolean>;
    },
  };
}

export async function listFeatureFlags(): Promise<Array<{ name: FeatureFlagName; enabled: boolean }>> {
  const client = featureFlagClient();
  const allFlags = await client.flags();
  return Object.entries(allFlags).map(([name, enabled]) => ({
    name: name as FeatureFlagName,
    enabled,
  }));
}

export function getFeatureFlagClient(name: FeatureFlagName): boolean {
  if (typeof window === 'undefined') return false;
  const flags = (window as any).__featureFlags as Record<FeatureFlagName, boolean> | undefined;
  return flags?.[name] ?? DEFAULT_FLAGS[name] ?? false;
}

export type { FeatureFlagName, FeatureFlagConfig };
