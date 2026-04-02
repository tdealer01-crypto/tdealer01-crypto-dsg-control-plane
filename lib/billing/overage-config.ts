const DEFAULT_OVERAGE_RATE_USD = 0.001;

export const INCLUDED_EXECUTIONS: Record<string, number> = {
  trial: 1000,
  pro: 10000,
  business: 100000,
  enterprise: 1000000,
};

export function getOverageRateUsd(): number {
  const envRate = process.env.OVERAGE_RATE_USD;
  if (envRate) {
    const parsed = Number.parseFloat(envRate);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return DEFAULT_OVERAGE_RATE_USD;
}
