import { NextResponse } from 'next/server';
import { requireActiveProfile } from '../../../../lib/auth/require-active-profile';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

/**
 * GET /api/billing/activation-proof
 *
 * Returns the newest append-only proof that the authenticated workspace has a
 * paid Stripe subscription reflected in DSG's entitlement state.
 *
 * This is an entitlement activation proof. It is not a Stripe payment receipt
 * and it does not claim regulatory compliance by itself.
 */
export async function GET(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'billing-activation-proof'),
    limit: RATE_LIMIT,
    windowMs: WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests' },
      { status: 429, headers },
    );
  }

  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json(
        { ok: false, error: access.error },
        { status: access.status, headers },
      );
    }

    const supabase = getSupabaseAdmin() as any;
    const { data, error } = await supabase
      .from('billing_activation_proofs')
      .select(
        'id,org_id,tier,subscription_status,stripe_customer_id,stripe_subscription_id,current_period_start,current_period_end,proof_version,proof_hash,created_at',
      )
      .eq('org_id', access.orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        {
          ok: true,
          activated: false,
          proof: null,
          message:
            'No paid subscription activation proof exists for this workspace yet.',
        },
        { headers },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        activated: true,
        proof: {
          id: data.id,
          tier: data.tier,
          subscription_status: data.subscription_status,
          stripe_customer_id: data.stripe_customer_id,
          stripe_subscription_id: data.stripe_subscription_id,
          current_period_start: data.current_period_start,
          current_period_end: data.current_period_end,
          proof_version: data.proof_version,
          proof_hash: data.proof_hash,
          created_at: data.created_at,
        },
        meaning:
          'Stripe-backed paid entitlement is active and has an append-only deterministic proof record.',
      },
      { headers },
    );
  } catch (error) {
    return handleApiError('api/billing/activation-proof', error, { headers });
  }
}
