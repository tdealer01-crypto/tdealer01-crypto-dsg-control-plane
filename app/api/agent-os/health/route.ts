import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/security/api-error';
import { eventBus, getAgentOSHealth, initializeAgentOS } from '@/lib/dsg/agent-os';
import { resolveEnv } from '@/lib/dsg/agent-os/env-resolver';

export const dynamic = 'force-dynamic';

/**
 * Agent OS live health probe.
 *
 * Boots the Agent OS stack (registry, event bus, shared memory, model router,
 * executive hierarchy) with env resolved centrally (process.env first, then the
 * dsg_secrets table), publishes a heartbeat over the event bus, and returns
 * component health plus an env report (names + sources only, never values).
 */
export async function GET() {
  try {
    const { values, report } = await resolveEnv([
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'REDIS_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ANTHROPIC_API_KEY',
      'OPENROUTER_API_KEY',
      'NVIDIA_API_KEY',
    ]);

    const init = await initializeAgentOS({
      upstashUrl: values.UPSTASH_REDIS_REST_URL,
      upstashToken: values.UPSTASH_REDIS_REST_TOKEN,
      redisUrl: values.REDIS_URL,
      supabaseUrl: values.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceKey: values.SUPABASE_SERVICE_ROLE_KEY,
    });

    const heartbeat = await eventBus.publish({
      type: 'agent-os.heartbeat',
      sourceAgentId: 'agent-os-health-probe',
      payload: { at: new Date().toISOString() },
      priority: 'low',
    });

    const health = await getAgentOSHealth();

    return NextResponse.json({
      ok: true,
      init,
      health,
      heartbeatEvent: { id: heartbeat.id, evidenceHash: heartbeat.evidenceHash },
      env: report,
      notes: [
        'env sources: process.env first, dsg_secrets fallback; values are never returned.',
        'Agent OS components are in-memory per serverless invocation; stats reset between requests.',
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError('api/agent-os/health', error);
  }
}
