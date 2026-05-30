/**
 * Session Storage
 * localStorage wrapper for DSG Brain session persistence
 */

import type { SessionData, DsgBrainConfig, ChatMessage } from './types';

const SESSION_PREFIX = 'dsg-brain-session-';
const CONFIG_KEY = 'dsg-brain-config';

export function saveSession(session: SessionData): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SESSION_PREFIX + session.id, JSON.stringify(session));
    }
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

export function loadSession(id: string): SessionData | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(SESSION_PREFIX + id);
      return data ? JSON.parse(data) : null;
    }
  } catch (e) {
    console.warn('Failed to load session:', e);
  }
  return null;
}

export function deleteSession(id: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SESSION_PREFIX + id);
    }
  } catch (e) {
    console.warn('Failed to delete session:', e);
  }
}

export function listSessions(): SessionData[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const sessions: SessionData[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key?.startsWith(SESSION_PREFIX)) {
          const data = window.localStorage.getItem(key);
          if (data) {
            sessions.push(JSON.parse(data));
          }
        }
      }
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  } catch (e) {
    console.warn('Failed to list sessions:', e);
  }
  return [];
}

export function saveConfig(config: DsgBrainConfig): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }
  } catch (e) {
    console.warn('Failed to save config:', e);
  }
}

export function loadConfig(): DsgBrainConfig | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(CONFIG_KEY);
      return data ? JSON.parse(data) : null;
    }
  } catch (e) {
    console.warn('Failed to load config:', e);
  }
  return null;
}

export function createNewSession(name: string, config: DsgBrainConfig): SessionData {
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

export function addMessageToSession(session: SessionData, message: ChatMessage): SessionData {
  const updated = {
    ...session,
    messages: [...session.messages, message],
    updatedAt: Date.now(),
  };
  saveSession(updated);
  return updated;
}
