import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';

export const dynamic = 'force-dynamic';

function maskConfiguredSecret(value: string | null | undefined) {
  if (!value) return null;
  const suffix = value.slice(-4);
  return suffix ? `configured:••••${suffix}` : 'configured';
}

async function getUserAndOrg(supabase: Awaited<ReturnType<typeof createClient>>, authUserId: string) {
  const { data } = await supabase
    .from('users')
    .select('id, org_id')
    .eq('auth_user_id', authUserId)
    .single();
  return { dbUserId: data?.id ?? null, orgId: data?.org_id ?? null };
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dbUserId, orgId } = await getUserAndOrg(supabase, user.id);
  if (!dbUserId || !orgId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('email, slack, pagerduty, slack_webhook_url, pagerduty_key')
    .eq('user_id', dbUserId)
    .maybeSingle();

  // Return defaults if no row exists yet
  const preferences = {
    email: {
      approvalRequests: true,
      gateBlock: settings?.email ?? true,
      agentFailures: settings?.email ?? true,
      weeklyGovernance: false,
      billingAlerts: settings?.email ?? true,
    },
    slack: {
      connected: settings?.slack ?? false,
      channelId: null as string | null,
      events: ['approval.required', 'agent.failed', 'gate.evaluated'],
      webhookUrl: null as string | null,
      secretConfigured: Boolean(settings?.slack_webhook_url),
      secretPreview: maskConfiguredSecret(settings?.slack_webhook_url),
    },
    pagerduty: {
      connected: settings?.pagerduty ?? false,
      integrationKey: null as string | null,
      secretConfigured: Boolean(settings?.pagerduty_key),
      secretPreview: maskConfiguredSecret(settings?.pagerduty_key),
      triggerOn: ['agent.failed'],
    },
  };

  return NextResponse.json({ preferences });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const access = await requireOrgPermission('org.manage_notifications');
  if (access.ok !== true) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dbUserId, orgId } = await getUserAndOrg(supabase, user.id);
  if (!dbUserId || !orgId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Read current settings to merge
  const { data: current } = await supabase
    .from('notification_settings')
    .select('email, slack, pagerduty, slack_webhook_url, pagerduty_key')
    .eq('user_id', dbUserId)
    .maybeSingle();

  const emailEnabled = (body.email && typeof (body.email as Record<string, unknown>).gateBlock === 'boolean')
    ? (body.email as Record<string, unknown>).gateBlock as boolean
    : (current?.email ?? true);

  const slackEnabled = (body.slack && typeof (body.slack as Record<string, unknown>).connected === 'boolean')
    ? (body.slack as Record<string, unknown>).connected as boolean
    : (current?.slack ?? false);

  const slackWebhookUrl = (body.slack && typeof (body.slack as Record<string, unknown>).webhookUrl === 'string')
    ? (body.slack as Record<string, unknown>).webhookUrl as string
    : (current?.slack_webhook_url ?? null);

  const pagerdutyEnabled = (body.pagerduty && typeof (body.pagerduty as Record<string, unknown>).connected === 'boolean')
    ? (body.pagerduty as Record<string, unknown>).connected as boolean
    : (current?.pagerduty ?? false);

  const pagerdutyKey = (body.pagerduty && typeof (body.pagerduty as Record<string, unknown>).integrationKey === 'string')
    ? (body.pagerduty as Record<string, unknown>).integrationKey as string
    : (current?.pagerduty_key ?? null);

  const { error: upsertError } = await supabase
    .from('notification_settings')
    .upsert(
      {
        org_id: orgId,
        user_id: dbUserId,
        email: emailEnabled,
        slack: slackEnabled,
        pagerduty: pagerdutyEnabled,
        slack_webhook_url: slackWebhookUrl,
        pagerduty_key: pagerdutyKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  const preferences = {
    email: {
      approvalRequests: true,
      gateBlock: emailEnabled,
      agentFailures: emailEnabled,
      weeklyGovernance: false,
      billingAlerts: emailEnabled,
    },
    slack: {
      connected: slackEnabled,
      channelId: null as string | null,
      events: ['approval.required', 'agent.failed', 'gate.evaluated'],
      webhookUrl: null as string | null,
      secretConfigured: Boolean(slackWebhookUrl),
      secretPreview: maskConfiguredSecret(slackWebhookUrl),
    },
    pagerduty: {
      connected: pagerdutyEnabled,
      integrationKey: null as string | null,
      secretConfigured: Boolean(pagerdutyKey),
      secretPreview: maskConfiguredSecret(pagerdutyKey),
      triggerOn: ['agent.failed'],
    },
  };

  return NextResponse.json({ preferences });
}
