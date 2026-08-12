#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const PROD_URL = 'https://tdealer01-crypto-dsg-control-plane.onrender.com';
const VALID_RISKS = new Set(['low', 'medium', 'high', 'critical']);
const VALID_COMMANDS = new Set(['evaluate', 'prove']);

function fail(message, code = 2, details = undefined) {
  const payload = { ok: false, error: message };
  if (details !== undefined) payload.details = details;
  console.error(JSON.stringify(payload, null, 2));
  process.exit(code);
}

function parseArgs(argv) {
  const out = { command: 'evaluate' };
  const args = [...argv];
  if (args[0] && !args[0].startsWith('--')) out.command = args.shift();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) fail(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (key === 'raw') {
      out.raw = true;
      continue;
    }
    const value = args[i + 1];
    if (!value || value.startsWith('--')) fail(`Missing value for --${key}`);
    out[key] = value;
    i += 1;
  }
  return out;
}

async function loadContext(args) {
  if (args['context-file']) {
    const text = await readFile(args['context-file'], 'utf8');
    return JSON.parse(text);
  }
  if (args.context) return JSON.parse(args.context);
  return {};
}

function token(prefix, bytes = 18) {
  return `${prefix}_${randomBytes(bytes).toString('base64url')}`;
}

function safeUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('DSG_CONTROL_PLANE_URL must be a valid URL');
  }

  const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !isLoopback) {
    fail('DSG_CONTROL_PLANE_URL must use HTTPS outside localhost');
  }
  return url.origin;
}

function exitForGate(gateStatus) {
  if (gateStatus === 'PASS') return 0;
  if (gateStatus === 'REVIEW') return 10;
  if (gateStatus === 'BLOCK') return 11;
  return 12;
}

const args = parseArgs(process.argv.slice(2));
if (!VALID_COMMANDS.has(args.command)) fail('Command must be evaluate or prove');

const apiKey = process.env.DSG_API_KEY?.trim();
if (!apiKey) {
  fail('DSG_API_KEY is required. Create a key with gates:evaluate and/or proofs:prove scope.');
}

const baseUrl = safeUrl(process.env.DSG_CONTROL_PLANE_URL?.trim() || PROD_URL);
const riskLevel = args.risk || 'medium';
if (!VALID_RISKS.has(riskLevel)) fail('--risk must be low, medium, high, or critical');

let context;
try {
  context = await loadContext(args);
} catch (error) {
  fail('Context must be valid JSON', 2, error instanceof Error ? error.message : String(error));
}
if (!context || typeof context !== 'object' || Array.isArray(context)) {
  fail('Context must be a JSON object');
}
if (args.action) context = { action: args.action, ...context };

const payload = {
  riskLevel,
  nonce: token('nonce'),
  idempotencyKey: token('idem', 24),
  context,
};
if (args['plan-id']) payload.planId = args['plan-id'];
if (args['policy-ref']) payload.policyRef = args['policy-ref'];
if (args['policy-version']) payload.policyVersion = args['policy-version'];
if (args['previous-proof-hash']) payload.previousProofHash = args['previous-proof-hash'];

const path = args.command === 'prove'
  ? '/api/dsg/v1/proofs/prove'
  : '/api/dsg/v1/gates/evaluate';

const requestedTimeout = Number(args.timeout || 20000);
if (!Number.isFinite(requestedTimeout) || requestedTimeout < 1000 || requestedTimeout > 120000) {
  fail('--timeout must be between 1000 and 120000 milliseconds');
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), requestedTimeout);
let response;
let body;
try {
  response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      accept: 'application/json',
      'user-agent': 'dsg-production-agent-skill/1.1',
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });

  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    fail('DSG API returned non-JSON response', 3, { status: response.status });
  }
} catch (error) {
  fail('DSG production API request failed', 3, error instanceof Error ? error.message : String(error));
} finally {
  clearTimeout(timeout);
}

if (!response.ok) {
  const error = body?.error || `HTTP ${response.status}`;
  const action = response.status === 401 || response.status === 403
    ? 'Check DSG_API_KEY and its scopes/status.'
    : response.status === 402
      ? 'Entitlement or quota blocked this call; correct entitlement before retrying.'
      : response.status === 429
        ? 'Rate limit exceeded; retry after the limit window.'
        : 'Inspect the API response and server evidence before retrying.';

  console.error(JSON.stringify({ ok: false, httpStatus: response.status, error, action }, null, 2));
  process.exit(3);
}

if (args.raw) {
  console.log(JSON.stringify(body, null, 2));
  if (args.command === 'evaluate') process.exit(exitForGate(body.gateStatus));
  process.exit(body.ok === true ? 0 : 12);
}

if (args.command === 'evaluate') {
  const gateStatus = body?.gateStatus;
  if (!['PASS', 'REVIEW', 'BLOCK', 'UNSUPPORTED'].includes(gateStatus)) {
    fail('Malformed DSG gate response: missing/invalid gateStatus', 3);
  }

  const proof = body?.proof || {};
  const result = {
    ok: body.ok === true,
    gateStatus,
    canProceed: body.ok === true && gateStatus === 'PASS',
    riskLevel: body.riskLevel || riskLevel,
    reason: body.reason ?? null,
    proofId: proof.proofId ?? null,
    proofHash: proof.proofHash ?? null,
    productionReadyClaim: body?.boundary?.productionReadyClaim === true,
    endpoint: `${baseUrl}${path}`,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(exitForGate(gateStatus));
}

const proof = body?.proof || {};
console.log(JSON.stringify({
  ok: body.ok === true,
  proofStatus: proof.status ?? null,
  proofId: proof.proofId ?? null,
  proofHash: proof.proofHash ?? null,
  productionReadyClaim: body?.boundary?.productionReadyClaim === true,
  endpoint: `${baseUrl}${path}`,
}, null, 2));
process.exit(body.ok === true ? 0 : 12);
