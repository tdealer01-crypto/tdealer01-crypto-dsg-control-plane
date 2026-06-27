/**
 * DSG Brain UI Client
 * API wrapper for /api/dsg/brain/execute endpoint
 */

import type { ExecutionResult, DsgBrainConfig } from './types';

export async function executeDsgBrainPlan(
  input: string,
  config: DsgBrainConfig
): Promise<ExecutionResult> {
  const response = await fetch('/api/dsg/brain/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      input,
      allowedCommands: config.allowedCommands,
      allowedPaths: config.allowedPaths,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function checkDsgBrainHealth() {
  const response = await fetch('/api/dsg/brain/execute');
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
}

export function sanitizeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  // Remove any API keys
  return msg.replace(/sk-ant-[^\s]*/g, '[REDACTED]').replace(/sk-proj-[^\s]*/g, '[REDACTED]');
}
