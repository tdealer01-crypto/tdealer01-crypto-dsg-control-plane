import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { logApiError, internalErrorMessage } from '@/lib/security/api-error';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { readJsonBody } from '@/lib/security/request-json';

export const dynamic = 'force-dynamic';

interface OnboardRequest {
  business_name: string;
  email: string;
  country: string;
}

interface OnboardResponse {
  seller_id: string;
  account_link_url: string;
  kyc_status: string;
}

/**
 * POST /api/marketplace/sellers/onboard
 *
 * Creates a new seller with Stripe Connect account (Accounts v2).
 * Controller properties configured for platform liability:
 * - losses.payments: 'application' (platform liable for negative balances)
 * - fees.payer: 'application' (platform pays Stripe fees)
 * - stripe_dashboard.type: 'express' (limited dashboard access)
 * - requirement_collection: 'stripe' (Stripe handles KYC)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return buildPreflightResponse(request);
  }

  const corsHeaders = buildCorsHeaders(request);

  try {
    // Verify Stripe API key is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      logApiError('POST /api/marketplace/sellers/onboard', new Error('STRIPE_SECRET_KEY not configured'), {});
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

    // Verify user ID exists
    if (!user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body with size limit
    const bodyResult = await readJsonBody<OnboardRequest>(request, { maxBytes: 1024 * 10 });
    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error || 'Invalid request body' },
        { status: bodyResult.status, headers: corsHeaders }
      );
    }

    const { business_name, email, country } = bodyResult.value || {};

    // Validate required fields
    const validationErrors: string[] = [];

    if (!business_name || typeof business_name !== 'string' || business_name.trim().length < 2) {
      validationErrors.push('business_name must be at least 2 characters');
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      validationErrors.push('email must be a valid email address');
    }

    if (!country || typeof country !== 'string' || country.trim().length !== 2) {
      validationErrors.push('country must be a 2-letter country code');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Stripe client
    const stripe = new Stripe(stripeSecretKey);

    // Create Stripe Connected Account using Accounts v2 API
    // Reference: https://docs.stripe.com/connect/accounts-v2
    const stripeAccount = await stripe.accounts.create({
      type: 'express',
      country: country.toUpperCase(),
      email: email.trim(),
      business_profile: {
        name: business_name.trim(),
        support_email: email.trim(),
      },
      controller: {
        losses: {
          payments: 'application', // Platform is liable for negative balances
        },
        fees: {
          payer: 'application', // Platform pays Stripe fees
        },
        stripe_dashboard: {
          type: 'express', // Limited dashboard access for seller
        },
        requirement_collection: 'stripe', // Stripe collects KYC requirements
      },
    } as any);

    if (!stripeAccount.id) {
      throw new Error('Failed to create Stripe connected account');
    }

    // Create Account Link for KYC onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      type: 'account_onboarding',
      return_url: `${process.env.VERCEL_URL || 'http://localhost:3000'}/marketplace/sellers/onboard/success`,
      refresh_url: `${process.env.VERCEL_URL || 'http://localhost:3000'}/marketplace/sellers/onboard/refresh`,
    });

    if (!accountLink.url) {
      throw new Error('Failed to create Stripe account link');
    }

    // Store seller in Supabase with pending KYC status
    const { data: seller, error: insertError } = await (supabase as any)
      .from('sellers')
      .insert({
        user_id: user.id,
        business_name: business_name.trim(),
        stripe_account_id: stripeAccount.id,
        kyc_account_link_url: accountLink.url,
        kyc_status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      logApiError('POST /api/marketplace/sellers/onboard - DB insert failed', insertError, {
        stripe_account_id: stripeAccount.id,
      });
      // Clean up Stripe account if DB insert fails
      try {
        await stripe.accounts.del(stripeAccount.id);
      } catch (cleanupErr) {
        logApiError('Failed to clean up Stripe account on DB error', cleanupErr, {
          stripe_account_id: stripeAccount.id,
        });
      }
      throw insertError;
    }

    const response: OnboardResponse = {
      seller_id: seller.id,
      account_link_url: accountLink.url,
      kyc_status: seller.kyc_status,
    };

    return NextResponse.json(response, { status: 201, headers: corsHeaders });
  } catch (err) {
    logApiError('POST /api/marketplace/sellers/onboard', err, {});
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
