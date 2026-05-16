import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@/lib/supabase/server';

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

type DsgWebhookPayload = {
  event: string;
  payload: {
    workspaceId?: string;
    actorId?: string;
    jobId?: string;
    reportHash?: string;
  };
  timestamp: number;
};

export async function POST(req: NextRequest) {
  const secret = process.env.DSG_INCOMING_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });

  const rawBody = await req.text();
  if (!verifySignature(rawBody, req.headers.get('x-dsg-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const { event, payload } = JSON.parse(rawBody) as DsgWebhookPayload;

  if (payload.workspaceId && payload.actorId) {
    const supabase = await createClient();

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('dsg_workspace_id', payload.workspaceId)
      .single();

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', payload.actorId)
      .eq('org_id', org?.id ?? '')
      .single();

    if (org && user) {
      await supabase.from('notifications').insert({
        org_id: org.id,
        user_id: user.id,
        type: 'agent_job',
        title: `Agent job ${event === 'job.completed' ? 'completed' : event}`,
        message: payload.jobId
          ? `Job ${payload.jobId} finished successfully`
          : `DSG agent event: ${event}`,
        read: false,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
