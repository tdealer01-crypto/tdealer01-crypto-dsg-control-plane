/**
 * Webhook Sender - Format and send alerts to Slack/Discord
 */

export type WebhookChannel = 'slack' | 'discord' | 'generic';

interface AlertPayload {
  alert_id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface WebhookConfig {
  url: string;
  channel: WebhookChannel;
  secret?: string;
}

export class WebhookSender {
  /**
   * Send alert to webhook with appropriate formatting
   */
  static async send(config: WebhookConfig, alert: AlertPayload): Promise<boolean> {
    try {
      const payload = this.formatPayload(config.channel, alert);

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.secret && {
            'X-Webhook-Signature': this.generateSignature(config.secret, JSON.stringify(payload)),
          }),
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('Webhook send failed:', error);
      return false;
    }
  }

  /**
   * Format alert payload for different webhook channels
   */
  private static formatPayload(channel: WebhookChannel, alert: AlertPayload): any {
    switch (channel) {
      case 'slack':
        return this.formatSlack(alert);
      case 'discord':
        return this.formatDiscord(alert);
      default:
        return this.formatGeneric(alert);
    }
  }

  /**
   * Slack message format
   */
  private static formatSlack(alert: AlertPayload): any {
    const severityColor = {
      low: '#36a64f',
      medium: '#ff9900',
      high: '#ff0000',
    }[alert.severity];

    return {
      text: `🚨 ${alert.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: alert.title,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alert.message,
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Alert',
            },
            url: `https://dsg.example.com/dashboard/alerts/${alert.alert_id}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Severity:* ${alert.severity} | *ID:* ${alert.alert_id.slice(0, 8)}`,
            },
          ],
        },
      ],
      attachments: [
        {
          color: severityColor,
          fields: Object.entries(alert.metadata || {})
            .slice(0, 4) // Limit to 4 fields
            .map(([key, value]) => ({
              title: this.humanize(key),
              value: String(value),
              short: true,
            })),
        },
      ],
    };
  }

  /**
   * Discord message format
   */
  private static formatDiscord(alert: AlertPayload): any {
    const severityColor = {
      low: 0x36a64f,
      medium: 0xff9900,
      high: 0xff0000,
    }[alert.severity];

    return {
      content: `🚨 **${alert.title}**`,
      embeds: [
        {
          title: alert.title,
          description: alert.message,
          color: severityColor,
          fields: Object.entries(alert.metadata || {})
            .slice(0, 5)
            .map(([key, value]) => ({
              name: this.humanize(key),
              value: String(value),
              inline: true,
            })),
          footer: {
            text: `Alert ID: ${alert.alert_id.slice(0, 12)}`,
          },
          timestamp: alert.created_at,
        },
      ],
    };
  }

  /**
   * Generic webhook format
   */
  private static formatGeneric(alert: AlertPayload): any {
    return {
      alert_id: alert.alert_id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      created_at: alert.created_at,
      metadata: alert.metadata,
    };
  }

  /**
   * Generate HMAC signature for webhook verification
   */
  private static generateSignature(secret: string, payload: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Convert snake_case to Title Case
   */
  private static humanize(str: string): string {
    return str
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
