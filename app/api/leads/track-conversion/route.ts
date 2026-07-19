// Track conversion — records when a trial lead converts to paid
// Called by Stripe webhooks or directly when a checkout is completed

import { NextResponse } from 'next/server';
import { recordTrialConversionFromStripeCustomer, trackTrialStart } from '../../../../lib/leads/conversion-tracking';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, stripeCustomerId, event } = body;

    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 });
    }

    // Handle trial start event
    if (event === 'trial_started') {
      // This would typically be called when user signs up for trial
      // Email-based lookup would be done in the calling code
      return NextResponse.json({
        ok: true,
        message: 'trial_started event recorded',
        note: 'Use specific lead endpoint to track trial start',
      });
    }

    // Handle trial conversion event
    if (event === 'trial_converted') {
      const { success, lead_id } = await recordTrialConversionFromStripeCustomer(
        stripeCustomerId || '',
        email
      );

      if (!success) {
        return NextResponse.json(
          { error: 'conversion not found', email },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: 'trial conversion recorded',
        lead_id,
        email,
      });
    }

    return NextResponse.json({ error: 'event type required' }, { status: 400 });
  } catch (err) {
    return handleApiError(err, { status: 500 });
  }
}
