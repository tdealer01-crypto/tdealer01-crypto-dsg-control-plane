/**
 * Trial Activation Events API
 * POST /api/onboarding/activation-events
 * Tracks key user actions during trial (first agent, first execution, etc.)
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import {
  progressTrialStage,
  isReadyToConvert,
  sendOnboardingEmail,
} from '../../../../lib/onboarding/trial-sequences';

export const dynamic = 'force-dynamic';

type ActivationEventType =
  | 'first_agent_created'
  | 'first_execution'
  | 'integration_added'
  | 'skill_created'
  | 'custom_trigger_setup';

interface ActivationEventRequest {
  eventType: ActivationEventType;
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('users')
      .select('org_id,is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile?.is_active || !profile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as ActivationEventRequest;
    const { eventType, metadata = {} } = body;

    // Get trial account
    const { data: trial } = await admin
      .from('trial_accounts')
      .select('id,onboarding_stage')
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (!trial || trial.onboarding_stage === 'signup') {
      // Not a trial user or hasn't verified email yet
      return NextResponse.json(
        { error: 'Not in trial or trial expired' },
        { status: 404 }
      );
    }

    // Log the activation event
    await admin.from('lead_interactions').insert({
      lead_id: trial.lead_id,
      interaction_type: `trial_${eventType}`,
      metadata: { org_id: profile.org_id, ...metadata },
    });

    // Progress user based on event
    let newStage = trial.onboarding_stage;
    let sendEmail = false;

    if (eventType === 'first_agent_created') {
      newStage = 'first_agent_created';
      sendEmail = true;
    } else if (eventType === 'first_execution') {
      newStage = 'first_execution';
      // Increment execution counter
      await admin
        .from('trial_accounts')
        .update({ total_executions: (trial as any).total_executions + 1 })
        .eq('org_id', profile.org_id);
      sendEmail = true;
    }

    // Update trial stage
    if (newStage !== trial.onboarding_stage) {
      await progressTrialStage(profile.org_id, newStage as any);
    }

    // Send onboarding email if this is a key milestone
    if (sendEmail) {
      const dayInTrial = Math.floor(
        (Date.now() - new Date((trial as any).trial_start_at).getTime()) /
          (24 * 60 * 60 * 1000)
      );
      // Send email for this milestone
      await sendOnboardingEmail(profile.org_id, newStage as any, dayInTrial);
    }

    // Check if ready to convert
    const readyToConvert = await isReadyToConvert(profile.org_id);

    return NextResponse.json(
      {
        ok: true,
        event: eventType,
        stage: newStage,
        readyToConvert,
        message: `Logged ${eventType} event`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Activation event error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to log event',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/activation-events
 * Get trial user's current activation status
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get trial status
    const { data: trial } = await admin
      .from('trial_accounts')
      .select(
        'id,onboarding_stage,total_executions,trial_start_at,trial_end_at,status'
      )
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (!trial) {
      return NextResponse.json(
        { error: 'Not in trial' },
        { status: 404 }
      );
    }

    // Calculate days remaining
    const daysRemaining = Math.ceil(
      (new Date(trial.trial_end_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    return NextResponse.json(
      {
        ok: true,
        trial: {
          status: trial.status,
          stage: trial.onboarding_stage,
          totalExecutions: trial.total_executions,
          daysRemaining,
          createdAt: trial.trial_start_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get activation status error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}
