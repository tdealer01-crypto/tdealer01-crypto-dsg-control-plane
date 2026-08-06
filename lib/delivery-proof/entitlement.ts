/**
 * Delivery Proof Pricing & Entitlement Logic
 * Determines scan tier eligibility and metered billing trigger.
 */

import { reportMeterEvent } from '@/lib/billing/metered';
import { logQuotaConsumption } from '@/lib/database/quotas';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export interface DeliveryProofTier {
  tier: 'free' | 'pro_scan' | 'unlimited';
  scansPerMonth: number;
  costPerOverage: number;
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
    costPerOverage: 49 * 100,
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

type DeliveryProofEntitlementRow = {
  org_id: string;
  current_tier: string | null;
  scans_included_monthly: number | null;
  customer_id: string | null;
};

type DeliveryProofTierName = 'free' | 'pro_scan' | 'unlimited';

function monthBoundsUtc(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function toApiTier(dbTier: string | null | undefined): DeliveryProofTierName {
  const value = String(dbTier || 'free').toLowerCase();
  if (value === 'business' || value === 'enterprise' || value === 'unlimited') {
    return 'unlimited';
  }
  if (value === 'pro' || value === 'pro_scan') {
    return 'pro_scan';
  }
  return 'free';
}

function defaultMonthlyScanLimit(dbTier: string | null | undefined): number {
  return DELIVERY_PROOF_TIERS[toApiTier(dbTier)].scansPerMonth;
}

async function getOrCreateEntitlement(
  orgId: string,
): Promise<DeliveryProofEntitlementRow> {
  const supabase = getSupabaseAdmin() as any;
  const existing = await supabase
    .from('delivery_proof_entitlements')
    .select('org_id,current_tier,scans_included_monthly,customer_id')
    .eq('org_id', orgId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    return existing.data as DeliveryProofEntitlementRow;
  }

  const created = await supabase
    .from('delivery_proof_entitlements')
    .insert({
      org_id: orgId,
      current_tier: 'free',
      scans_included_monthly: DELIVERY_PROOF_TIERS.free.scansPerMonth,
    })
    .select('org_id,current_tier,scans_included_monthly,customer_id')
    .maybeSingle();

  if (created.error || !created.data) {
    throw new Error(
      created.error?.message ||
        'failed_to_create_delivery_proof_entitlement',
    );
  }

  return created.data as DeliveryProofEntitlementRow;
}

async function countScansThisPeriod(orgId: string): Promise<number> {
  const supabase = getSupabaseAdmin() as any;
  const { startIso, endIso } = monthBoundsUtc();
  const result = await supabase
    .from('delivery_proof_scans')
    .select('id', { head: true, count: 'exact' })
    .eq('org_id', orgId)
    .gte('created_at', startIso)
    .lt('created_at', endIso);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.count || 0;
}

export async function checkDeliveryProofEntitlement(
  orgId: string | null,
): Promise<EntitlementCheck> {
  if (!orgId) {
    return {
      allowed: true,
      tier: 'free',
      scansRemaining: 1,
      message: 'Demo scan (no login required)',
      requiresPayment: false,
    };
  }

  try {
    const entitlement = await getOrCreateEntitlement(orgId);
    const apiTier = toApiTier(entitlement.current_tier);
    const included = Number(
      entitlement.scans_included_monthly ||
        defaultMonthlyScanLimit(entitlement.current_tier),
    );
    const used = await countScansThisPeriod(orgId);
    const scansRemaining = Math.max(0, included - used);
    const allowed = scansRemaining > 0;

    return {
      allowed,
      tier: apiTier,
      scansRemaining,
      message: allowed
        ? `${apiTier.toUpperCase()} tier — ${scansRemaining} scans remaining this period`
        : 'Quota exceeded — please upgrade',
      requiresPayment: !allowed,
    };
  } catch (error) {
    console.error(
      '[delivery-proof-entitlement] entitlement check failed:',
      error,
    );
    return {
      allowed: false,
      tier: 'unknown',
      scansRemaining: 0,
      message:
        'Delivery Proof entitlement is temporarily unavailable; authenticated scan blocked to prevent unmetered delivery',
      requiresPayment: false,
    };
  }
}

export async function recordDeliveryProofScan(
  runId: string,
  orgId: string | null,
  productionUrl: string,
  claimResult: string,
  checksPass: number,
  checksTotal: number,
): Promise<{ scanRecorded: boolean; meterEventId?: string; error?: string }> {
  try {
    console.log(
      `[delivery-proof-scan] ${runId} | org=${orgId || 'anonymous'} | url=${productionUrl} | result=${claimResult}`,
    );

    let meterEventId: string | undefined;
    let retryableMeterError: string | undefined;

    if (orgId) {
      const entitlementRow = await getOrCreateEntitlement(orgId);
      const apiTier = toApiTier(entitlementRow.current_tier);
      const supabase = getSupabaseAdmin() as any;
      const insertResult = await supabase
        .from('delivery_proof_scans')
        .insert({
          run_id: runId,
          org_id: orgId,
          production_url: productionUrl,
          claim_result: claimResult,
          checks_passed: checksPass,
          checks_total: checksTotal,
          tier: apiTier,
          metered_event_sent: false,
        })
        .select('id')
        .maybeSingle();

      if (insertResult.error) {
        throw new Error(insertResult.error.message);
      }

      const included = Number(
        entitlementRow.scans_included_monthly ||
          defaultMonthlyScanLimit(entitlementRow.current_tier),
      );
      const used = await countScansThisPeriod(orgId);
      const overage = used > included;

      if (overage) {
        if (!entitlementRow.customer_id) {
          throw new Error(
            'delivery_proof_overage_has_no_stripe_customer',
          );
        }

        const meterResult = await reportMeterEvent(
          entitlementRow.customer_id,
          orgId,
          1,
          `delivery-proof-${runId}`,
        );

        if (meterResult.ok) {
          meterEventId = meterResult.eventId;
          await supabase
            .from('delivery_proof_scans')
            .update({
              stripe_event_id: meterEventId,
              metered_event_sent: true,
            })
            .eq('run_id', runId);
        } else if (!meterResult.durable) {
          throw new Error(
            `delivery_proof_meter_outbox_unavailable:${meterResult.error}`,
          );
        } else {
          retryableMeterError = meterResult.error;
        }
      }

      await logQuotaConsumption(orgId, 'delivery_proof_scan', 1, {
        source: '/api/delivery-proof/scan',
        metadata: {
          runId,
          productionUrl,
          claimResult,
          checksPass,
          checksTotal,
        },
      });
    }

    return {
      scanRecorded: true,
      meterEventId,
      error: retryableMeterError,
    };
  } catch (err) {
    console.error('[delivery-proof-record] Error recording scan:', err);
    return {
      scanRecorded: false,
      error: `Failed to record scan: ${String(err).slice(0, 120)}`,
    };
  }
}

export async function resetMonthlyScanCounters(): Promise<{
  reset: number;
  error?: string;
}> {
  return { reset: 0, error: 'No reset required: scans are counted by period' };
}
