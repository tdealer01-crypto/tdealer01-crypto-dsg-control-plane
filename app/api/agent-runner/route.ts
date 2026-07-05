import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';
import { insertRevenueEvent } from '@/lib/revenue/events';

export const dynamic = 'force-dynamic';

type AgentRunRequest = {
  goal: string;
  taskType?: 'checkout' | 'revenue_event' | 'webhook_sim';
  payload?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const parsed = await readJsonBody<AgentRunRequest>(request, { maxBytes: 12_288 });
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
    }

    const body = parsed.value;
    const goal = String(body?.goal || '').trim();
    const taskType = String(body?.taskType || 'revenue_event').trim();
    const payload = (body?.payload || {}) as Record<string, unknown>;

    if (!goal) {
      return NextResponse.json({ ok: false, error: 'goal is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const orgId = typeof payload.org_id === 'string' ? payload.org_id : (user ? undefined : null);

    if (!orgId && user) {
      const { data: profile } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (profile?.org_id) orgId = profile.org_id;
    }

    const source = 'agent-runner';
    let agentResult: Record<string, unknown> = {};

    if (taskType === 'revenue_event') {
      const eventType = String(payload.event_type || payload.type || 'api_execution');
      const amount = typeof payload.amount === 'number' ? payload.amount : null;
      const currency = String(payload.currency || 'USD');

      const saved = await insertRevenueEvent({
        orgId: orgId || null,
        userId: user?.id || null,
        eventType,
        planId: typeof payload.plan_id === 'string' ? payload.plan_id : null,
        amount,
        currency,
        source,
        metadata: { goal, payload },
      });

      agentResult = {
        action: 'revenue_event',
        eventId: saved.id,
        eventType,
        amount,
        currency,
      };
    } else if (taskType === 'checkout') {
      const plan = String(payload.plan || 'pro');
      const interval = String(payload.interval || 'monthly');
      const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

      const checkoutUrl = `${base}/api/billing/checkout?plan=${encodeURIComponent(plan)}&interval=${encodeURIComponent(interval)}`;

      agentResult = {
        action: 'checkout_redirect',
        plan,
        interval,
        checkoutUrl,
      };
    } else {
      agentResult = {
        action: 'noop',
        message: 'No revenue action executed',
      };
    }

    const admin = getSupabaseAdmin();
    const { error: auditError } = await admin
      .from('revenue_events')
      .insert({
        org_id: orgId || null,
        user_id: user?.id || null,
        event_type: 'agent_run',
        plan_id: null,
        amount: 0,
        currency: 'USD',
        source,
        metadata: { goal, taskType, agentResult },
      });

    if (auditError) {
      return handleApiError('api/agent-runner', auditError);
    }

    return NextResponse.json({
      ok: true,
      goal,
      taskType,
      agentResult,
    });
  } catch (error) {
    return handleApiError('api/agent-runner', error);
  }
}

function readJsonBody<T>(request: Request, options?: { maxBytes?: number }): Promise<
  | { ok: true; value: T }
  | { ok: false; status: number; error: string }
> {
  const maxBytes = options?.maxBytes ?? 12_288;
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    const reader = request.body?.getReader();
    if (!reader) {
      return Promise.resolve({ ok: false, status: 400, error: 'Empty request body' });
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          return Promise.resolve({ ok: false, status: 413, error: 'Request body too large' });
        }
        chunks.push(value);
      }
    }

    const text = new TextDecoder().decode(new Uint8Array(...chunks));
    const value = JSON.parse(text) as T;
    return Promise.resolve({ ok: true, value });
  } catch (error) {
    return Promise.resolve({ ok: false, status: 400, error: 'Invalid JSON body' });
  }
}
