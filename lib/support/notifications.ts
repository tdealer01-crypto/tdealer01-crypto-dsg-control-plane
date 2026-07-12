import { getResend, escapeHtmlAttribute } from '@/lib/resend';

export interface EscalationEmailData {
  ticketId: string;
  ticketTitle: string;
  customerName?: string;
  reason: string;
  team: string;
  severity: 'low' | 'normal' | 'high' | 'critical';
  dashboardUrl?: string;
}

export async function sendEscalationEmail(
  toEmail: string,
  data: EscalationEmailData
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const resend = getResend();

  if (!resend.configured) {
    console.log(
      '[support] Resend not configured, skipping email notification to',
      toEmail
    );
    return { ok: true }; // Graceful fallback
  }

  const severityColor =
    data.severity === 'critical'
      ? '#ef4444'
      : data.severity === 'high'
        ? '#f97316'
        : data.severity === 'normal'
          ? '#3b82f6'
          : '#94a3b8';

  const severityLabel = {
    critical: 'CRITICAL',
    high: 'HIGH',
    normal: 'NORMAL',
    low: 'LOW',
  }[data.severity];

  const ticketUrl = data.dashboardUrl
    ? `${data.dashboardUrl}/dashboard/support/tickets/${data.ticketId}`
    : `https://dsg.app/dashboard/support/tickets/${data.ticketId}`;

  const escapedTicketUrl = escapeHtmlAttribute(ticketUrl);

  const html = buildEscalationEmail({
    ticketId: data.ticketId,
    ticketTitle: data.ticketTitle,
    customerName: data.customerName,
    reason: data.reason,
    team: data.team,
    severity: data.severity,
    severityLabel,
    severityColor,
    ticketUrl: escapedTicketUrl,
  });

  return resend.send({
    to: toEmail,
    subject: `🔥 Support Escalation: ${data.ticketTitle} (${severityLabel})`,
    html,
  });
}

export async function sendEscalationNotifications(
  teamEmails: string[],
  data: EscalationEmailData
): Promise<Array<{ email: string; ok: boolean; id?: string; error?: string }>> {
  const results = await Promise.all(
    teamEmails.map((email) =>
      sendEscalationEmail(email, data).then((result) => ({
        email,
        ...result,
      }))
    )
  );

  return results;
}

interface BuildEmailOpts {
  ticketId: string;
  ticketTitle: string;
  customerName?: string;
  reason: string;
  team: string;
  severity: string;
  severityLabel: string;
  severityColor: string;
  ticketUrl: string;
}

function buildEscalationEmail(opts: BuildEmailOpts): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.1);">

    <div style="border-left:4px solid ${opts.severityColor};padding-left:16px;margin-bottom:24px;">
      <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#94a3b8;margin:0 0 8px;">Support Alert</p>
      <h2 style="font-size:20px;margin:0;color:#f1f5f9;">Ticket Escalation</h2>
    </div>

    <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:13px;color:#94a3b8;">Status</span>
        <span style="background:${opts.severityColor};color:white;font-weight:600;padding:4px 12px;border-radius:6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">
          ${opts.severityLabel}
        </span>
      </div>
      <p style="margin:0;font-size:14px;color:#e2e8f0;font-weight:500;">${escapeHtml(opts.ticketTitle)}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#64748b;">ID: ${escapeHtml(opts.ticketId)}</p>
    </div>

    ${opts.customerName ? `
    <div style="margin-bottom:16px;">
      <p style="font-size:12px;color:#94a3b8;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.1em;">Customer</p>
      <p style="margin:0;font-size:14px;color:#e2e8f0;">${escapeHtml(opts.customerName)}</p>
    </div>
    ` : ''}

    <div style="margin-bottom:16px;">
      <p style="font-size:12px;color:#94a3b8;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.1em;">Escalated to</p>
      <p style="margin:0;font-size:14px;color:#e2e8f0;">${escapeHtml(opts.team)}</p>
    </div>

    <div style="margin-bottom:24px;">
      <p style="font-size:12px;color:#94a3b8;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.1em;">Reason</p>
      <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:1.6;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;border-left:2px solid ${opts.severityColor};">
        ${escapeHtml(opts.reason)}
      </p>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="${opts.ticketUrl}" style="display:inline-block;background:${opts.severityColor};color:white;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
        View Ticket Details
      </a>
    </div>

    <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;margin-top:24px;">
      <p style="margin:0;font-size:11px;color:#64748b;line-height:1.6;">
        This is an automated escalation notification from DSG Support System.
        Please act on this ticket according to your team's SLA.
        Do not reply to this email.
      </p>
    </div>

  </div>
</body>
</html>`.trim();
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}
