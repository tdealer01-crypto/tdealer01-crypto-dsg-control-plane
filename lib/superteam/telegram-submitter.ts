/**
 * Superteam Telegram Bot Submission Handler
 * Submits bounties via Telegram to @STEarnBot
 */

export interface TelegramSubmission {
  listingId: string;
  title: string;
  reward: number;
  rewardToken: string;
  link: string;
  otherInfo: string;
}

export class TelegramSubmitter {
  private botToken: string;
  private botApiUrl: string;
  private chatId: string | number;

  constructor(botToken: string, chatId?: string | number) {
    if (!botToken) {
      throw new Error('Telegram bot token is required');
    }
    this.botToken = botToken;
    this.botApiUrl = 'https://api.telegram.org/bot' + botToken;
    // Use provided chat_id or fall back to environment variable
    this.chatId = chatId || process.env.TELEGRAM_CHAT_ID || '';

    if (!this.chatId) {
      throw new Error('Telegram chat ID is required (set TELEGRAM_CHAT_ID or pass in constructor)');
    }
  }

  async submitBounty(submission: TelegramSubmission): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const message = this.formatSubmissionMessage(submission);

      // Send to user's Telegram account
      const response = await fetch(`${this.botApiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: String(this.chatId),
          text: message,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json() as any;

      if (!response.ok || !data.ok) {
        // If direct message fails, format for human-readable submission
        return {
          success: false,
          error: `Telegram API error: ${data.description || response.statusText}`,
        };
      }

      return {
        success: true,
        messageId: String(data.result?.message_id),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private formatSubmissionMessage(submission: TelegramSubmission): string {
    return `
🎯 <b>Bounty Submission</b>

<b>Title:</b> ${this.escapeHtml(submission.title)}
<b>Listing ID:</b> <code>${submission.listingId}</code>
<b>Reward:</b> ${submission.reward} ${submission.rewardToken}
<b>Link:</b> ${submission.link}
<b>Info:</b> ${this.escapeHtml(submission.otherInfo)}

Submitted via DSG Agent
    `.trim();
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async getStatus(messageId: string): Promise<{
    delivered: boolean;
    timestamp?: string;
  }> {
    // Telegram doesn't provide direct message status API
    // We can only confirm if message was sent successfully
    return {
      delivered: messageId !== undefined && messageId.length > 0,
      timestamp: new Date().toISOString(),
    };
  }
}
