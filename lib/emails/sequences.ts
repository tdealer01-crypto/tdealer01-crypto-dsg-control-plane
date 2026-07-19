import { createClient } from '../supabase/server';

type Lead = any;

interface SequenceTriggerEvent {
  leadId: string;
  event: 'lead_discovered' | 'trial_started' | 'high_icp_score';
  lead: Lead;
}

// Trigger a sequence for a lead
export async function triggerSequenceForLead(event: SequenceTriggerEvent) {
  const supabase = await createClient();

  // Check if lead is unsubscribed
  // @ts-ignore - email_unsubscribes table added in migration, not yet in generated types
  const { data: unsubscribed } = await supabase
    .from('email_unsubscribes')
    .select('id')
    .eq('lead_email', event.lead.email)
    .limit(1)
    .single();

  if (unsubscribed) return; // Skip unsubscribed leads

  // Find matching sequences for this event
  // @ts-ignore - email_sequences table added in migration, not yet in generated types
  const { data: sequences } = await supabase
    .from('email_sequences')
    .select('*')
    .eq('trigger_event', event.event)
    .eq('is_active', true);

  if (!sequences) return;

  for (const sequence of sequences as any[]) {
    // Check ICP score threshold
    if (event.lead.icp_score && event.lead.icp_score < (sequence.min_icp_score || 0)) {
      continue;
    }

    // Check platform filter
    if (sequence.target_platforms && sequence.target_platforms.length > 0) {
      if (!sequence.target_platforms.includes(event.lead.source_platform || 'other')) {
        continue;
      }
    }

    // Schedule all steps for this sequence
    await scheduleSequenceSteps(event.leadId, sequence.id);
  }
}

// Schedule sequence steps for a lead
async function scheduleSequenceSteps(leadId: string, sequenceId: string) {
  const supabase = await createClient();

  // Get all steps for this sequence
  // @ts-ignore - email_sequence_steps table added in migration, not yet in generated types
  const { data: steps } = await supabase
    .from('email_sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .order('step_order', { ascending: true });

  if (!steps) return;

  const now = new Date();

  // Schedule each step
  for (const step of steps as any[]) {
    const scheduledFor = new Date(now);
    scheduledFor.setDate(scheduledFor.getDate() + step.delay_days);

    // @ts-ignore - email_scheduled_sends table added in migration, not yet in generated types
    await supabase.from('email_scheduled_sends').insert({
      lead_id: leadId,
      sequence_id: sequenceId,
      step_id: step.id,
      scheduled_for: scheduledFor.toISOString(),
    });
  }
}

// Send pending emails (called by cron job)
export async function sendPendingEmails(limit: number = 100) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Get pending sends
  // @ts-ignore - email_scheduled_sends table added in migration, not yet in generated types
  const { data: sends } = await supabase
    .from('email_scheduled_sends')
    .select(
      `
      id,
      lead_id,
      scheduled_for,
      email_sequence_steps(
        id,
        email_templates(id, subject, body)
      ),
      leads(id, email, name, company, icp_score)
    `
    )
    .is('sent_at', null)
    .lte('scheduled_for', now)
    .limit(limit);

  if (!sends || sends.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const send of sends as any[]) {
    try {
      const lead = send.leads as any;
      const step = send.email_sequence_steps as any;
      const template = step?.email_templates;

      if (!template || !lead) {
        throw new Error('Missing template or lead data');
      }

      // Send via Resend
      await sendEmail({
        to: lead.email,
        subject: template.subject,
        body: template.body,
        fromName: 'DSG',
        trackingId: send.id,
      });

      // Mark as sent
      // @ts-ignore - email_scheduled_sends table added in migration, not yet in generated types
      await supabase
        .from('email_scheduled_sends')
        .update({ sent_at: now })
        .eq('id', send.id);

      sent++;
    } catch (err) {
      console.error(`Failed to send email ${send.id}:`, err);

      // @ts-ignore - email_scheduled_sends table added in migration, not yet in generated types
      await supabase
        .from('email_scheduled_sends')
        .update({
          failed: true,
          failure_reason: err instanceof Error ? err.message : 'Unknown error',
        })
        .eq('id', send.id);

      failed++;
    }
  }

  return { sent, failed };
}

// Send email via Resend (or other service)
async function sendEmail(options: {
  to: string;
  subject: string;
  body: string;
  fromName: string;
  trackingId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  // Track opens/clicks via pixel and link wrapping
  const trackingPixel = `<img src="https://tdealer01-crypto-dsg-control-plane.vercel.app/api/emails/track/open/${options.trackingId}" width="1" height="1" alt="" />`;

  const htmlBody = `
    ${options.body}
    ${trackingPixel}
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${options.fromName} <noreply@dsg.pics>`,
      to: options.to,
      subject: options.subject,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API error: ${response.statusText}`);
  }

  return response.json();
}

// Record email engagement
export async function recordEmailEngagement(
  scheduledSendId: string,
  leadId: string,
  eventType: 'opened' | 'clicked' | 'bounced' | 'unsubscribed',
  clickedLink?: string
) {
  const supabase = await createClient();

  // @ts-ignore - email_engagement table added in migration, not yet in generated types
  await supabase.from('email_engagement').insert({
    scheduled_send_id: scheduledSendId,
    lead_id: leadId,
    event_type: eventType,
    clicked_link: clickedLink,
  });
}

// Unsubscribe a lead
export async function unsubscribeLead(email: string, reason?: string) {
  const supabase = await createClient();

  // @ts-ignore - email_unsubscribes table added in migration, not yet in generated types
  await supabase.from('email_unsubscribes').upsert({
    lead_email: email,
    reason,
  });
}

// Get sequence templates
export async function getSequenceTemplates(sequenceId: string) {
  const supabase = await createClient();

  // @ts-ignore - email_sequence_steps table added in migration, not yet in generated types
  const { data } = await supabase
    .from('email_sequence_steps')
    .select('id, step_order, delay_days, email_templates(*)')
    .eq('sequence_id', sequenceId)
    .order('step_order', { ascending: true });

  return data || [];
}

// Get engagement stats for a sequence
export async function getSequenceEngagementStats(sequenceId: string) {
  const supabase = await createClient();

  // @ts-ignore - email_scheduled_sends table added in migration, not yet in generated types
  const { data: sends } = await supabase
    .from('email_scheduled_sends')
    .select('id')
    .eq('sequence_id', sequenceId);

  // @ts-ignore - email_engagement table added in migration, not yet in generated types
  const { data: opens } = await supabase
    .from('email_engagement')
    .select('id', { count: 'exact' })
    .eq('event_type', 'opened')
    .in('scheduled_send_id', sends?.map(s => s.id) || []);

  // @ts-ignore - email_engagement table added in migration, not yet in generated types
  const { data: clicks } = await supabase
    .from('email_engagement')
    .select('id', { count: 'exact' })
    .eq('event_type', 'clicked')
    .in('scheduled_send_id', sends?.map(s => s.id) || []);

  return {
    totalSent: sends?.length || 0,
    opens: opens?.length || 0,
    clicks: clicks?.length || 0,
    openRate: sends?.length ? ((opens?.length || 0) / sends.length) * 100 : 0,
    clickRate: sends?.length ? ((clicks?.length || 0) / sends.length) * 100 : 0,
  };
}
