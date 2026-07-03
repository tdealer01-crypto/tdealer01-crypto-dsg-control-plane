/**
 * Gateway - Multi-channel message broker
 * Exports main gateway service and types
 */

export { GatewayService } from './gateway-service';
export type {
  ChannelType,
  Message,
  Session,
  User,
  GatewayEvent,
  ChannelAdapter,
  ChannelConfig,
  GatewayConfig,
  MessageType,
  MessageContent,
} from './types';
export { SlackAdapter, DiscordAdapter, TelegramAdapter } from './adapters';
