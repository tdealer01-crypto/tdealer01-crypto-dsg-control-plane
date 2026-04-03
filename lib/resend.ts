/**
 * Resend email service integration for magic-link delivery.
 *
 * When RESEND_API_KEY is configured, magic-link emails are sent through
 * Resend instead of the default Supabase email transport. This gives
 * full control over sender address, template, and deliverability.
 *
 * Required env vars:
 *   RESEND_API_KEY        – API key from https://resend.com/api-keys
 *   RESEND_FROM_EMAIL     – Verified sender (e.g. "DSG <noreply@yourdomain.com>")
 *
 * If RESEND_API_KEY is not set the helper returns `{ configured: false }`
 * and callers should fall back to Supabase's built-in email.
 */

type ResendStatus =
  | { configured: false }
  | { configured: true; send: (opts: SendOpts) => Promise<SendResult> };

interface SendOpts {
  to: string;
  subject: string;
  html: string;
}

interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export function getResend(): ResendStatus {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { configured: false };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'DSG <noreply@dsg.app>';

  async function send(opts: SendOpts): Promise<SendResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
        }),
      });

      const json = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        const message = (json.message as string) || `Resend API error ${res.status}`;
        console.error('[resend] send failed:', message);
        return { ok: false, error: message };
      }

      return { ok: true, id: json.id as string };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected Resend error';
      console.error('[resend] send error:', message);
      return { ok: false, error: message };
    }
  }

  return { configured: true, send };
}

/** Escape a string for safe interpolation inside an HTML attribute value. */
function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build a branded magic-link email body.
 */
export function buildMagicLinkEmail(magicLink: string, context: 'login' | 'trial'): string {
  const safeLink = escapeHtmlAttr(magicLink);
  const heading = context === 'trial' ? 'Start your DSG trial' : 'Sign in to DSG';
  const subtext =
    context === 'trial'
      ? 'Click the link below to confirm your email and start your free trial.'
      : 'Click the link below to sign in to your DSG dashboard.';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.1);">
    <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#6ee7b7;margin:0;">DSG Control Plane</p>
    <h1 style="font-size:24px;margin:16px 0 8px;color:#f1f5f9;">${heading}</h1>
    <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;">${subtext}</p>
    <a href="${safeLink}" style="display:inline-block;background:#34d399;color:#0f172a;font-weight:600;padding:14px 28px;border-radius:12px;text-decoration:none;">
      Continue to DSG
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">
      If you did not request this link, you can safely ignore this email.
      This link expires in 1 hour.
    </p>
  </div>
</body>
</html>`.trim();
}
