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

  // actorId = Supabase user UUID (auth_user_id in control-plane users table)
  if (payload.actorId) {
    const supabase = await createClient();

    const { data: user } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('auth_user_id', payload.actorId)
      .single();

    if (user) {
      await supabase.from('notifications').insert({
        org_id: user.org_id,
        user_id: user.id,
        type: 'agent_job',
        title: event === 'job.completed' ? 'Agent job completed' : `DSG event: ${event}`,
        message: payload.jobId ? `Job ${payload.jobId} finished successfully` : `Event: ${event}`,
        read: false,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
