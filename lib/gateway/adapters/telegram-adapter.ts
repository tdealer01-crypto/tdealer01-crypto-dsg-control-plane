/**
 * Telegram Channel Adapter
 * Handles Telegram message routing and formatting
 */

import { ChannelAdapter, Message, ChannelConfig } from '../types';
import { randomUUID } from 'crypto';

export class TelegramAdapter implements ChannelAdapter {
  channel = 'telegram' as const;
  private config: ChannelConfig;
  private botToken: string;
  private apiBaseUrl = 'https://api.telegram.org';

  constructor(config: ChannelConfig) {
    this.config = config;
    this.botToken = config.credentials.bot_token;
  }

  async connect(): Promise<void> {
    try {
      console.log('Connecting to Telegram...');
      // Verify bot token by getting bot info
      const response = await fetch(`${this.apiBaseUrl}/bot${this.botToken}/getMe`);
      const data = await response.json();
      if (data.ok) {
        console.log(`Connected to Telegram bot: @${data.result.username}`);
      }
    } catch (error) {
      console.error('Failed to connect to Telegram:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Telegram doesn't require explicit disconnection
  }

  async sendMessage(session_id: string, message: Message): Promise<string> {
    try {
      const metadata = message.metadata || {};
      const chatId = metadata.telegram_chat_id || metadata.chat_id;

      const response = await fetch(`${this.apiBaseUrl}/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message.content,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();
      if (data.ok) {
        return data.result.message_id.toString();
      }
      throw new Error(data.description);
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      throw error;
    }
  }

  async receiveMessage(event: any): Promise<Message> {
    try {
      const message: Message = {
        id: randomUUID(),
        session_id: event.message.chat.id.toString(),
        user_id: event.message.from.id.toString(),
        agent_id: '',
        channel: 'telegram',
        type: 'text',
        content: event.message.text || '',
        direction: 'inbound',
        metadata: {
          telegram_message_id: event.message.message_id,
          telegram_chat_id: event.message.chat.id,
          telegram_user_id: event.message.from.id,
          telegram_username: event.message.from.username,
          telegram_first_name: event.message.from.first_name,
        },
        created_at: new Date(event.message.date * 1000).toISOString(),
      };
      return message;
    } catch (error) {
      console.error('Failed to process Telegram message:', error);
      throw error;
    }
  }

  async updateUserStatus(user_id: string, status: string): Promise<void> {
    try {
      console.log(`Updating Telegram user ${user_id} status: ${status}`);
    } catch (error) {
      console.error('Failed to update Telegram user status:', error);
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    try {
      // Telegram uses simple JSON validation
      return payload && payload.update_id !== undefined;
    } catch (error) {
      console.error('Failed to validate Telegram webhook:', error);
      return false;
    }
  }
}
