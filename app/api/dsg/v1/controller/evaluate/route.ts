import { NextResponse } from 'next/server';
import { evaluateAutomationController } from '../../../../../../lib/dsg/controller/automation-controller';
import type { DsgAutomationControllerRequest } from '../../../../../../lib/dsg/controller/types';

export const dynamic = 'force-dynamic';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function invalid(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function parseBody(body: unknown, nonce: string, idempotencyKey: string): DsgAutomationControllerRequest | null {
  if (!isObject(body)) return null;
  if (!isObject(body.actor) || !isObject(body.resource) || !isObject(body.context)) return null;

  const actionId = text(body.actionId);
  const actionType = text(body.actionType) as DsgAutomationControllerRequest['actionType'];

  if (!actionId || !actionType) return null;

  return {
    ...(body as Omit<DsgAutomationControllerRequest, 'nonce' | 'idempotencyKey'>),
    actionId,
    actionType,
    nonce,
    idempotencyKey,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const nonce = text(isObject(body) ? body.nonce : null) || text(request.headers.get('x-dsg-nonce'));
  const idempotencyKey =
    text(isObject(body) ? body.idempotencyKey : null) || text(request.headers.get('idempotency-key'));

  if (!nonce) return invalid('missing_nonce');
  if (!idempotencyKey) return invalid('missing_idempotency_key');

  const controllerRequest = parseBody(body, nonce, idempotencyKey);
  if (!controllerRequest) return invalid('invalid_controller_request');

  const result = evaluateAutomationController(controllerRequest);

  return NextResponse.json(result);
}
