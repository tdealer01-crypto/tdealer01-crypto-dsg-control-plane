import { getSupabaseAdmin } from "../supabase-server";

export type FinanceWebhookEvent =
  | "finance.approval.approved"
  | "finance.approval.rejected"
  | "finance.approval.escalated"
  | "finance.case.submitted";

export type WebhookPayload = {
  event: FinanceWebhookEvent;
  org_id: string;
  approval_id: string;
  case_id?: string;
  next_status: string;
  timestamp: string;
};

const DELIVERY_TIMEOUT_MS = 5_000;

async function deliver(
  webhookId: string,
  url: string,
  payload: WebhookPayload,
): Promise<{ status: number; durationMs: number }> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dsg-event": payload.event,
        "x-dsg-org-id": payload.org_id,
        "x-dsg-webhook-id": webhookId,
        "x-dsg-timestamp": payload.timestamp,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return { status: res.status, durationMs: Date.now() - start };
  } catch {
    return { status: 0, durationMs: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

export async function fireFinanceWebhook(
  orgId: string,
  event: FinanceWebhookEvent,
  payload: Omit<WebhookPayload, "event" | "org_id" | "timestamp">,
): Promise<void> {
  try {
    const admin = getSupabaseAdmin();

    // Fetch active webhook configs for this org that subscribe to this event.
    const { data: configs } = await admin
      .from("webhook_configs")
      .select("id, url, events")
      .eq("org_id", orgId)
      .eq("active", true);

    if (!configs || configs.length === 0) return;

    const matching = configs.filter((c) =>
      (c.events as string[]).includes(event),
    );
    if (matching.length === 0) return;

    const fullPayload: WebhookPayload = {
      event,
      org_id: orgId,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    await Promise.all(
      matching.map(async (cfg) => {
        const { status, durationMs } = await deliver(cfg.id, cfg.url, fullPayload);
        await admin.from("webhook_deliveries").insert({
          webhook_id: cfg.id,
          event,
          status: status >= 200 && status < 300 ? "delivered" : "failed",
          response_code: status || null,
          duration_ms: durationMs,
        });
      }),
    );
  } catch {
    // Webhook delivery is best-effort — never block the main response.
  }
}
