import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { logApiError, internalErrorMessage } from '@/lib/security/api-error';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';

export const dynamic = 'force-dynamic';

interface StatusResponse {
  seller_id: string;
  kyc_status: string;
  verified: boolean;
  account_link_url: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

/**
 * GET /api/marketplace/sellers/:id/status
 *
 * Returns current seller onboarding status with Stripe-verified details.
 * Checks Stripe account status and updates kyc_status if verification is complete.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return buildPreflightResponse(request);
  }

  const corsHeaders = buildCorsHeaders(request);

  try {
    const { id: sellerId } = await params;

    // Verify Stripe API key is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      logApiError('GET /api/marketplace/sellers/:id/status', new Error('STRIPE_SECRET_KEY not configured'), {});
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Fetch seller from database (verify user owns this seller)
    const { data: seller, error: fetchError } = await (supabase as any)
      .from('sellers')
      .select('*')
      .eq('id', sellerId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      logApiError('GET /api/marketplace/sellers/:id/status - DB fetch failed', fetchError, {
        seller_id: sellerId,
      });
      throw fetchError;
    }

    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!seller.stripe_account_id) {
      return NextResponse.json(
        {
          seller_id: seller.id,
          kyc_status: 'pending',
          verified: false,
          account_link_url: seller.kyc_account_link_url,
          charges_enabled: false,
          payouts_enabled: false,
        } as StatusResponse,
        { status: 200, headers: corsHeaders }
      );
    }

    // Check Stripe account status to determine KYC verification
    const stripe = new Stripe(stripeSecretKey);

    const stripeAccount = await stripe.accounts.retrieve(seller.stripe_account_id);

    // Determine KYC status based on Stripe account state
    let updatedKycStatus = seller.kyc_status;
    let isVerified = false;

    // Account is verified if charges and payouts are enabled
    if (stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
      updatedKycStatus = 'verified';
      isVerified = true;

      // Update seller in DB if KYC just became verified
      if (seller.kyc_status !== 'verified') {
        await (supabase as any)
          .from('sellers')
          .update({
            kyc_status: 'verified',
            updated_at: new Date().toISOString(),
          })
          .eq('id', seller.id)
          .catch((err) => {
            logApiError('Failed to update seller KYC status', err, {
              seller_id: seller.id,
            });
            // Don't fail the request if update fails
          });
      }
    } else if (seller.kyc_status === 'pending' && stripeAccount.requirements) {
      // Still pending — Stripe is collecting requirements
      updatedKycStatus = 'pending';
    }

    const response: StatusResponse = {
      seller_id: seller.id,
      kyc_status: updatedKycStatus,
      verified: isVerified,
      account_link_url: seller.kyc_account_link_url,
      charges_enabled: stripeAccount.charges_enabled || false,
      payouts_enabled: stripeAccount.payouts_enabled || false,
    };

    return NextResponse.json(response, { status: 200, headers: corsHeaders });
  } catch (err) {
    logApiError('GET /api/marketplace/sellers/:id/status', err, {});
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
