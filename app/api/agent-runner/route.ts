import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';
import { insertRevenueEvent } from '@/lib/revenue/events';
import { ragClient } from '@/lib/rag/nvidia-client';
import type { Json } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

type AgentRunRequest = {
  goal: string;
  taskType?: 'checkout' | 'revenue_event' | 'webhook_sim' | 'rag_query' | 'rag_search';
  payload?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const req = body as AgentRunRequest | undefined;
    const goal = String(req?.goal || '').trim();
    const taskType = String(req?.taskType || 'revenue_event').trim();
    const payload = (req?.payload || {}) as Record<string, unknown>;

    if (!goal) {
      return NextResponse.json({ ok: false, error: 'goal is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const orgIdFromPayload = typeof payload.org_id === 'string' ? payload.org_id : undefined;
    const profileOrgId = user
      ? (
          await supabase
            .from('users')
            .select('org_id')
            .eq('auth_user_id', user.id)
            .maybeSingle()
        ).data?.org_id
      : undefined;

    const orgId = orgIdFromPayload || profileOrgId || null;

    const source = 'agent-runner';
    let agentResult: Record<string, unknown> = {};

    if (taskType === 'revenue_event') {
      const eventType = String(payload.event_type || payload.type || 'api_execution');
      const amount = typeof payload.amount === 'number' ? payload.amount : null;
      const currency = String(payload.currency || 'USD');

      const saved = await insertRevenueEvent({
        orgId,
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
    } else if (taskType === 'rag_query') {
      const query = String(payload.query || goal);
      const collection = payload.collection ? String(payload.collection) : undefined;
      const topK = typeof payload.top_k === 'number' ? payload.top_k : 5;

      const response = await ragClient.generate({
        messages: [{ role: 'user', content: query }],
        collection_name: collection,
        top_k: topK,
        temperature: 0.7,
        max_tokens: 1024,
      });

      agentResult = {
        action: 'rag_query',
        answer: response.choices?.[0]?.message?.content || '',
        citations: response.citations,
        usage: response.usage,
      };
    } else if (taskType === 'rag_search') {
      const query = String(payload.query || goal);
      const collection = payload.collection ? String(payload.collection) : undefined;
      const topK = typeof payload.top_k === 'number' ? payload.top_k : 10;

      const results = await ragClient.search({
        query,
        collection_name: collection,
        top_k: topK,
      });

      agentResult = {
        action: 'rag_search',
        results: results.results || [],
        total_results: results.total_results || 0,
      };
    } else {
      agentResult = {
        action: 'noop',
        message: 'No revenue action executed',
      };
    }

    const auditPayload = {
      org_id: orgId,
      user_id: user?.id || null,
      event_type: 'agent_run',
      plan_id: null,
      amount: 0,
      currency: 'USD',
      source,
      metadata: { 
        goal, 
        taskType, 
        agentResult: agentResult as Record<string, Json> 
      },
    } as const;

    const admin = getSupabaseAdmin();
    const { error: auditError } = await admin.from('revenue_events').insert(auditPayload);

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
