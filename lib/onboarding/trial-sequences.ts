/**
 * Trial Onboarding Sequences
 * Automated email sequences to guide trial users to conversion
 */

import { getSupabaseAdmin } from '../supabase-server';

export type OnboardingStage =
  | 'signup'
  | 'email_verified'
  | 'first_agent_created'
  | 'first_execution'
  | 'ready_to_convert';

export interface OnboardingEmail {
  template: string;
  subject: string;
  html: string;
}

/**
 * Get onboarding email based on stage and day
 */
export function getOnboardingEmail(
  stage: OnboardingStage,
  dayNumber: number,
  userName?: string
): OnboardingEmail | null {
  const firstName = userName?.split(' ')[0] || 'there';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

  // Day 0: Welcome email (immediately after signup)
  if (dayNumber === 0) {
    return {
      template: 'welcome',
      subject: `Welcome to DSG ONE, ${firstName}! 🚀`,
      html: `
        <h2>Welcome to DSG ONE!</h2>
        <p>You're about to build your first autonomous agent. Here's what to expect:</p>
        <ol>
          <li><strong>Create an Agent</strong> (2 min) - Give it a name and description</li>
          <li><strong>Connect Tools</strong> (3 min) - Link APIs, webhooks, or integrations</li>
          <li><strong>Run It</strong> (1 min) - Execute your first agent</li>
        </ol>
        <p><a href="${appUrl}/agents?action=new" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Create Your First Agent</a></p>
        <p>Most users finish setup in 10 minutes.</p>
        <p>Need help? Reply to this email or check our <a href="${appUrl}/docs">docs</a>.</p>
      `,
    };
  }

  // Day 1: Setup guide (if no agent created yet)
  if (dayNumber === 1 && stage === 'email_verified') {
    return {
      template: 'setup_guide',
      subject: `Your 10-min setup guide for DSG`,
      html: `
        <h2>Quick Setup Guide</h2>
        <p>Hi ${firstName},</p>
        <p>Here's the fastest way to see DSG in action:</p>
        <h3>Option A: Use a Template (Fastest)</h3>
        <p><a href="${appUrl}/templates?category=automation">Browse Templates</a> - Pre-built agents you can fork in 30 seconds.</p>
        <h3>Option B: Build Your Own</h3>
        <ol>
          <li>Go to <a href="${appUrl}/agents">Agents</a> → New Agent</li>
          <li>Pick a template: "Email Automator" or "API Caller"</li>
          <li>Connect your tool (Slack, GitHub, etc.)</li>
          <li>Hit "Execute" to test</li>
        </ol>
        <p>That's it. You've built your first automation.</p>
      `,
    };
  }

  // Day 2: First execution nudge
  if (dayNumber === 2 && stage === 'first_agent_created') {
    return {
      template: 'execution_nudge',
      subject: `Ready to run your first agent?`,
      html: `
        <h2>Time for the fun part!</h2>
        <p>Your agent is ready. Let's execute it.</p>
        <p><strong>Why?</strong> Seeing it work in real-time is when it clicks.</p>
        <p><a href="${appUrl}/agents?tab=execute" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Execute Now</a></p>
        <p>It takes 5 seconds.</p>
      `,
    };
  }

  // Day 3: Celebration + upsell nudge (if executed)
  if (dayNumber === 3 && stage === 'first_execution') {
    return {
      template: 'execution_success',
      subject: `🎉 You just automated something!`,
      html: `
        <h2>Congratulations!</h2>
        <p>You just executed your first agent. That's awesome.</p>
        <p>Most people realize at this point: "Wait, I could automate SO much with this."</p>
        <p><strong>Next steps:</strong></p>
        <ul>
          <li>Create more agents (you have 5 free)</li>
          <li>Connect more tools and integrations</li>
          <li>Run on a schedule (upgrades give you unlimited)</li>
        </ul>
        <p>Ready to go bigger? Your Pro trial gives you 10,000 executions/month for $99/mo.</p>
        <p><a href="${appUrl}/pricing?source=trial-success" style="background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">See Pro Plan</a></p>
      `,
    };
  }

  // Day 5: Trial expiry warning
  if (dayNumber === 5) {
    return {
      template: 'trial_expiry_warning',
      subject: `${firstName}, your trial expires in 9 days`,
      html: `
        <h2>Heads up!</h2>
        <p>Your free DSG trial expires on [DATE].</p>
        <p><strong>Your current usage:</strong></p>
        <ul>
          <li>✅ 3 agents created</li>
          <li>✅ 127 total executions</li>
          <li>✅ $0 cost during trial</li>
        </ul>
        <p>To keep your agents running, upgrade anytime before [DATE].</p>
        <p><a href="${appUrl}/pricing" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upgrade to Pro ($99/mo)</a></p>
        <p>All your agents keep running. No interruption.</p>
      `,
    };
  }

  // Day 11: Final conversion nudge (trial ends in 3 days)
  if (dayNumber === 11) {
    return {
      template: 'final_conversion',
      subject: `Last chance: Your trial ends in 3 days`,
      html: `
        <h2>Last chance!</h2>
        <p>Your DSG trial expires on [DATE]. After that, your agents will pause.</p>
        <p><strong>Don't lose access.</strong> Upgrade now to keep everything running.</p>
        <p><a href="${appUrl}/pricing?source=trial-final" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upgrade Now</a></p>
        <p>We offer:</p>
        <ul>
          <li>Pro: $99/mo, 10,000 executions, unlimited agents</li>
          <li>Business: $299/mo, 100,000 executions, 25 agents</li>
          <li>Enterprise: $999/mo, unlimited everything</li>
        </ul>
      `,
    };
  }

  return null;
}

/**
 * Send onboarding email to trial user
 */
export async function sendOnboardingEmail(
  orgId: string,
  stage: OnboardingStage,
  dayNumber: number
): Promise<boolean> {
  const supabase = getSupabaseAdmin() as any;

  // Get org and user info
  const { data: trial } = await supabase
    .from('trial_accounts')
    .select('id,lead_id')
    .eq('org_id', orgId)
    .maybeSingle();

  if (!trial) {
    return false;
  }

  // Get user email
  const { data: user } = await supabase
    .from('users')
    .select('email,name')
    .eq('org_id', orgId)
    .maybeSingle();

  if (!user?.email) {
    return false;
  }

  // Get email template
  const email = getOnboardingEmail(stage, dayNumber, user.name);
  if (!email) {
    return false;
  }

  // Send email via Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'DSG Team <onboarding@dsg.pics>',
        to: user.email,
        subject: email.subject,
        html: email.html,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send onboarding email:', await response.text());
      return false;
    }

    // Log interaction
    if (trial.lead_id) {
      await supabase.from('lead_interactions').insert({
        lead_id: trial.lead_id,
        interaction_type: 'onboarding_email_sent',
        metadata: { template: email.template, stage, dayNumber },
      });
    }

    return true;
  } catch (error) {
    console.error('Error sending onboarding email:', error);
    return false;
  }
}

/**
 * Progress trial user to next stage
 */
export async function progressTrialStage(
  orgId: string,
  newStage: OnboardingStage
): Promise<boolean> {
  const supabase = getSupabaseAdmin() as any;

  const { error } = await supabase
    .from('trial_accounts')
    .update({
      onboarding_stage: newStage,
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId);

  return !error;
}

/**
 * Check if trial user is ready to convert
 */
export async function isReadyToConvert(orgId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin() as any;

  // Get trial account
  const { data: trial } = await supabase
    .from('trial_accounts')
    .select('total_executions,trial_start_at')
    .eq('org_id', orgId)
    .maybeSingle();

  if (!trial) {
    return false;
  }

  // Ready if: has 50+ executions, OR 3+ days into trial
  const executionsReady = trial.total_executions >= 50;
  const daysInTrial =
    (Date.now() - new Date(trial.trial_start_at).getTime()) / (24 * 60 * 60 * 1000);
  const timeReady = daysInTrial >= 3;

  return executionsReady || timeReady;
}
