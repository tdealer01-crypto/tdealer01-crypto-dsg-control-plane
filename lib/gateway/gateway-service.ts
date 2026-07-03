/**
 * Gateway Service - Multi-channel message broker
 * Manages sessions, routes messages, handles channel adapters
 */

import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import {
  ChannelType,
  Message,
  Session,
  User,
  GatewayEvent,
  ChannelAdapter,
  ChannelConfig,
  GatewayConfig,
} from './types';

export class GatewayService {
  private config: GatewayConfig;
  private adapters: Map<ChannelType, ChannelAdapter> = new Map();
  private supabasePromise: Promise<any> | null = null;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  private async getSupabase() {
    if (!this.supabasePromise) {
      this.supabasePromise = createClient();
    }
    return this.supabasePromise;
  }

  /**
   * Initialize gateway and connect all channels
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Gateway Service...');

      // Load enabled channels from config
      for (const channelConfig of this.config.channels) {
        if (channelConfig.enabled) {
          await this.registerChannel(channelConfig);
        }
      }

      console.log(`Gateway initialized with ${this.adapters.size} active channels`);
    } catch (error) {
      console.error('Failed to initialize gateway:', error);
      throw error;
    }
  }

  /**
   * Register a channel adapter
   */
  async registerChannel(config: ChannelConfig): Promise<void> {
    try {
      // Create adapter based on channel type
      const adapter = this.createAdapter(config);

      // Store adapter
      this.adapters.set(config.channel, adapter);

      // Connect adapter
      await adapter.connect();

      console.log(`Channel registered: ${config.channel}`);
    } catch (error) {
      console.error(`Failed to register channel ${config.channel}:`, error);
    }
  }

  /**
   * Create channel adapter (factory method)
   */
  private createAdapter(config: ChannelConfig): ChannelAdapter {
    // This is a base implementation - actual adapters would be in separate files
    return {
      channel: config.channel,
      connect: async () => {
        console.log(`Connecting to ${config.channel}`);
      },
      disconnect: async () => {
        console.log(`Disconnecting from ${config.channel}`);
      },
      sendMessage: async (session_id: string, message: Message) => {
        console.log(`Sending message to ${config.channel}:`, message);
        return message.id;
      },
      receiveMessage: async (event: any) => {
        console.log(`Receiving message from ${config.channel}:`, event);
        return {} as Message;
      },
      updateUserStatus: async (user_id: string, status: string) => {
        console.log(`Updating user ${user_id} status: ${status}`);
      },
      validateWebhook: (payload: any, signature: string) => {
        return true;
      },
    };
  }

  /**
   * Create or get session for user
   */
  async createSession(
    agent_id: string,
    channel: ChannelType,
    channel_user_id: string,
    workspace_id?: string
  ): Promise<Session> {
    try {
      const supabase = await this.getSupabase();

      // Check if session already exists
      const { data: existing } = await supabase
        .from('gateway_sessions')
        .select('*')
        .eq('agent_id', agent_id)
        .eq('channel', channel)
        .eq('channel_user_id', channel_user_id)
        .eq('status', 'active')
        .single();

      if (existing) {
        return existing;
      }

      // Create new session
      const session: Session = {
        id: randomUUID(),
        agent_id,
        user_id: channel_user_id,
        channel,
        status: 'active',
        workspace_id,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('gateway_sessions')
        .insert([session])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Store incoming message
   */
  async storeMessage(message: Message): Promise<Message> {
    try {
      const supabase = await this.getSupabase();

      const { data, error } = await supabase
        .from('gateway_messages')
        .insert([message])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to store message:', error);
      throw error;
    }
  }

  /**
   * Send message through channel
   */
  async sendMessage(session_id: string, content: string, agent_id: string): Promise<Message> {
    try {
      const supabase = await this.getSupabase();

      // Get session
      const { data: session, error: sessionError } = await supabase
        .from('gateway_sessions')
        .select('*')
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      // Create message
      const message: Message = {
        id: randomUUID(),
        session_id,
        user_id: session.user_id,
        agent_id,
        channel: session.channel,
        type: 'text',
        content,
        direction: 'outbound',
        created_at: new Date().toISOString(),
      };

      // Get adapter
      const adapter = this.adapters.get(session.channel);
      if (!adapter) {
        throw new Error(`Adapter not found for channel: ${session.channel}`);
      }

      // Send through adapter
      const channel_message_id = await adapter.sendMessage(session_id, message);

      // Store message
      message.metadata = {
        channel_message_id,
      };

      return await this.storeMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Handle incoming webhook from channel
   */
  async handleWebhook(channel: ChannelType, payload: any, signature?: string): Promise<void> {
    try {
      const adapter = this.adapters.get(channel);
      if (!adapter) {
        throw new Error(`Adapter not found for channel: ${channel}`);
      }

      // Validate webhook
      if (signature && !adapter.validateWebhook(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      // Convert webhook payload to message
      const message = await adapter.receiveMessage(payload);

      // Store message
      await this.storeMessage(message);

      // Emit event
      await this.emitEvent({
        id: randomUUID(),
        type: 'message.received',
        channel,
        data: { message_id: message.id, session_id: message.session_id },
        timestamp: new Date().toISOString(),
        processed: false,
      });
    } catch (error) {
      console.error('Failed to handle webhook from channel:', channel, error);
    }
  }

  /**
   * Emit gateway event
   */
  async emitEvent(event: GatewayEvent): Promise<void> {
    try {
      const supabase = await this.getSupabase();

      await supabase.from('gateway_events').insert([event]);
    } catch (error) {
      console.error('Failed to emit event:', error);
    }
  }

  /**
   * Get session messages
   */
  async getSessionMessages(session_id: string, limit: number = 50): Promise<Message[]> {
    try {
      const supabase = await this.getSupabase();

      const { data, error } = await supabase
        .from('gateway_messages')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get session messages:', error);
      return [];
    }
  }

  /**
   * Close session
   */
  async closeSession(session_id: string): Promise<void> {
    try {
      const supabase = await this.getSupabase();

      await supabase
        .from('gateway_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', session_id);

      await this.emitEvent({
        id: randomUUID(),
        type: 'session.closed',
        channel: 'slack', // placeholder
        data: { session_id },
        timestamp: new Date().toISOString(),
        processed: false,
      });
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  }

  /**
   * Shutdown gateway
   */
  async shutdown(): Promise<void> {
    try {
      for (const adapter of this.adapters.values()) {
        await adapter.disconnect();
      }
      this.adapters.clear();
      console.log('Gateway shutdown complete');
    } catch (error) {
      console.error('Failed to shutdown gateway:', error);
    }
  }
}
