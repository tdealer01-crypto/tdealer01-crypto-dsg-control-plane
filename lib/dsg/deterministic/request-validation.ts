import type { DeterministicProofRequest, DeterministicRiskLevel } from './types';
import { jsonSizeBytes, maxObjectDepth } from '../../security/request-json';

const RISK_LEVELS = new Set<DeterministicRiskLevel>(['low', 'medium', 'high', 'critical']);
const SAFE_ID_RE = /^[A-Za-z0-9_.:-]+$/;
const SAFE_TOKEN_RE = /^[A-Za-z0-9_-]+$/;
const HEX_HASH_RE = /^[a-fA-F0-9]{32,128}$/;

export type ValidationResult =
  | { ok: true; value: DeterministicProofRequest }
  | { ok: false; error: string; details?: Array<{ field: string; message: string }> };

function issue(field: string, message: string) {
  return { field, message };
}

function optionalSafeString(value: unknown, field: string, max = 255): { ok: true; value?: string } | { ok: false; detail: { field: string; message: string } } {
  if (value === undefined || value === null || value === '') return { ok: true };
  if (typeof value !== 'string') return { ok: false, detail: issue(field, 'must be a string') };
  const trimmed = value.trim();
  if (trimmed.length > max) return { ok: false, detail: issue(field, `must be <= ${max} chars`) };
  if (!SAFE_ID_RE.test(trimmed)) return { ok: false, detail: issue(field, 'contains unsupported characters') };
  return { ok: true, value: trimmed };
}

export function validateDeterministicProofRequest(raw: unknown): ValidationResult {
  const details: Array<{ field: string; message: string }> = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'validation_failed', details: [issue('body', 'must be an object')] };
  }

  const body = raw as Record<string, unknown>;
  const context = body.context;
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    details.push(issue('context', 'must be an object'));
  } else {
    const keys = Object.keys(context as Record<string, unknown>);
    if (keys.length > 50) details.push(issue('context', 'max 50 keys'));
    if (jsonSizeBytes(context) > 10_000) details.push(issue('context', 'max 10KB'));
    if (!maxObjectDepth(context, 8)) details.push(issue('context', 'max depth exceeded'));
  }

  const nonce = typeof body.nonce === 'string' ? body.nonce.trim() : '';
  if (!nonce) details.push(issue('nonce', 'required'));
  else if (nonce.length < 16 || nonce.length > 96 || !SAFE_TOKEN_RE.test(nonce)) {
    details.push(issue('nonce', 'must be 16-96 chars using A-Z, a-z, 0-9, _, -'));
  }

  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  if (!idempotencyKey) details.push(issue('idempotencyKey', 'required'));
  else if (idempotencyKey.length < 16 || idempotencyKey.length > 128 || !SAFE_TOKEN_RE.test(idempotencyKey)) {
    details.push(issue('idempotencyKey', 'must be 16-128 chars using A-Z, a-z, 0-9, _, -'));
  }

  const planId = optionalSafeString(body.planId, 'planId', 128);
  const policyRef = optionalSafeString(body.policyRef, 'policyRef', 255);
  const policyVersion = optionalSafeString(body.policyVersion, 'policyVersion', 50);
  for (const parsed of [planId, policyRef, policyVersion]) {
    if (!parsed.ok) details.push(parsed.detail);
  }

  let riskLevel: DeterministicRiskLevel | undefined;
  if (body.riskLevel !== undefined && body.riskLevel !== null && body.riskLevel !== '') {
    if (typeof body.riskLevel !== 'string' || !RISK_LEVELS.has(body.riskLevel as DeterministicRiskLevel)) {
      details.push(issue('riskLevel', 'must be low, medium, high, or critical'));
    } else {
      riskLevel = body.riskLevel as DeterministicRiskLevel;
    }
  }

  let previousProofHash: string | undefined;
  if (body.previousProofHash !== undefined && body.previousProofHash !== null && body.previousProofHash !== '') {
    if (typeof body.previousProofHash !== 'string' || !HEX_HASH_RE.test(body.previousProofHash)) {
      details.push(issue('previousProofHash', 'must be a hex hash'));
    } else {
      previousProofHash = body.previousProofHash;
    }
  }

  if (details.length > 0) return { ok: false, error: 'validation_failed', details };

  return {
    ok: true,
    value: {
      planId: planId.ok ? planId.value : undefined,
      policyRef: policyRef.ok ? policyRef.value : undefined,
      policyVersion: policyVersion.ok ? policyVersion.value : undefined,
      riskLevel,
      previousProofHash,
      nonce,
      idempotencyKey,
      context: context as Record<string, unknown>,
    },
  };
}
