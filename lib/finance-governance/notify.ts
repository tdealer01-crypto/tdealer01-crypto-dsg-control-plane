// Sends a lightweight email notification via Resend (if RESEND_API_KEY is set).
// Silently no-ops if the key is missing — never throws.
export async function notifyApprovalStatusChange(opts: {
  approvalId: string;
  vendor: string;
  action: 'approve' | 'reject' | 'escalate';
  orgId: string;
  actorEmail?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const to = process.env.APPROVAL_NOTIFY_EMAIL;
  if (!to) return;

  const from = process.env.APPROVAL_NOTIFY_FROM ?? 'onboarding@resend.dev';
  const { approvalId, vendor, action, orgId, actorEmail } = opts;
  const subject = `Approval ${action}d: ${vendor} (${approvalId})`;
  const timestamp = new Date().toISOString();

  const html = `
<h2>Approval status change</h2>
<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
  <tr><th align="left">Field</th><th align="left">Value</th></tr>
  <tr><td>Vendor</td><td>${vendor}</td></tr>
  <tr><td>Approval ID</td><td>${approvalId}</td></tr>
  <tr><td>Action</td><td>${action}</td></tr>
  <tr><td>Organization</td><td>${orgId}</td></tr>
  ${actorEmail ? `<tr><td>Actor</td><td>${actorEmail}</td></tr>` : ''}
  <tr><td>Timestamp</td><td>${timestamp}</td></tr>
</table>
`.trim();

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
  } catch (error) {
    console.warn('[notify]', error);
  }
}
