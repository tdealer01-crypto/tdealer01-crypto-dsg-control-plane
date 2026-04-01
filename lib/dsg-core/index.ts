import {
  executeOnInternalDSGCore,
  getInternalDSGCoreHealth,
} from './internal';
import {
  executeOnRemoteDSGCore,
  getRemoteDSGCoreAuditEvents,
  getRemoteDSGCoreDeterminism,
  getRemoteDSGCoreHealth,
  getRemoteDSGCoreLedger,
  getRemoteDSGCoreMetrics,
} from './remote';
import type { DSGCoreMode } from './types';

export type {
  DSGCoreAuditEvent,
  DSGCoreDeterminism,
  DSGCoreExecutionRequest,
} from './types';

function parseMode(): DSGCoreMode {
  const mode = process.env.DSG_CORE_MODE;
  if (mode === 'internal' || mode === 'remote') {
    return mode;
  }
  throw new Error('DSG_CORE_MODE must be explicitly set to "internal" or "remote"');
}

function getRemoteConfig() {
  const url = process.env.DSG_CORE_URL?.replace(/\/$/, '') || '';
  if (!url) {
    throw new Error('DSG_CORE_URL is required when DSG_CORE_MODE=remote');
  }
  return {
    url,
    apiKey: process.env.DSG_CORE_API_KEY || process.env.DSG_API_KEY || '',
  };
}

export function getDSGCoreConfig() {
  const mode = parseMode();
  const remote = mode === 'remote' ? getRemoteConfig() : { url: '', apiKey: '' };
  return {
    mode,
    url: remote.url,
    apiKey: remote.apiKey,
  };
}

export async function getDSGCoreHealth() {
  const mode = parseMode();
  if (mode === 'internal') return getInternalDSGCoreHealth();
  return getRemoteDSGCoreHealth(getRemoteConfig());
}

export async function executeOnDSGCore(payload: import('./types').DSGCoreExecutionRequest) {
  const mode = parseMode();
  if (mode === 'internal') return executeOnInternalDSGCore(payload);
  return executeOnRemoteDSGCore(getRemoteConfig(), payload);
}

export async function getDSGCoreMetrics() {
  const mode = parseMode();
  if (mode === 'internal') {
    return { ok: false, error: 'metrics endpoint is unavailable in internal DSG core mode' };
  }
  return getRemoteDSGCoreMetrics(getRemoteConfig());
}

export async function getDSGCoreLedger(limit = 20) {
  const mode = parseMode();
  if (mode === 'internal') {
    return { ok: false, items: [], error: 'ledger endpoint is unavailable in internal DSG core mode' };
  }
  return getRemoteDSGCoreLedger(getRemoteConfig(), limit);
}

export async function getDSGCoreAuditEvents(limit = 20) {
  const mode = parseMode();
  if (mode === 'internal') {
    return { ok: false, items: [], error: 'audit events endpoint is unavailable in internal DSG core mode' };
  }
  return getRemoteDSGCoreAuditEvents(getRemoteConfig(), limit);
}

export async function getDSGCoreDeterminism(sequence: number) {
  const mode = parseMode();
  if (mode === 'internal') {
    return { ok: false, error: 'determinism endpoint is unavailable in internal DSG core mode' };
  }
  return getRemoteDSGCoreDeterminism(getRemoteConfig(), sequence);
}
