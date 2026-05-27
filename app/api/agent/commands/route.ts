// ERROR_HANDLER_EXEMPT: MVP command queue returns structured JSON API errors and does not throw raw errors
import { NextRequest, NextResponse } from 'next/server';
import { buildCommandEnvelope, isExpired } from '@/lib/commands/normalize';
import type { DsgCommandEnvelope } from '@/lib/commands/schema';

export const dynamic = 'force-dynamic';

type QueueRecord = DsgCommandEnvelope & {
  result?: Record<string, unknown>;
  error?: { code: string; message: string };
};

const globalForCommands = globalThis as typeof globalThis & {
  __dsgOwnerCommandQueue?: Map<string, QueueRecord>;
  __dsgIdempotencyIndex?: Map<string, string>;
};

function queue() {
  if (!globalForCommands.__dsgOwnerCommandQueue) globalForCommands.__dsgOwnerCommandQueue = new Map();
  return globalForCommands.__dsgOwnerCommandQueue;
}

function idempotencyIndex() {
  if (!globalForCommands.__dsgIdempotencyIndex) globalForCommands.__dsgIdempotencyIndex = new Map();
  return globalForCommands.__dsgIdempotencyIndex;
}

function pruneExpired() {
  const q = queue();
  const index = idempotencyIndex();
  for (const [commandId, command] of q.entries()) {
    if (isExpired(command.policy.expiresAt) && !['running', 'succeeded'].includes(command.executionState)) {
      command.executionState = 'expired';
      command.approval.state = 'expired';
      index.delete(command.idempotency.key);
      q.set(commandId, command);
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function GET(request: NextRequest) {
  pruneExpired();
  const deviceId = request.nextUrl.searchParams.get('deviceId');
  const records = Array.from(queue().values())
    .filter((command) => !deviceId || command.target.deviceId === deviceId)
    .sort((a, b) => b.audit.requestedAt.localeCompare(a.audit.requestedAt));

  return NextResponse.json({
    ok: true,
    count: records.length,
    commands: records,
    note: 'In-memory MVP queue. Production implementation must persist this in the DSG One/control-plane database.',
  });
}

export async function POST(request: NextRequest) {
  pruneExpired();
  const body = asRecord(await request.json().catch(() => null));
  const target = asRecord(body.target);
  const tool = asRecord(body.tool);
  const args = asRecord(body.args);

  try {
    const command = buildCommandEnvelope({
      sourceKind: (body.sourceKind as DsgCommandEnvelope['source']['kind']) ?? 'cli',
      actorType: (body.actorType as DsgCommandEnvelope['source']['actorType']) ?? 'user',
      actorId: typeof body.actorId === 'string' ? body.actorId : 'operator:local',
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
      deviceId: typeof target.deviceId === 'string' ? target.deviceId : typeof body.deviceId === 'string' ? body.deviceId : undefined,
      toolName: typeof tool.name === 'string' ? tool.name : String(body.toolName ?? ''),
      args,
      idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
    });

    const index = idempotencyIndex();
    const existingId = index.get(command.idempotency.key);
    if (existingId) {
      const existing = queue().get(existingId);
      if (existing && !isExpired(existing.policy.expiresAt)) {
        return NextResponse.json({ ok: true, deduped: true, command: existing }, { status: 200 });
      }
      index.delete(command.idempotency.key);
    }

    queue().set(command.commandId, command);
    index.set(command.idempotency.key, command.commandId);

    return NextResponse.json({ ok: true, command }, { status: 202 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'COMMAND_REJECTED',
      message: error instanceof Error ? error.message : 'Invalid command request',
    }, { status: 400 });
  }
}
