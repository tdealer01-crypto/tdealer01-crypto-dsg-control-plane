/**
 * Gateway Type Definitions
 * Core types for multi-channel message broker system
 */

export type ChannelType =
  | 'whatsapp'
  | 'telegram'
  | 'slack'
  | 'discord'
  | 'signal'
  | 'google-chat'
  | 'teams'
  | 'irc'
  | 'matrix'
  | 'feishu'
  | 'line'
  | 'mattermost'
  | 'zalo'
  | 'wechat'
  | 'qq'
  | 'twitch'
  | 'webchat'
  | 'ios'
  | 'android'
  | 'macos';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice' | 'location' | 'reaction';

export type MessageDirection = 'inbound' | 'outbound';

export type SessionStatus = 'active' | 'idle' | 'closed' | 'archived';

export interface User {
  id: string;
  channel: ChannelType;
  channel_user_id: string;
  name?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  agent_id: string;
  channel: ChannelType;
  type: MessageType;
  content: string;
  direction: MessageDirection;
  metadata?: Record<string, any>;
  attachments?: Attachment[];
  created_at: string;
  updated_at?: string;
}

export interface Attachment {
  id: string;
  url: string;
  type: string;
  size?: number;
  mime_type?: string;
  metadata?: Record<string, any>;
}

export interface Session {
  id: string;
  agent_id: string;
  user_id: string;
  channel: ChannelType;
  status: SessionStatus;
  channel_thread_id?: string;
  workspace_id?: string;
  context?: Record<string, any>;
  created_at: string;
  last_message_at?: string;
  closed_at?: string;
  metadata?: Record<string, any>;
}

export interface ChannelConfig {
  channel: ChannelType;
  enabled: boolean;
  credentials: Record<string, string>;
  webhook_url?: string;
  webhook_secret?: string;
  settings?: Record<string, any>;
}

export interface GatewayEvent {
  id: string;
  type: 'message.received' | 'message.sent' | 'session.created' | 'session.closed' | 'user.status' | 'channel.status';
  channel: ChannelType;
  data: Record<string, any>;
  timestamp: string;
  processed: boolean;
}

export interface MessageContent {
  text?: string;
  buttons?: Button[];
  quick_replies?: QuickReply[];
  menu?: MenuItem[];
}

export interface Button {
  id: string;
  label: string;
  action: 'url' | 'postback' | 'call' | 'location';
  value: string;
}

export interface QuickReply {
  id: string;
  text: string;
  payload?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  items?: MenuItem[];
  action?: string;
}

export interface ChannelAdapter {
  channel: ChannelType;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(session_id: string, message: Message): Promise<string>;
  receiveMessage(event: any): Promise<Message>;
  updateUserStatus(user_id: string, status: string): Promise<void>;
  validateWebhook(payload: any, signature: string): boolean;
}

export interface GatewayConfig {
  channels: ChannelConfig[];
  database_url: string;
  redis_url?: string;
  webhook_base_url: string;
  max_message_size: number;
  message_retention_days: number;
  enable_voice: boolean;
  enable_canvas: boolean;
}
