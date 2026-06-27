/**
 * Hermes Startup Context Loader
 *
 * Reads CLAUDE.md and AGENTS.md from the repo root at request time.
 * Injected into the Hermes planner system prompt before every task.
 *
 * This ensures Hermes always has the current operating rules, claim
 * boundaries, and project context — not a stale in-memory copy.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function readFile(filename: string, maxChars = 8000): string {
  try {
    const content = fs.readFileSync(path.join(ROOT, filename), 'utf-8');
    if (content.length <= maxChars) return content;
    return content.slice(0, maxChars) + `\n\n[...truncated at ${maxChars} chars — full file at /${filename}]`;
  } catch {
    return '';
  }
}

export type StartupContext = {
  claudeMd: string;
  agentsMd: string;
  loadedAt: string;
  files: string[];
};

let _cache: StartupContext | null = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 60_000; // re-read at most once per minute

export function loadStartupContext(): StartupContext {
  const now = Date.now();
  if (_cache && now - _cacheTs < CACHE_TTL_MS) return _cache;

  const claudeMd = readFile('CLAUDE.md', 10000);
  const agentsMd = readFile('AGENTS.md', 4000);
  const files: string[] = [];
  if (claudeMd) files.push('CLAUDE.md');
  if (agentsMd) files.push('AGENTS.md');

  _cache = { claudeMd, agentsMd, loadedAt: new Date().toISOString(), files };
  _cacheTs = now;
  return _cache;
}

export function buildStartupBlock(): string {
  const ctx = loadStartupContext();
  const parts: string[] = [];

  if (ctx.claudeMd) {
    parts.push(`## CLAUDE.md — Operating Guide (loaded ${ctx.loadedAt})\n\n${ctx.claudeMd}`);
  }
  if (ctx.agentsMd) {
    parts.push(`## AGENTS.md — Permanent Agent Rules\n\n${ctx.agentsMd}`);
  }

  if (parts.length === 0) return '';

  return [
    '══════════════════════════════════════════════════════════════════════',
    '  HERMES STARTUP CONTEXT — read before every task',
    '══════════════════════════════════════════════════════════════════════',
    ...parts,
    '══════════════════════════════════════════════════════════════════════',
    '  END STARTUP CONTEXT — follow all rules above for this entire session',
    '══════════════════════════════════════════════════════════════════════',
  ].join('\n\n');
}
