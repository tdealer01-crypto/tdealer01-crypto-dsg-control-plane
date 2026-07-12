/**
 * Slack notification service for support escalations
 *
 * Sends escalation alerts to Slack channels when tickets are escalated.
 * Requires SLACK_WEBHOOK_URL env var configured for the workspace.
 *
 * Gracefully skips Slack notifications if webhook is not configured.
 */

export interface SlackEscalationData {
  ticketId: string;
  ticketTitle: string;
  team: string;
  reason: string;
  severity: 'low' | 'normal' | 'high' | 'critical';
  customerName?: string;
  ticketUrl?: string;
}

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  normal: '#3b82f6',
  low: '#94a3b8',
};

const SEVERITY_EMOJI = {
  critical: '🔴',
  high: '🟠',
  normal: '🔵',
  low: '⚪',
};

export async function sendSlackEscalationAlert(
  data: SlackEscalationData,
  webhookUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;

  if (!url) {
    console.log(
      '[support] Slack webhook not configured, skipping Slack notification'
    );
    return { ok: true }; // Graceful fallback
  }

  const color = SEVERITY_COLORS[data.severity];
  const emoji = SEVERITY_EMOJI[data.severity];

  const payload = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Support Ticket Escalated`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Ticket*\n${data.ticketTitle}`,
          },
          {
            type: 'mrkdwn',
            text: `*Severity*\n${data.severity.toUpperCase()}`,
          },
          {
            type: 'mrkdwn',
            text: `*Ticket ID*\n\`${data.ticketId}\``,
          },
          {
            type: 'mrkdwn',
            text: `*Team*\n${data.team}`,
          },
          ...(data.customerName
            ? [
                {
                  type: 'mrkdwn',
                  text: `*Customer*\n${data.customerName}`,
                },
              ]
            : []),
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Reason*\n${escapeMarkdown(data.reason)}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Ticket',
              emoji: true,
            },
            value: data.ticketId,
            url: data.ticketUrl || `https://dsg.app/dashboard/support/tickets/${data.ticketId}`,
            style: data.severity === 'critical' ? 'danger' : 'primary',
          },
        ],
      },
    ],
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Escalated from DSG Support System',
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[slack] notification failed:', response.status, text);
      return { ok: false, error: `Slack API error ${response.status}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[slack] notification error:', message);
    return { ok: false, error: message };
  }
}

export async function sendSlackEscalationToChannel(
  channelName: string,
  data: SlackEscalationData,
  webhookUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;

  if (!url) {
    return { ok: true }; // Graceful fallback
  }

  const payload = {
    channel: channelName.startsWith('#') ? channelName : `#${channelName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${SEVERITY_EMOJI[data.severity]} Support Escalation Alert`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Title*\n${data.ticketTitle}`,
          },
          {
            type: 'mrkdwn',
            text: `*Severity*\n${data.severity.toUpperCase()}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Reason*\n> ${escapeMarkdown(data.reason)}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Take Action',
              emoji: true,
            },
            url: data.ticketUrl || `https://dsg.app/dashboard/support/tickets/${data.ticketId}`,
            style: data.severity === 'critical' ? 'danger' : 'primary',
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[slack] channel notification failed:', response.status, text);
      return { ok: false, error: `Slack API error ${response.status}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[slack] channel notification error:', message);
    return { ok: false, error: message };
  }
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
