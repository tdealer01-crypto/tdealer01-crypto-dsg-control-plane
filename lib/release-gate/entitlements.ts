import { getSupabaseAdmin } from '../supabase-server';

/**
 * Check if user has active Release Gate Pro access
 * @param email User email address
 * @returns true if user has active or trialing subscription
 * @throws Error if database connection fails
 */
export async function hasReleaseGateProAccess(email: string | null) {
  // ✅ Security: Validate email is provided
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return false;
  }

  try {
    const supabase = getSupabaseAdmin() as any;

    // ✅ Query with timeout protection
    const { data, error } = await Promise.race([
      supabase
        .from('release_gate_entitlements')
        .select('id, status, current_period_end')
        .eq('email', email.toLowerCase()) // Normalize email
        .in('status', ['active', 'trialing'])
        .limit(1),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      ),
    ]);

    // ✅ Handle database errors gracefully
    if (error) {
      console.error('Database error checking entitlements:', error);
      throw new Error(`Entitlements check failed: ${error.message}`);
    }

    // ✅ Validate response structure
    if (!Array.isArray(data)) {
      console.warn('Unexpected response format from entitlements query');
      return false;
    }

    // ✅ Additional validation: check if subscription is still valid
    if (data.length > 0) {
      const record = data[0];
      const now = new Date();
      const expiresAt = record.current_period_end
        ? new Date(record.current_period_end)
        : null;

      // Make sure subscription hasn't expired
      if (expiresAt && expiresAt < now) {
        console.warn('Subscription expired for user', email);
        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Exception in hasReleaseGateProAccess:', error);
    // ✅ Never throw - return false on any error
    // This allows free users to continue even if DB is down
    return false;
  }
}

/**
 * Record subscription event in the database
 * Used by Stripe webhook to update entitlements
 * @param email User email
 * @param stripeCustomerId Stripe customer ID
 * @param stripeSubscriptionId Stripe subscription ID
 * @param status Subscription status (active, trialing, past_due, canceled)
 * @param currentPeriodEnd Subscription renewal date
 */
export async function recordSubscriptionEvent(
  email: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  status: 'active' | 'trialing' | 'past_due' | 'canceled',
  currentPeriodEnd: Date
) {
  if (!email || !stripeCustomerId || !stripeSubscriptionId) {
    console.error('Missing required fields for subscription event');
    return false;
  }

  try {
    const supabase = getSupabaseAdmin() as any;

    // ✅ Upsert to handle updates and inserts
    const { error } = await supabase
      .from('release_gate_entitlements')
      .upsert(
        {
          email: email.toLowerCase(),
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          status: status,
          current_period_end: currentPeriodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_subscription_id' }
      );

    if (error) {
      console.error('Failed to record subscription event:', error);
      return false;
    }

    console.log('Subscription event recorded for', email, 'status:', status);
    return true;
  } catch (error) {
    console.error('Exception in recordSubscriptionEvent:', error);
    return false;
  }
}
