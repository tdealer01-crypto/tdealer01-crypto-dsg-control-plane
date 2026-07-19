import { getSupabaseAdmin } from '../supabase-server';

export type ConversionEvent = {
  lead_id: string;
  email: string;
  event_type: 'trial_started' | 'trial_ended' | 'converted_to_paid' | 'churned';
  metadata?: Record<string, any>;
};

export type ConversionMetrics = {
  total_trials: number;
  conversions: number;
  conversion_rate: number;
  churn_rate: number;
  avg_trial_days: number;
  revenue_attributed: number;
};

// Track trial start event
export async function trackTrialStart(lead: { id: string; email: string }): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await (supabase as any)
    .from('leads')
    .update({
      trial_started_at: new Date().toISOString(),
    })
    .eq('id', lead.id);

  if (error) {
    console.error('[Trial Start] Failed to track:', error);
    return false;
  }

  return true;
}

// Track trial-to-paid conversion
export async function trackTrialConversion(lead: {
  id: string;
  email: string;
  stripeCustomerId?: string;
}): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await (supabase as any)
    .from('leads')
    .update({
      trial_converted: true,
      trial_converted_at: new Date().toISOString(),
      converted: true,
    })
    .eq('id', lead.id);

  if (error) {
    console.error('[Trial Conversion] Failed to track:', error);
    return false;
  }

  return true;
}

// Get lead that started trial (webhook from app would call this)
export async function recordTrialConversionFromStripeCustomer(
  stripeCustomerId: string,
  checkoutEmail?: string
): Promise<{ success: boolean; lead_id?: string }> {
  const supabase = getSupabaseAdmin();

  try {
    // Find lead by email or customer metadata
    const { data: leads, error } = await (supabase as any)
      .from('leads')
      .select('id,email')
      .eq('email', checkoutEmail || '')
      .is('trial_converted', false)
      .not('trial_started_at', 'is', null)
      .limit(1);

    if (error || !leads || leads.length === 0) {
      console.log('[Trial Conversion] No matching lead found for', checkoutEmail);
      return { success: false };
    }

    const lead = leads[0];
    const success = await trackTrialConversion({
      id: lead.id,
      email: lead.email,
      stripeCustomerId,
    });

    return { success, lead_id: success ? lead.id : undefined };
  } catch (err) {
    console.error('[Trial Conversion] Error:', err);
    return { success: false };
  }
}

// Get conversion metrics for dashboard
export async function getConversionMetrics(
  startDate?: string,
  endDate?: string
): Promise<ConversionMetrics> {
  const supabase = getSupabaseAdmin();

  const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const end = endDate || new Date().toISOString();

  try {
    // Get all trials in period
    const { data: trials } = await (supabase as any)
      .from('leads')
      .select('id,trial_started_at,trial_converted_at,trial_converted')
      .not('trial_started_at', 'is', null)
      .gte('trial_started_at', start)
      .lte('trial_started_at', end);

    if (!trials || trials.length === 0) {
      return {
        total_trials: 0,
        conversions: 0,
        conversion_rate: 0,
        churn_rate: 0,
        avg_trial_days: 0,
        revenue_attributed: 0,
      };
    }

    const conversions = trials.filter((t: any) => t.trial_converted).length;
    const conversionRate = (conversions / trials.length) * 100;

    // Calculate average trial duration
    const trialDurations = trials
      .filter((t: any) => t.trial_converted_at)
      .map((t: any) => {
        const start = new Date(t.trial_started_at);
        const end = new Date(t.trial_converted_at);
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      });

    const avgTrialDays =
      trialDurations.length > 0 ? Math.round(trialDurations.reduce((a, b) => a + b, 0) / trialDurations.length) : 0;

    return {
      total_trials: trials.length,
      conversions,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      churn_rate: Math.round((1 - conversionRate / 100) * 10000) / 100,
      avg_trial_days: avgTrialDays,
      revenue_attributed: 0, // Would come from Stripe integration
    };
  } catch (err) {
    console.error('[Conversion Metrics] Error:', err);
    return {
      total_trials: 0,
      conversions: 0,
      conversion_rate: 0,
      churn_rate: 0,
      avg_trial_days: 0,
      revenue_attributed: 0,
    };
  }
}

// Get high-conversion leads (those most likely to convert)
export async function getHighConversionPotential(limit: number = 50): Promise<any[]> {
  const supabase = getSupabaseAdmin();

  try {
    const { data: leads } = await (supabase as any)
      .from('leads')
      .select('id,email,company,framework,icp_score,intent_score,trial_started_at')
      .eq('trial_started_at', null) // Leads not yet in trial
      .eq('outreach_sent', true)
      .gt('icp_score', 65)
      .order('icp_score', { ascending: false })
      .limit(limit);

    return leads || [];
  } catch (err) {
    console.error('[High Conversion Potential] Error:', err);
    return [];
  }
}

// Track trial end/churn (would be called when trial expires)
export async function trackTrialChurn(lead: { id: string; email: string }): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  try {
    const { error } = await (supabase as any)
      .from('leads')
      .update({
        trial_converted: false, // Explicitly mark as not converted
      })
      .eq('id', lead.id)
      .eq('trial_converted', false); // Only update if not already converted

    return !error;
  } catch (err) {
    console.error('[Trial Churn] Error:', err);
    return false;
  }
}

// Get conversion funnel breakdown
export async function getConversionFunnel(daysBack: number = 30): Promise<any> {
  const supabase = getSupabaseAdmin();

  try {
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // Stage 1: Leads discovered
    const { data: discovered } = await (supabase as any)
      .from('leads')
      .select('id')
      .gte('created_at', startDate);

    // Stage 2: Outreach sent
    const { data: contacted } = await (supabase as any)
      .from('leads')
      .select('id')
      .gte('created_at', startDate)
      .eq('outreach_sent', true);

    // Stage 3: Trial started
    const { data: trialsStarted } = await (supabase as any)
      .from('leads')
      .select('id')
      .gte('created_at', startDate)
      .not('trial_started_at', 'is', null);

    // Stage 4: Converted to paid
    const { data: converted } = await (supabase as any)
      .from('leads')
      .select('id')
      .gte('created_at', startDate)
      .eq('trial_converted', true);

    const discoveredCount = discovered?.length || 0;
    const contactedCount = contacted?.length || 0;
    const trialsStartedCount = trialsStarted?.length || 0;
    const convertedCount = converted?.length || 0;

    return {
      stage_discovered: {
        count: discoveredCount,
        percentage: 100,
      },
      stage_contacted: {
        count: contactedCount,
        percentage: discoveredCount > 0 ? Math.round((contactedCount / discoveredCount) * 100 * 100) / 100 : 0,
      },
      stage_trial: {
        count: trialsStartedCount,
        percentage: discoveredCount > 0 ? Math.round((trialsStartedCount / discoveredCount) * 100 * 100) / 100 : 0,
      },
      stage_converted: {
        count: convertedCount,
        percentage: discoveredCount > 0 ? Math.round((convertedCount / discoveredCount) * 100 * 100) / 100 : 0,
      },
      conversion_rate_trial_to_paid: trialsStartedCount > 0 ? Math.round((convertedCount / trialsStartedCount) * 100 * 100) / 100 : 0,
    };
  } catch (err) {
    console.error('[Conversion Funnel] Error:', err);
    return null;
  }
}

// Link trial start to Stripe checkout session (webhook integration)
export async function linkTrialToCheckout(
  checkoutSessionId: string,
  leadEmail: string
): Promise<{ success: boolean }> {
  const supabase = getSupabaseAdmin();

  try {
    const { data: lead } = await (supabase as any)
      .from('leads')
      .select('id')
      .eq('email', leadEmail)
      .limit(1);

    if (!lead || lead.length === 0) {
      console.log('[Link Trial] Lead not found:', leadEmail);
      return { success: false };
    }

    // Record trial start
    const success = await trackTrialStart({
      id: lead[0].id,
      email: leadEmail,
    });

    return { success };
  } catch (err) {
    console.error('[Link Trial] Error:', err);
    return { success: false };
  }
}
