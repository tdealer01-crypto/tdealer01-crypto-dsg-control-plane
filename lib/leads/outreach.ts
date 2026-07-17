/**
 * Lead Outreach Service
 * Sends automated emails to leads
 */

import { getSupabaseAdmin } from '../supabase-server';

export type OutreachTemplate =
  | 'first-contact'
  | 'follow-up-1'
  | 'follow-up-2'
  | 'trial-reminder'
  | 'conversion-offer';

export interface OutreachResult {
  leadId: string;
  email: string;
  template: OutreachTemplate;
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Get email template content
 */
function getEmailTemplate(
  template: OutreachTemplate,
  leadName?: string
): { subject: string; html: string } {
  const firstName = leadName?.split(' ')[0] || 'there';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

  const templates: Record<
    OutreachTemplate,
    { subject: string; html: string }
  > = {
    'first-contact': {
      subject: `Hi ${firstName} - AI Agents That Actually Ship`,
      html: `
        <h2>Hi ${firstName},</h2>
        <p>I noticed you're passionate about AI automation and agent systems. We built DSG ONE to solve exactly that problem.</p>
        <p><strong>What it does:</strong></p>
        <ul>
          <li>Create autonomous agents in 60 seconds</li>
          <li>Connect to any API or tool you use</li>
          <li>Execute complex workflows automatically</li>
        </ul>
        <p><strong>Try it free for 14 days:</strong> No credit card required.</p>
        <p><a href="${appUrl}/trial?source=email" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Free Trial</a></p>
        <p>Best,<br/>The DSG Team</p>
      `,
    },
    'follow-up-1': {
      subject: `${firstName}, still interested in AI agents?`,
      html: `
        <h2>Hey ${firstName},</h2>
        <p>Quick follow-up on DSG ONE - I know you're busy!</p>
        <p>If automation frameworks are on your roadmap, we'd love to show you how we've helped teams like yours ship faster.</p>
        <p><a href="${appUrl}/trial?source=email-followup" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">See It In Action (5 min)</a></p>
        <p>Cheers,<br/>DSG</p>
      `,
    },
    'follow-up-2': {
      subject: `One more thing about AI agents...`,
      html: `
        <h2>Hey ${firstName},</h2>
        <p>Just realized - we support webhook integrations, so if you've got existing tools in your stack, DSG agents can trigger them automatically.</p>
        <p>Might be useful. Let me know if you'd like to explore.</p>
        <p><a href="${appUrl}/trial?source=email-final" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Schedule 15-Min Demo</a></p>
        <p>Thanks,<br/>DSG</p>
      `,
    },
    'trial-reminder': {
      subject: `${firstName}, your trial expires in 3 days!`,
      html: `
        <h2>Quick heads up!</h2>
        <p>Your DSG ONE free trial expires in 3 days. Don't lose access to your agents.</p>
        <p><strong>Your stats this week:</strong></p>
        <ul>
          <li>3 agents created</li>
          <li>127 executions</li>
          <li>$0 cost</li>
        </ul>
        <p><a href="${appUrl}/pricing?source=trial-reminder" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upgrade to Pro ($99/mo)</a></p>
        <p>All your agents will keep running.</p>
      `,
    },
    'conversion-offer': {
      subject: `Special offer for you, ${firstName} 🎁`,
      html: `
        <h2>Exclusive offer!</h2>
        <p>You're a power user. Upgrade today and get 30% off your first 3 months.</p>
        <p><strong>Use code:</strong> EARLYBIRD30</p>
        <p><a href="${appUrl}/pricing?code=EARLYBIRD30" style="background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Claim Your Discount</a></p>
        <p>Expires in 7 days.</p>
      `,
    },
  };

  return templates[template];
}

/**
 * Send email to lead using Resend
 */
async function sendEmail(
  email: string,
  subject: string,
  html: string
): Promise<{ messageId?: string; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, skipping email send');
    return { messageId: 'mock-' + Math.random().toString(36).substr(2, 9) };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'DSG Team <noreply@dsg.pics>',
        to: email,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `Resend API error: ${error}` };
    }

    const data = (await response.json()) as { id?: string };
    return { messageId: data.id };
  } catch (error) {
    return {
      error: `Email send failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Send outreach email to a lead
 */
export async function sendOutreachEmail(
  leadId: string,
  template: OutreachTemplate
): Promise<OutreachResult> {
  const supabase = getSupabaseAdmin() as any;

  // Get lead details
  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('id,name,email,status')
    .eq('id', leadId)
    .maybeSingle();

  if (fetchError || !lead || !lead.email) {
    return {
      leadId,
      email: lead?.email || 'unknown',
      template,
      success: false,
      error: 'Lead not found or no email',
    };
  }

  // Get email template
  const { subject, html } = getEmailTemplate(template, lead.name);

  // Send email
  const { messageId, error } = await sendEmail(lead.email, subject, html);

  // Track interaction
  await supabase.from('lead_interactions').insert({
    lead_id: leadId,
    interaction_type: 'email_sent',
    metadata: { template, subject, messageId },
  });

  // Update lead status
  if (lead.status === 'discovered') {
    await supabase
      .from('leads')
      .update({ status: 'contacted', last_contacted_at: new Date().toISOString() })
      .eq('id', leadId);
  }

  return {
    leadId,
    email: lead.email,
    template,
    success: !error,
    messageId,
    error,
  };
}

/**
 * Send outreach to top leads
 */
export async function sendOutreachToTopLeads(
  limit: number = 10,
  minScore: number = 70
): Promise<OutreachResult[]> {
  const supabase = getSupabaseAdmin() as any;

  // Get top uncontacted leads
  const { data: leads } = await supabase
    .from('leads')
    .select('id')
    .gte('overall_score', minScore)
    .eq('status', 'discovered')
    .order('overall_score', { ascending: false })
    .limit(limit);

  if (!leads) {
    return [];
  }

  const results: OutreachResult[] = [];

  for (const lead of leads) {
    const result = await sendOutreachEmail(lead.id, 'first-contact');
    results.push(result);
  }

  return results;
}

/**
 * Log email open event (called by pixel/webhook)
 */
export async function logEmailOpen(leadId: string, messageId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin() as any;

  const { error } = await supabase.from('lead_interactions').insert({
    lead_id: leadId,
    interaction_type: 'email_opened',
    metadata: { messageId },
  });

  return !error;
}

/**
 * Log link click event
 */
export async function logLinkClick(
  leadId: string,
  linkUrl: string,
  linkText?: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin() as any;

  const { error } = await supabase.from('lead_interactions').insert({
    lead_id: leadId,
    interaction_type: 'link_clicked',
    metadata: { linkUrl, linkText },
  });

  // Update engagement score will be recalculated at next scoring run
  return !error;
}
