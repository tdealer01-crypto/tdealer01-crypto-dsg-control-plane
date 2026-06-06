import { createHmac } from 'crypto';

// Fires a signed event to control-plane. Fire-and-forget — never throws.
export async function dispatchToControlPlane(
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const url = process.env.CONTROL_PLANE_WEBHOOK_URL;
  const secret = process.env.CONTROL_PLANE_WEBHOOK_SECRET;
  if (!url || !secret) return; // not configured — skip silently

  const body = JSON.stringify({ event, payload, timestamp: Date.now() });
  const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  try {
    await fetch(`${url.replace(/\/$/, '')}/api/webhooks/dsg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dsg-signature': signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // intentionally swallowed — webhook failure must not affect job result
  }
}
