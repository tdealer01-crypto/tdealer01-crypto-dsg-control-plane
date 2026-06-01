import type {
  SessionData,
  DsgBrainConfig,
  ChatMessage,
} from './types';

const sessions = new Map<string, SessionData>();
let currentConfig: DsgBrainConfig | null = null;

export function saveSession(session: SessionData): void {
  sessions.set(session.id, session);
}

export function loadSession(id: string): SessionData | null {
  return sessions.get(id) ?? null;
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}

export function listSessions(): SessionData[] {
  return Array.from(sessions.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

export function saveConfig(config: DsgBrainConfig): void {
  currentConfig = config;
}

export function loadConfig(): DsgBrainConfig | null {
  return currentConfig;
}

export function createNewSession(
  name: string,
  config: DsgBrainConfig,
): SessionData {
  const id =
    `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = Date.now();

  return {
    id,
    name,
    messages: [],
    config,
    createdAt: now,
    updatedAt: now,
  };
}

export function addMessageToSession(
  session: SessionData,
  message: ChatMessage,
): SessionData {
  const updated = {
    ...session,
    messages: [...session.messages, message],
    updatedAt: Date.now(),
  };

  saveSession(updated);
  return updated;
}
