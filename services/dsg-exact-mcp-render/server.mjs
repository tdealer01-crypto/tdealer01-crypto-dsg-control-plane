import http from 'node:http';
import { createHash } from 'node:crypto';
import z3solver from 'z3-solver';

const { init } = z3solver;
const VERSION = '0.4.0';
const PORT = Number(process.env.PORT || 10000);
const MAX_RAW_LENGTH = 240;
const MAX_Z3_EXPONENT = 1000n;
const DECIMAL_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const MODERN_VERSION = '2026-07-28';
const LEGACY_VERSION = '2025-11-25';
let contextSeq = 0;
let z3State = 'initializing';
let z3Error = null;
const z3Ready = init().then(api => { z3State = 'ready'; return api; }).catch(err => { z3State = 'failed'; z3Error = err instanceof Error ? err.message : String(err); throw err; });

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type,accept,mcp-protocol-version,mcp-method,mcp-name',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  });
  res.end(data);
}

function parseDecimalRaw(value) {
  if (typeof value !== 'string') throw new Error('INVALID_DECIMAL_FORMAT');
  const raw = value.trim();
  if (!raw || raw.length > MAX_RAW_LENGTH || !DECIMAL_RE.test(raw)) throw new Error('INVALID_DECIMAL_FORMAT');
  let sign = 1;
  let rest = raw;
  if (rest.startsWith('-')) { sign = -1; rest = rest.slice(1); }
  else if (rest.startsWith('+')) rest = rest.slice(1);
  const expMatch = rest.match(/^(.*?)[eE]([+-]?\d+)$/);
  let exp = 0n;
  let mantissa = rest;
  if (expMatch) { mantissa = expMatch[1]; exp = BigInt(expMatch[2]); }
  const dotIdx = mantissa.indexOf('.');
  let intPart = dotIdx === -1 ? mantissa : mantissa.slice(0, dotIdx);
  const fracPart = dotIdx === -1 ? '' : mantissa.slice(dotIdx + 1);
  intPart = intPart.replace(/^0+/, '') || '0';
  const digits = (intPart + fracPart).replace(/^0+/, '') || '0';
  const expNet = exp - BigInt(fracPart.length);
  if (digits === '0') sign = 1;
  return { sign, digits, exp, expNet, raw };
}

function compareCompositeRaw(aRaw, bRaw) {
  const a = parseDecimalRaw(aRaw);
  const b = parseDecimalRaw(bRaw);
  const az = a.digits === '0';
  const bz = b.digits === '0';
  if (az && bz) return 0;
  if (az) return b.sign === 1 ? -1 : 1;
  if (bz) return a.sign === 1 ? 1 : -1;
  if (a.sign !== b.sign) return a.sign > b.sign ? 1 : -1;
  const ae = a.expNet + BigInt(a.digits.length);
  const be = b.expNet + BigInt(b.digits.length);
  let cmp = 0;
  if (ae !== be) cmp = ae > be ? 1 : -1;
  else {
    const len = Math.max(a.digits.length, b.digits.length);
    for (let i = 0; i < len; i++) {
      const ad = i < a.digits.length ? a.digits.charCodeAt(i) : 48;
      const bd = i < b.digits.length ? b.digits.charCodeAt(i) : 48;
      if (ad !== bd) { cmp = ad > bd ? 1 : -1; break; }
    }
  }
  return a.sign === 1 ? cmp : cmp === 0 ? 0 : cmp === 1 ? -1 : 1;
}

function compareId(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function absBig(v) { return v < 0n ? -v : v; }
function pow10(n) { if (n < 0n) throw new Error('NEGATIVE_POW10'); return 10n ** n; }

function validateZ3(raw, field) {
  const p = parseDecimalRaw(raw);
  if (absBig(p.exp) > MAX_Z3_EXPONENT) return { ok: false, reason: 'Z3_EXPONENT_LIMIT', field, maxAbsExponent: String(MAX_Z3_EXPONENT), receivedExponent: String(p.exp) };
  return { ok: true, parsed: p };
}

function exactDecimalToZ3Fraction(raw) {
  const gate = validateZ3(raw, 'decimal');
  if (!gate.ok) return gate;
  const p = gate.parsed;
  if (p.digits === '0') return { ok: true, numerator: '0', denominator: '1' };
  let numerator = BigInt(p.digits) * BigInt(p.sign);
  let denominator = 1n;
  if (p.expNet >= 0n) numerator *= pow10(p.expNet);
  else denominator = pow10(-p.expNet);
  return { ok: true, numerator: String(numerator), denominator: String(denominator) };
}

function evidenceHash(candidates, k, minComposite) {
  return createHash('sha256').update(JSON.stringify({ candidates, k, minComposite })).digest('hex');
}

async function verifyWithZ3(sorted, expected, k) {
  try {
    const api = await z3Ready;
    const z3 = api.Context(`dsg_exact_${++contextSeq}`);
    const solver = new z3.Solver();
    const values = sorted.map(c => {
      const f = exactDecimalToZ3Fraction(c.composite);
      if (!f.ok) throw new Error(JSON.stringify(f));
      const n = z3.Real.val(f.numerator);
      return f.denominator === '1' ? n : n.div(z3.Real.val(f.denominator));
    });
    for (let i = 0; i + 1 < values.length; i++) solver.add(values[i].ge(values[i + 1]));
    const xs = sorted.map((_, i) => z3.Bool.const(`selected_${contextSeq}_${i}`));
    let count = z3.Int.val(0);
    for (const x of xs) count = count.add(z3.If(x, z3.Int.val(1), z3.Int.val(0)));
    solver.add(count.eq(k));
    for (let i = 0; i + 1 < xs.length; i++) solver.add(xs[i + 1].implies(xs[i]));
    const result = await solver.check();
    if (result !== 'sat') return { ok: false, reason: `SOLVER_${String(result).toUpperCase()}`, solverResult: result };
    const model = solver.model();
    const selected = xs.flatMap((x, i) => model.eval(x).toString() === 'true' ? [sorted[i]] : []);
    const actualIds = selected.map(c => c.id);
    const expectedIds = expected.map(c => c.id);
    if (actualIds.length !== k) return { ok: false, reason: 'SOLVER_POSTCONDITION_FAILED', expected: k, actual: actualIds.length };
    if (actualIds.length !== expectedIds.length || expectedIds.some((id, i) => id !== actualIds[i])) return { ok: false, reason: 'Z3_DETERMINISTIC_RESULT_MISMATCH', expected: expectedIds, actual: actualIds };
    return { ok: true, selected, solverResult: result };
  } catch (err) {
    return { ok: false, reason: 'Z3_EXECUTION_FAILED', error: err instanceof Error ? err.message : String(err) };
  }
}

async function exactSelect(input) {
  const data = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const candidates = data.candidates;
  const k = data.k ?? 12;
  const minComposite = data.minComposite ?? '0';
  const useZ3 = data.useZ3 ?? false;
  if (!Array.isArray(candidates)) return { success: false, status: 'BLOCKED', reason: 'INVALID_CANDIDATES_TYPE' };
  if (candidates.length < 1 || candidates.length > 24) return { success: false, status: 'BLOCKED', reason: 'POOL_LIMIT', minPool: 1, maxPool: 24, actual: candidates.length };
  if (!Number.isInteger(k) || k < 1 || k > 12) return { success: false, status: 'BLOCKED', reason: 'INVALID_K', expected: 'integer 1..12', received: k };
  if (typeof useZ3 !== 'boolean') return { success: false, status: 'BLOCKED', reason: 'INVALID_USEZ3_TYPE' };
  if (typeof minComposite !== 'string' || !minComposite.trim() || minComposite.trim().length > MAX_RAW_LENGTH || !DECIMAL_RE.test(minComposite.trim())) return { success: false, status: 'BLOCKED', reason: 'INVALID_MIN_COMPOSITE_FORMAT', maxRawLength: MAX_RAW_LENGTH };
  const normalized = [];
  const seen = new Set();
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (!c || typeof c !== 'object' || Array.isArray(c)) return { success: false, status: 'BLOCKED', reason: 'INVALID_CANDIDATE_OBJECT', index: i };
    if (typeof c.id !== 'string' || c.id.length < 1 || c.id.length > 256) return { success: false, status: 'BLOCKED', reason: 'INVALID_CANDIDATE_ID', index: i };
    if (seen.has(c.id)) return { success: false, status: 'BLOCKED', reason: 'DUPLICATE_CANDIDATE_ID', id: c.id, index: i };
    seen.add(c.id);
    if (typeof c.composite !== 'string' || !c.composite.trim() || c.composite.trim().length > MAX_RAW_LENGTH || !DECIMAL_RE.test(c.composite.trim())) return { success: false, status: 'BLOCKED', reason: 'INVALID_CANDIDATE_COMPOSITE_FORMAT', id: c.id, index: i, maxRawLength: MAX_RAW_LENGTH };
    if (useZ3) { const gate = validateZ3(c.composite, `candidate:${c.id}`); if (!gate.ok) return { success: false, status: 'BLOCKED', ...gate }; }
    normalized.push({ id: c.id, composite: c.composite.trim() });
  }
  if (useZ3) { const gate = validateZ3(minComposite, 'minComposite'); if (!gate.ok) return { success: false, status: 'BLOCKED', ...gate }; }
  const eligible = normalized.filter(c => compareCompositeRaw(c.composite, minComposite) >= 0);
  if (useZ3 && eligible.length < k) return { success: false, status: 'BLOCKED', reason: 'INSUFFICIENT_CANDIDATES_FOR_EXACT_K', required: k, actual: eligible.length };
  const sorted = [...eligible].sort((a, b) => compareCompositeRaw(b.composite, a.composite) || compareId(a.id, b.id));
  const selected = sorted.slice(0, k);
  const proofHash = evidenceHash(normalized, k, minComposite);
  if (!useZ3) return { success: true, status: 'PASSED', mode: eligible.length <= k ? 'no-optimization-needed' : 'exact-sort', solver: 'none', totalInput: normalized.length, eligibleCount: eligible.length, k, selectedCount: selected.length, selected, verification: 'deterministic exact decimal comparator', evidenceHash: proofHash };
  const z3 = await verifyWithZ3(sorted, selected, k);
  if (!z3.ok) return { success: false, status: 'BLOCKED', ...z3, evidenceHash: proofHash };
  return { success: true, status: 'PASSED', mode: 'verified-exact', solver: 'z3-wasm Real + prefix proof + deterministic postcondition', solverResult: z3.solverResult, totalInput: normalized.length, eligibleCount: eligible.length, k, selectedCount: z3.selected.length, selected: z3.selected, verification: 'Z3 exact-real ordering and selection matched deterministic exact comparator', evidenceHash: proofHash };
}

const tool = {
  name: 'dsg_exact_select',
  title: 'DSG Exact Select',
  description: 'Use this when you need deterministic top-k selection from up to 24 candidates using exact decimal strings, stable ID tie-breaking, and optional Z3 verification. This tool only computes and does not modify external systems.',
  inputSchema: {
    type: 'object', additionalProperties: false, required: ['candidates'], properties: {
      candidates: { type: 'array', minItems: 1, maxItems: 24, items: { type: 'object', additionalProperties: false, required: ['id', 'composite'], properties: { id: { type: 'string', minLength: 1, maxLength: 256 }, composite: { type: 'string', minLength: 1, maxLength: 240, pattern: '^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?$' } } } },
      k: { type: 'integer', minimum: 1, maximum: 12, default: 12 },
      minComposite: { type: 'string', minLength: 1, maxLength: 240, pattern: '^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?$', default: '0' },
      useZ3: { type: 'boolean', default: false }
    }
  },
  outputSchema: { type: 'object', required: ['success', 'status'], properties: { success: { type: 'boolean' }, status: { enum: ['PASSED', 'BLOCKED'] }, reason: { type: 'string' }, mode: { type: 'string' }, solver: { type: 'string' }, solverResult: { type: 'string' }, selectedCount: { type: 'integer' }, selected: { type: 'array', items: { type: 'object', required: ['id', 'composite'], properties: { id: { type: 'string' }, composite: { type: 'string' } } } }, evidenceHash: { type: 'string' } }, additionalProperties: true },
  annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false, idempotentHint: true }
};

function rpcError(id, code, message, data) { return { jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } }; }
function meta() { return { 'io.modelcontextprotocol/serverInfo': { name: 'dsg-exact-selector', version: VERSION } }; }

async function handleMcp(body, headers) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.jsonrpc !== '2.0' || typeof body.method !== 'string') return rpcError(body?.id, -32600, 'Invalid Request');
  const declaredMethod = headers['mcp-method'];
  if (declaredMethod && declaredMethod !== body.method) return rpcError(body.id, -32600, 'MCP method header/body mismatch');
  const method = body.method;
  if (method === 'server/discover') return { jsonrpc: '2.0', id: body.id, result: { supportedVersions: [MODERN_VERSION, LEGACY_VERSION], capabilities: { tools: { listChanged: false } }, instructions: 'Use dsg_exact_select for bounded deterministic exact-decimal top-k selection.', ttlMs: 300000, cacheScope: 'public', _meta: meta() } };
  if (method === 'initialize') return { jsonrpc: '2.0', id: body.id, result: { protocolVersion: LEGACY_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'dsg-exact-selector', version: VERSION }, instructions: 'Use dsg_exact_select for bounded deterministic exact-decimal top-k selection.' } };
  if (method === 'ping') return { jsonrpc: '2.0', id: body.id, result: {} };
  if (method === 'tools/list') return { jsonrpc: '2.0', id: body.id, result: { tools: [tool], ttlMs: 300000, cacheScope: 'public', _meta: meta() } };
  if (method === 'tools/call') {
    if (body.params?.name !== tool.name) return rpcError(body.id, -32602, 'Unknown tool');
    const result = await exactSelect(body.params?.arguments ?? {});
    return { jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, isError: !result.success, _meta: meta() } };
  }
  if (method === 'notifications/initialized') return null;
  return rpcError(body.id, -32601, 'Method not found');
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : null;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,accept,mcp-protocol-version,mcp-method,mcp-name', 'access-control-allow-methods': 'GET,POST,OPTIONS' }); return res.end(); }
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok', service: 'dsg-exact-selector', version: VERSION, mcp: '/mcp', publicTool: tool.name, protocol: [MODERN_VERSION, LEGACY_VERSION], z3: { state: z3State, error: z3Error } });
    if (req.method === 'GET' && url.pathname === '/api/status') return json(res, 200, { status: 'ok', version: VERSION, tool: tool.name, maxPool: 24, maxK: 12, maxDecimalLength: MAX_RAW_LENGTH, z3: { state: z3State, error: z3Error } });
    if (req.method === 'POST' && url.pathname === '/mcp') {
      const body = await readBody(req);
      const response = await handleMcp(body, req.headers);
      if (response === null) { res.writeHead(204); return res.end(); }
      return json(res, 200, response);
    }
    return json(res, 404, { error: 'NOT_FOUND' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(res, message === 'BODY_TOO_LARGE' ? 413 : 400, { error: message === 'BODY_TOO_LARGE' ? 'BODY_TOO_LARGE' : 'INVALID_REQUEST' });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(JSON.stringify({ event: 'dsg_exact_mcp_started', port: PORT, version: VERSION })));
z3Ready.then(() => console.log(JSON.stringify({ event: 'z3_ready', version: VERSION }))).catch(err => console.error(JSON.stringify({ event: 'z3_init_failed', error: err instanceof Error ? err.message : String(err) }));
