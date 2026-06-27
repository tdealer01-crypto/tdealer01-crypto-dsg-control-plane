import { randomUUID, createHash } from 'crypto';
import { getSupabaseAdmin } from '../supabase-server';
import { decryptSecret, createWebhookSignature } from '../security/secret-crypto';

export type IntegrationEvent =
  | 'execution.completed'
  | 'execution.initiated'
  | 'execution.failed'
  | 'gate.evaluated'
  | 'gate.approved'
  | 'gate.rejected'
  | 'gate.blocked'
  | 'review.required'
  | 'action.approved'
  | 'action.blocked'
  | 'action.reviewed'
  | 'proof.created'
  | 'proof.scan_completed'
  | 'agent.created'
  | 'agent.started'
  | 'agent.completed'
  | 'agent.failed';

export interface IntegrationWebhookPayload {
  event: IntegrationEvent;
  org_id: string;
  agent_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
  delivery_id: string;
}

interface IntegrationProfile {
  id: string;
  org_id: string;
  agent_id: string;
  webhook_url: string | null;
  status: 'active' | 'disabled';
  webhook_secret_encrypted?: string;
}

interface WebhookDeliveryRecord {
  webhook_id: string;
  event: string;
  status: 'delivered' | 'failed' | 'dead_letter' | 'retrying';
  response_code: number | null;
  duration_ms: number;
  attempt: number;
  error_message: string | null;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown> | null;
  created_at: string;
}

interface DeliveryResult {
  status: number;
  durationMs: number;
  responseBody: string;
  error: string | null;
  payload: IntegrationWebhookPayload;
}

const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 1_000;

function buildHeaders(
  webhookId: string,
  secret: string,
  payload: IntegrationWebhookPayload,
  payloadStr: string,
): Record<string, string> {
  const signature = createWebhookSignature(secret, payload.timestamp, payloadStr);
  return {
    'content-type': 'application/json',
    'x-dsg-event': payload.event,
    'x-dsg-org-id': payload.org_id,
    'x-dsg-agent-id': payload.agent_id,
    'x-dsg-webhook-id': webhookId,
    'x-dsg-timestamp': payload.timestamp,
    'x-dsg-signature': signature,
    'x-dsg-delivery-id': payload.delivery_id,
  };
}

async function deliverToUrl(
  webhookId: string,
  webhookSecret: string,
  url: string,
  payload: Omit<IntegrationWebhookPayload, 'timestamp'>,
  attempt: number,
): Promise<DeliveryResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  const payloadWithMeta: IntegrationWebhookPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
    payload: {
      ...payload.payload,
      _delivery: {
        attempt,
        webhook_id: webhookId,
        delivery_id: payload.delivery_id,
      },
    },
  };
  const payloadStr = JSON.stringify(payloadWithMeta);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(webhookId, webhookSecret, payloadWithMeta, payloadStr),
      body: payloadStr,
      signal: controller.signal,
    });

    const responseBody = await res.text().catch(() => '');
    return {
      status: res.status,
      durationMs: Date.now() - start,
      responseBody,
      error: res.status >= 400 ? `HTTP ${res.status}` : null,
      payload: payloadWithMeta,
    };
  } catch (err) {
    return {
      status: 0,
      durationMs: Date.now() - start,
      responseBody: '',
      error: err instanceof Error ? err.message : 'Unknown error',
      payload: payloadWithMeta,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function recordDelivery(
  admin: ReturnType<typeof getSupabaseAdmin>,
  delivery: WebhookDeliveryRecord,
): Promise<void> {
  await (admin as any)
    .from('integration_webhook_deliveries')
    .insert(delivery)
    .catch(() => {});
}

function makeDeliveryId(webhookId: string): string {
  return createHash('sha256')
    .update(`${webhookId}:${Date.now()}:${randomUUID()}`)
    .digest('hex')
    .slice(0, 16);
}

function buildDeliveryRecord(
  webhookId: string,
  event: IntegrationEvent,
  status: WebhookDeliveryRecord['status'],
  result: DeliveryResult,
  attempt: number,
): WebhookDeliveryRecord {
  return {
    webhook_id: webhookId,
    event,
    status,
    response_code: result.status || null,
    duration_ms: result.durationMs,
    attempt,
    error_message: result.error,
    request_payload: result.payload as unknown as Record<string, unknown>,
    response_payload: result.responseBody ? { body: result.responseBody } : null,
    created_at: new Date().toISOString(),
  };
}

export async function fireIntegrationWebhook(
  orgId: string,
  event: IntegrationEvent,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = getSupabaseAdmin();

    const { data: profiles, error } = await (admin as any)
      .from('integration_profiles')
      .select('id, org_id, agent_id, webhook_url, webhook_secret_encrypted, status')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .not('webhook_url', 'is', null);

    if (error || !profiles || profiles.length === 0) {
      return;
    }

    const deliveryPromises = profiles
      .filter((p: IntegrationProfile) => p.webhook_url && p.webhook_secret_encrypted)
      .map(async (profile: IntegrationProfile) => {
        const webhookId = profile.id;
        const webhookUrl = profile.webhook_url!;
        const webhookSecret = decryptSecret(profile.webhook_secret_encrypted!);
        const deliveryId = makeDeliveryId(webhookId);

        let attempt = 0;
        let lastResult: DeliveryResult | null = null;

        while (attempt < MAX_RETRIES) {
          attempt++;

          const result = await deliverToUrl(
            webhookId,
            webhookSecret,
            webhookUrl,
            {
              event,
              org_id: profile.org_id,
              agent_id: profile.agent_id,
              delivery_id: deliveryId,
              payload: data,
            },
            attempt,
          );

          lastResult = result;
          const isSuccess = result.status >= 200 && result.status < 300;

          await recordDelivery(
            admin,
            buildDeliveryRecord(
              webhookId,
              event,
              isSuccess ? 'delivered' : attempt >= MAX_RETRIES ? 'dead_letter' : 'retrying',
              result,
              attempt,
            ),
          );

          if (isSuccess) {
            break;
          }

          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        if (lastResult && (lastResult.status < 200 || lastResult.status >= 300)) {
          console.warn('[integration-webhook] delivery dead-lettered', {
            webhook_id: webhookId,
            org_id: profile.org_id,
            agent_id: profile.agent_id,
            event,
            delivery_id: deliveryId,
            status: lastResult.status,
            error: lastResult.error,
          });
        }
      });

    await Promise.allSettled(deliveryPromises);
  } catch (err) {
    console.warn('[integration-webhook] dispatcher failed', {
      org_id: orgId,
      event,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

export function parseIntegrationEvents(events: string[]): IntegrationEvent[] {
  const validEvents: IntegrationEvent[] = [
    'execution.completed',
    'execution.initiated',
    'execution.failed',
    'gate.evaluated',
    'gate.approved',
    'gate.rejected',
    'gate.blocked',
    'review.required',
    'action.approved',
    'action.blocked',
    'action.reviewed',
    'proof.created',
    'proof.scan_completed',
    'agent.created',
    'agent.started',
    'agent.completed',
    'agent.failed',
  ];
  return events.filter((event): event is IntegrationEvent => validEvents.includes(event as IntegrationEvent));
}
