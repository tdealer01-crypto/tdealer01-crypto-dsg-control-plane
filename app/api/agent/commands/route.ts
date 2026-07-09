// ERROR_HANDLER_EXEMPT: Owner-agent command queue returns structured JSON API responses.
import { NextRequest, NextResponse } from 'next/server';
import { buildCommandEnvelope, isExpired } from '@/lib/commands/normalize';
import type { DsgCommandEnvelope, DsgCommandState } from '@/lib/commands/schema';

export const dynamic = 'force-dynamic';

type DeviceEvent = NonNullable<DsgCommandEnvelope['audit']['deviceEvents']>[number];

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
    if (isExpired(command.policy.expiresAt) && !['running', 'succeeded', 'failed', 'blocked'].includes(command.executionState)) {
      command.executionState = 'expired';
      command.approval.state = 'expired';
      command.audit.updatedAt = new Date().toISOString();
      index.delete(command.idempotency.key);
      q.set(commandId, command);
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function listCommands(deviceId: string | null, includeDone: boolean) {
  return Array.from(queue().values())
    .filter((command) => !deviceId || command.target.deviceId === deviceId)
    .filter((command) => includeDone || !['succeeded', 'failed', 'rejected', 'expired', 'blocked'].includes(command.executionState))
    .sort((a, b) => b.audit.requestedAt.localeCompare(a.audit.requestedAt));
}

export async function GET(request: NextRequest) {
  pruneExpired();
  const deviceId = request.nextUrl.searchParams.get('deviceId');
  const includeDone = request.nextUrl.searchParams.get('includeDone') === 'true';
  const records = listCommands(deviceId, includeDone);

  return json({
    ok: true,
    count: records.length,
    commands: records,
    poll: {
      deviceId: deviceId ?? 'all',
      includeDone,
      nextPollMs: 5000,
    },
    note: 'MVP in-memory queue. Production should persist commands, approvals, and audit events in the control-plane database.',
  });
}

export async function POST(request: NextRequest) {
  pruneExpired();
  const body = asRecord(await request.json().catch(() => null));
  const action = String(body.action ?? 'enqueue');

  if (action === 'device_event') return handleDeviceEvent(body);
  if (action === 'bulk_device_events') return handleBulkDeviceEvents(body);

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
        return json({ ok: true, deduped: true, command }, 200);
      }
      index.delete(command.idempotency.key);
    }

    queue().set(command.commandId, command);
    index.set(command.idempotency.key, command.commandId);

    return json({ ok: true, command }, command.executionState === 'blocked' ? 200 : 202);
  } catch (error) {
    console.error('[agent-commands] Command rejected:', error instanceof Error ? error.stack : error);
    return json({
      ok: false,
      error: 'COMMAND_REJECTED',
      message: 'Invalid command request',
    }, 400);
  }
}

function handleBulkDeviceEvents(body: Record<string, unknown>) {
  const events = Array.isArray(body.events) ? body.events : [];
  const results = events.map((event) => handleDeviceEventRecord(asRecord(event)));
  return json({ ok: true, results });
}

function handleDeviceEvent(body: Record<string, unknown>) {
  const result = handleDeviceEventRecord(body);
  return json(result, result.ok ? 200 : 404);
}

function handleDeviceEventRecord(body: Record<string, unknown>) {
  const commandId = String(body.commandId ?? '');
  const command = queue().get(commandId);
  if (!command) return { ok: false, commandId, error: 'COMMAND_NOT_FOUND' };

  const eventType = String(body.eventType ?? 'DEVICE_EVENT');
  const state = typeof body.executionState === 'string' ? body.executionState as DsgCommandState : undefined;
  const errorCode = typeof body.errorCode === 'string' ? body.errorCode : undefined;
  const message = typeof body.message === 'string' ? body.message : eventType;
  const signatureDigest = typeof body.signatureDigest === 'string' ? body.signatureDigest : undefined;
  const result = asRecord(body.result);

  const event: DeviceEvent = {
    type: eventType,
    message,
    at: new Date().toISOString(),
    errorCode,
    signatureDigest,
  };

  command.audit.deviceEvents = [...(command.audit.deviceEvents ?? []), event];
  command.audit.updatedAt = event.at;
  if (state) command.executionState = state;
  if (errorCode) command.error = { code: errorCode, message };
  if (Object.keys(result).length > 0) command.result = result;

  queue().set(command.commandId, command);
  return { ok: true, commandId: command.commandId, executionState: command.executionState };
}
