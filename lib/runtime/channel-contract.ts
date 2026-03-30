export const RUNTIME_CHANNELS = [
  'chat',
  'cli',
  'remote_browser',
  'voice_live',
  'mcp',
  'operator',
] as const;

export type RuntimeChannel = (typeof RUNTIME_CHANNELS)[number];

export function normalizeRuntimeChannel(channel?: RuntimeChannel | string | null): RuntimeChannel {
  if (!channel) return 'operator';

  const normalized = String(channel).trim().toLowerCase();
  return RUNTIME_CHANNELS.includes(normalized as RuntimeChannel)
    ? (normalized as RuntimeChannel)
    : 'operator';
}
