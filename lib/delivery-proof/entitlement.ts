/**
 * Delivery Proof Pricing & Entitlement Logic
 * Determines scan tier eligibility and metered billing trigger
 * 
 * NOTE: Phase 1 uses simplified in-memory checks.
 * Phase 2 will wire to Supabase tables (delivery_proof_scans, delivery_proof_entitlements)
 * 
 * API CONTRACT (POST /api/delivery-proof/scan):
 * 
 * Success response (200 OK):
 * {
 *   ok: true,
 *   run_id: "dp-{timestamp}-{random}",
 *   share_url: "https://app.example.com/delivery-proof/report/{run_id}",
 *   claim_result: "EVIDENCE COMPLETE" | "PRODUCTION BLOCKED",
 *   checks: [
 *     { name: string, status: "pass" | "fail" | "skip", detail: string }
 *   ],
 *   summary: { pass: number, fail: number, skip: number },
 *   entitlement: { tier: "free" | "pro_scan" | "unlimited", scansRemaining: number }
 * }
 * 
 * Over-quota error (402 Payment Required):
 * {
 *   ok: false,
 *   error: "Quota exceeded — please upgrade",
 *   requiresUpgrade: true,
 *   tier: "free"
 * }
 * 
 * Client should:
 * - Display entitlement.tier in ScanForm UI
 * - Show "scans remaining" message when tier is free
 * - Offer upgrade CTAs when 402 received or scansRemaining <= 1
 * - Redirect to /billing?plan=pro or /billing?item=delivery_proof_scan_49
 */

export interface DeliveryProofTier {
  tier: 'free' | 'pro_scan' | 'unlimited';
  scansPerMonth: number;
  costPerOverage: number; // in cents
  description: string;
}

export const DELIVERY_PROOF_TIERS: Record<string, DeliveryProofTier> = {
  free: {
    tier: 'free',
    scansPerMonth: 1,
    costPerOverage: 0,
    description: 'Free — 1 scan/month',
  },
  pro_scan: {
    tier: 'pro_scan',
    scansPerMonth: 10,
    costPerOverage: 49 * 100, // $49 one-time charge
    description: 'Pro Scan — $49 per extra scan',
  },
  unlimited: {
    tier: 'unlimited',
    scansPerMonth: 99999,
    costPerOverage: 0,
    description: 'Unlimited — $199/mo',
  },
};

export interface EntitlementCheck {
  allowed: boolean;
  tier: string;
  scansRemaining: number;
  message: string;
  requiresPayment: boolean;
}

/**
 * Check if an org is entitled to run a delivery proof scan
 * Returns eligibility and metered billing flag
 * 
 * Phase 1: Simplified check - all authenticated users get free tier
 * Phase 2: Will check Supabase entitlements table
 */
export async function checkDeliveryProofEntitlement(
  orgId: string | null,
): Promise<EntitlementCheck> {
  // All users (authenticated and unauthenticated) allowed for Phase 1
  // This is a lead magnet — we want maximum signup
  return {
    allowed: true,
    tier: 'free',
    scansRemaining: 1,
    message: orgId ? 'Free tier — 1 scan/month' : 'Demo scan (no login required)',
    requiresPayment: false,
  };
}

/**
 * Record a scan and trigger metered billing if needed
 * 
 * Phase 1: Simple logging
 * Phase 2: Will persist to Supabase and fire Stripe meter events
 */
export async function recordDeliveryProofScan(
  runId: string,
  orgId: string | null,
  productionUrl: string,
  claimResult: string,
  checksPass: number,
  checksTotal: number,
): Promise<{ scanRecorded: boolean; meterEventId?: string; error?: string }> {
  try {
    // Phase 1: Just log for now
    console.log(`[delivery-proof-scan] ${runId} | org=${orgId || 'anonymous'} | url=${productionUrl} | result=${claimResult}`);

    // TODO Phase 2: Insert into delivery_proof_scans table
    // TODO Phase 2: Check delivery_proof_entitlements and fire Stripe meter event if needed
    
    return {
      scanRecorded: true,
      meterEventId: undefined,
    };
  } catch (err) {
    console.error('[delivery-proof-record] Error recording scan:', err);
    return {
      scanRecorded: false,
      error: `Failed to record scan: ${String(err).slice(0, 120)}`,
    };
  }
}

/**
 * Reset monthly scan counters (call via cron)
 * 
 * Phase 2 only - requires Supabase table
 */
export async function resetMonthlyScanCounters(): Promise<{ reset: number; error?: string }> {
  // Phase 1: Not yet implemented
  return { reset: 0, error: 'Not yet implemented in Phase 1' };
}
