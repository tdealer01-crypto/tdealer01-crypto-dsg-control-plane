import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { logApiError, internalErrorMessage } from '@/lib/security/api-error';
import {
  calculateCheckoutFees,
  formatCents,
} from '@/lib/marketplace/deterministic-checkout';

export const dynamic = 'force-dynamic';

interface SellerCheckoutRequest {
  seller_id: string;
  product_name: string;
  amount_cents: number;
  customer_email: string;
}

interface SellerCheckoutResponse {
  checkout_url: string;
  session_id: string;
  z3_verification: string;
}

/**
 * POST /api/marketplace/seller-checkout
 *
 * Creates a Stripe Checkout Session with Stripe Connect transfer for seller payouts.
 * Uses Z3 deterministic fee calculation to ensure:
 * platform_fee_cents + seller_payout_cents = amount_cents
 *
 * Request body:
 * {
 *   "seller_id": "uuid",
 *   "product_name": "string",
 *   "amount_cents": number,
 *   "customer_email": "string"
 * }
 *
 * Response:
 * {
 *   "checkout_url": "https://checkout.stripe.com/...",
 *   "session_id": "cs_...",
 *   "z3_verification": "Z3 verified: platform_fee_cents + seller_payout_cents = amount_cents"
 * }
 */
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: 'stripe_not_configured' },
      { status: 501 },
    );
  }

  try {
    // Parse and validate request body
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Request body must be valid JSON' },
        { status: 400 },
      );
    }

    const { seller_id, product_name, amount_cents, customer_email } =
      body as Partial<SellerCheckoutRequest>;

    // Validate required fields
    const validationErrors: string[] = [];

    if (!seller_id || typeof seller_id !== 'string') {
      validationErrors.push('seller_id is required and must be a string');
    }

    if (!product_name || typeof product_name !== 'string' || product_name.trim().length === 0) {
      validationErrors.push('product_name is required and must be a non-empty string');
    }

    if (!Number.isInteger(amount_cents) || amount_cents <= 0) {
      validationErrors.push('amount_cents must be a positive integer');
    }

    if (!customer_email || typeof customer_email !== 'string' || !isValidEmail(customer_email)) {
      validationErrors.push('customer_email must be a valid email address');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'validation_failed', details: validationErrors },
        { status: 400 },
      );
    }

    // Initialize Supabase client
    const supabase = await createClient();

    // Fetch seller from database
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, stripe_account_id, fee_percentage')
      .eq('id', seller_id)
      .maybeSingle();

    if (sellerError) {
      logApiError('seller_checkout: fetch seller', sellerError, { seller_id });
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to fetch seller information' },
        { status: 500 },
      );
    }

    if (!seller) {
      return NextResponse.json(
        { error: 'seller_not_found', message: `Seller with ID ${seller_id} not found` },
        { status: 404 },
      );
    }

    if (!seller.stripe_account_id) {
      return NextResponse.json(
        { error: 'seller_not_connected', message: 'Seller has not connected a Stripe account' },
        { status: 400 },
      );
    }

    // Z3 Deterministic Fee Calculation
    let feeCalc;
    try {
      feeCalc = calculateCheckoutFees(amount_cents, seller.fee_percentage);
    } catch (calcError) {
      logApiError('seller_checkout: fee calculation', calcError, {
        amount_cents,
        fee_percentage: seller.fee_percentage,
      });
      return NextResponse.json(
        {
          error: 'calculation_error',
          message: calcError instanceof Error ? calcError.message : 'Fee calculation failed',
        },
        { status: 400 },
      );
    }

    // Initialize Stripe client
    const stripe = new Stripe(stripeKey);
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3000';

    // Create Stripe Checkout Session with Stripe Connect transfer
    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: product_name.trim(),
                description: `Sold by merchant via DSG Marketplace (ID: ${seller_id})`,
              },
              unit_amount: amount_cents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          // Platform fee for DSG (in cents)
          application_fee_amount: feeCalc.platform_fee_cents,
          // Transfer amount and destination for seller (in cents)
          transfer_data: {
            destination: seller.stripe_account_id,
            amount: feeCalc.seller_payout_cents,
          },
        },
        success_url: `${origin}/marketplace/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/marketplace/cancel`,
        metadata: {
          seller_id,
          product_name,
          z3_verification: feeCalc.z3_verification,
        },
      });
    } catch (stripeError) {
      logApiError('seller_checkout: stripe session creation', stripeError, {
        seller_id,
        amount_cents,
        stripe_account_id: seller.stripe_account_id,
      });
      return NextResponse.json(
        {
          error: 'stripe_error',
          message: 'Failed to create Stripe Checkout Session',
        },
        { status: 500 },
      );
    }

    // Store transaction record in seller_transactions table
    try {
      const { error: insertError } = await supabase
        .from('seller_transactions')
        .insert({
          seller_id: seller.id,
          checkout_session_id: checkoutSession.id,
          customer_email,
          amount_total: amount_cents,
          platform_fee: feeCalc.platform_fee_cents,
          seller_payout: feeCalc.seller_payout_cents,
          status: 'pending',
          // created_at is auto-set by the database
        });

      if (insertError) {
        // Log the error but don't fail the checkout — the Stripe session was created successfully
        logApiError('seller_checkout: insert transaction record', insertError, {
          seller_id,
          checkout_session_id: checkoutSession.id,
        });
        // Continue and return success anyway; the record can be retried via webhook
      }
    } catch (dbError) {
      logApiError('seller_checkout: transaction insert exception', dbError, {
        seller_id,
        checkout_session_id: checkoutSession.id,
      });
      // Continue and return success; the record can be reconciled later
    }

    // Return successful checkout response
    const response: SellerCheckoutResponse = {
      checkout_url: checkoutSession.url!,
      session_id: checkoutSession.id,
      z3_verification: feeCalc.z3_verification,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    logApiError('api/marketplace/seller-checkout POST', err, {});
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500 },
    );
  }
}

/**
 * Simple email validation helper.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
