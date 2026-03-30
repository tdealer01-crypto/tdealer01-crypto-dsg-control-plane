export type RuntimeChannel =
  | 'chat'
  | 'cli'
  | 'remote_browser'
  | 'voice_live'
  | 'mcp'
  | 'tool'
  | 'operator';

export type ChannelIntentEnvelope = {
  channel: RuntimeChannel;
  request_id: string;
  action: string;
  payload: Record<string, unknown>;
  context?: Record<string, unknown>;
};

export type ChannelBadge = {
  channel: RuntimeChannel;
  label: string;
  color_class: string;
  description: string;
};

export const CHANNEL_BADGES: ChannelBadge[] = [
  {
    channel: 'chat',
    label: 'Chat',
    color_class: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
    description: 'Standard conversational agent input',
  },
  {
    channel: 'cli',
    label: 'CLI',
    color_class: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    description: 'Terminal or script-driven command channel',
  },
  {
    channel: 'remote_browser',
    label: 'Remote Browser',
    color_class: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
    description: 'Browser automation / remote operator surface',
  },
  {
    channel: 'voice_live',
    label: 'Voice Live',
    color_class: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/20',
    description: 'Live spoken interaction loop',
  },
  {
    channel: 'mcp',
    label: 'MCP',
    color_class: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    description: 'Model Context Protocol tool surface',
  },
  {
    channel: 'tool',
    label: 'Tool',
    color_class: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
    description: 'External effect / execution surface',
  },
  {
    channel: 'operator',
    label: 'Operator',
    color_class: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
    description: 'Manual control / intervention channel',
  },
];

export function normalizeRuntimeChannel(value: unknown): RuntimeChannel {
  const input = String(value || '')
    .trim()
    .toLowerCase();

  if (
    input === 'chat' ||
    input === 'cli' ||
    input === 'remote_browser' ||
    input === 'voice_live' ||
    input === 'mcp' ||
    input === 'tool' ||
    input === 'operator'
  ) {
    return input;
  }

  return 'chat';
}

export function channelLabel(channel: RuntimeChannel): string {
  return CHANNEL_BADGES.find((item) => item.channel === channel)?.label || channel;
}
