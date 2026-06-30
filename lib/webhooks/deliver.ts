import { getSupabaseAdmin } from "../supabase-server";

const DELIVERY_TIMEOUT_MS = 5_000;

function parseAndValidateWebhookUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const h = parsed.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^10\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h)
  ) {
    return null;
  }
  return parsed;
}

async function deliverToUrl(
  webhookId: string,
  url: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<{ status: number; durationMs: number }> {
  const safeUrl = parseAndValidateWebhookUrl(url);
  if (!safeUrl) {
    return { status: 0, durationMs: 0 };
  }

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    const res = await fetch(safeUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dsg-event": event,
        "x-dsg-org-id": String(payload.org_id ?? ""),
        "x-dsg-webhook-id": webhookId,
        "x-dsg-timestamp": String(payload.timestamp ?? new Date().toISOString()),
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

export async function fireWebhook(
  orgId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = getSupabaseAdmin();

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

    const payload: Record<string, unknown> = {
      event,
      org_id: orgId,
      timestamp: new Date().toISOString(),
      ...data,
    };

    await Promise.all(
      matching.map(async (cfg) => {
        const { status, durationMs } = await deliverToUrl(cfg.id, cfg.url, event, payload);
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
