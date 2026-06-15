import { randomUUID, createHash } from 'crypto';
import { getSupabaseAdmin } from '../supabase-server';
import { generateWebhookSecret, decryptSecret, createWebhookSignature, verifyWebhookSignature } from '../security/secret-crypto';

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
  delivery_id?: string;
}

interface IntegrationProfile {
  id: string;
  org_id: string;
  agent_id: string;
  webhook_url: string | null;
  allowed_origins: string[];
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

const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 1_000;
const DEAD_LETTER_THRESHOLD = 3;

function buildHeaders(
  webhookId: string,
  secret: string,
  payloadStr: string,
  timestamp: string,
): Record<string, string> {
  const signature = createWebhookSignature(secret, payloadStr);
  return {
    'content-type': 'application/json',
    'x-dsg-event': payloadStr.length > 0 ? JSON.parse(payloadStr).event : 'unknown',
    'x-dsg-org-id': JSON.parse(payloadStr).org_id ?? '',
    'x-dsg-agent-id': JSON.parse(payloadStr).agent_id ?? '',
    'x-dsg-webhook-id': webhookId,
    'x-dsg-timestamp': timestamp,
    'x-dsg-signature': signature,
    'x-dsg-delivery-id': createHash('sha256').update(`${webhookId}:${timestamp}`).digest('hex').slice(0, 16),
  };
}

async function deliverToUrl(
  webhookId: string,
  webhookSecret: string,
  url: string,
  payload: IntegrationWebhookPayload,
  attempt: number = 1,
): Promise<{
  status: number;
  durationMs: number;
  responseBody: string;
  error: string | null;
}> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  const timestamp = new Date().toISOString();
  const payloadWithMeta: IntegrationWebhookPayload = {
    ...payload,
    timestamp,
    payload: { ...payload.payload, _delivery: { attempt, webhookId } },
  };
  const payloadStr = JSON.stringify(payloadWithMeta);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(webhookId, webhookSecret, payloadStr, timestamp),
      body: payloadStr,
      signal: controller.signal,
    });

    const responseBody = await res.text().catch(() => '');
    return {
      status: res.status,
      durationMs: Date.now() - start,
      responseBody,
      error: res.status >= 400 ? `HTTP ${res.status}` : null,
    };
  } catch (err) {
    return {
      status: 0,
      durationMs: Date.now() - start,
      responseBody: '',
      error: err instanceof Error ? err.message : 'Unknown error',
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

async function getWebhookSecret(admin: ReturnType<typeof getSupabaseAdmin>, webhookId: string): Promise<string | null> {
  const { data } = await (admin as any)
    .from('integration_profiles')
    .select('webhook_secret_hash')
    .eq('id', webhookId)
    .maybeSingle();
  return data?.webhook_secret_hash ?? null;
}

async function ensureDeliveryTable() {
  const admin = getSupabaseAdmin();
  await (admin as any).rpc('ensure_integration_webhook_deliveries_table').catch(() => {});
}

export async function fireIntegrationWebhook(
  orgId: string,
  event: IntegrationEvent,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = getSupabaseAdmin();

    // Get active integration profiles for this org
    const { data: profiles, error } = await (admin as any)
      .from('integration_profiles')
      .select('id, org_id, agent_id, webhook_url, webhook_secret_encrypted, status')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .not('webhook_url', 'is', null);

    if (error || !profiles || profiles.length === 0) {
      return;
    }

    const basePayload: Omit<IntegrationWebhookPayload, 'event' | 'org_id' | 'agent_id' | 'timestamp'> = {
      payload: data,
    };

    const deliveryPromises = profiles
      .filter((p: IntegrationProfile) => p.webhook_url && p.webhook_secret_encrypted)
      .map(async (profile) => {
        const webhookId = profile.id;
        const webhookUrl = profile.webhook_url!;
        const webhookSecret = decryptSecret(profile.webhook_secret_encrypted!);

        let attempt = 0;
        let lastError: string | null = null;
        let lastStatus = 0;
        let lastResponseBody = '';
        const deliveryId = createHash('sha256').update(`${webhookId}:${Date.now()}:${randomUUID()}`).digest('hex').slice(0, 16);

        while (attempt < MAX_RETRIES) {
          attempt++;

          const timestamp = new Date().toISOString();
          const result = await deliverToUrl(webhookId, webhookSecret, webhookUrl, {
            ...basePayload,
            event,
            org_id: profile.org_id,
            agent_id: profile.agent_id,
            timestamp,
            delivery_id: deliveryId,
          }, attempt);

          lastStatus = result.status;
          lastResponseBody = result.responseBody;
          lastError = result.error;

          const isSuccess = result.status >= 200 && result.status < 300;

          await recordDelivery(admin, {
            webhook_id: webhookId,
            event,
            status: isSuccess ? 'delivered' : (attempt >= MAX_RETRIES ? 'dead_letter' : 'retrying'),
            response_code: result.status || null,
            duration_ms: result.durationMs,
            attempt,
            error_message: lastError,
            request_payload: { event, org_id: profile.org_id, agent_id: profile.agent_id, timestamp: new Date().toISOString(), payload: data },
            response_payload: lastResponseBody ? { body: lastResponseBody } : null,
            created_at: new Date().toISOString(),
          });

          if (isSuccess) {
            break;
          }

          // Exponential backoff with jitter
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 500;
          await new Promise((r) => setTimeout(r, delay));
        }

        // If all retries failed, mark as dead_letter
        if (lastStatus < 200 || lastStatus >= 300) {
          await recordDelivery(admin, {
            webhook_id: webhookId,
            event,
            status: 'dead_letter',
            response_code: lastStatus || null,
            duration_ms: 0,
            attempt: MAX_RETRIES,
            error_message: lastError,
            request_payload: { event, org_id: profile.org_id, agent_id: profile.agent_id, timestamp: new Date().toISOString(), payload: data },
            response_payload: lastResponseBody ? { body: lastResponseBody, final: true } : { final: true },
            created_at: new Date().toISOString(),
          });
        }
      });

    await Promise.allSettled(deliveryPromises);
  } catch {
    // Webhook delivery is best-effort — never block the main response.
  }
}

export function parseIntegrationEvents(events: string[]): IntegrationEvent[] {
  const validEvents: IntegrationEvent[] = [
    'execution.completed', 'execution.initiated', 'execution.failed',
    'gate.evaluated', 'gate.approved', 'gate.rejected', 'gate.blocked',
    'review.required', 'action.approved', 'action.blocked', 'action.reviewed',
    'proof.created', 'proof.scan_completed',
    'agent.created', 'agent.started', 'agent.completed', 'agent.failed',
  ];
  return events.filter((e): e is IntegrationEvent => validEvents.includes(e as IntegrationEvent));
}