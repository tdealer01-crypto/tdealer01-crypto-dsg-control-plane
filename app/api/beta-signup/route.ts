/**
 * POST /api/beta-signup
 * Capture beta signups from ProductHunt + landing pages
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface BetaSignupRequest {
  email: string;
  firstName?: string;
  companyName?: string;
  productInterest?: 'agent_governance' | 'compliance_proof' | 'policy_gates' | 'all';
  source?: 'producthunt' | 'twitter' | 'email' | 'landing_page' | 'referral' | 'other';
  notes?: string;
}

interface BetaSignupResponse {
  success: boolean;
  signupId?: string;
  message: string;
  promoCode?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BetaSignupRequest;

    // Validate email
    if (!body.email || !body.email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Valid email required' },
        { status: 400 },
      );
    }

    // Validate source
    const validSources = ['producthunt', 'twitter', 'email', 'landing_page', 'referral', 'other'];
    const source = validSources.includes(body.source || 'other') ? body.source : 'other';

    // Validate product interest
    const productInterest = body.productInterest || 'all';

    // Generate signup ID
    const signupId = `signup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate promo code (first 3 signups get $49/mo Pro pricing)
    const signupNumber = Math.floor(Math.random() * 10000);
    const promoCode = signupNumber <= 3 ? `EARLY_BIRD_${signupNumber}` : undefined;

    // Log signup (in production, save to Supabase or database)
    console.log('[Beta Signup]', {
      signupId,
      email: body.email,
      firstName: body.firstName,
      companyName: body.companyName,
      productInterest,
      source,
      promoCode,
      timestamp: new Date().toISOString(),
    });

    // Send confirmation email (in production, use Resend)
    if (promoCode) {
      console.log(`[Email] Send promo code ${promoCode} to ${body.email}`);
    }

    return NextResponse.json({
      success: true,
      signupId,
      message: promoCode
        ? `Welcome! You're in the limited offer group. Use code ${promoCode} for Pro pricing at $49/mo for life.`
        : 'Welcome! Check your email for next steps.',
      promoCode,
    });
  } catch (error) {
    console.error('[Beta Signup Error]', error);
    return NextResponse.json(
      { success: false, message: 'Signup failed. Please try again.' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/beta-signup/status
 * Check if email is already signed up
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { exists: false, message: 'Email parameter required' },
        { status: 400 },
      );
    }

    // In production, check database
    // For now, always return false (not signed up)

    return NextResponse.json({
      exists: false,
      message: 'Email not yet signed up',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 500 },
    );
  }
}
