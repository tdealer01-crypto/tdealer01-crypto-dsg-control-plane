import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';

export function requireEnvironment(names) {
  const missing = names.filter((name) => !String(process.env[name] ?? '').trim());
  if (missing.length > 0) {
    throw new Error(`missing_required_environment:${missing.join(',')}`);
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  const input = typeof value === 'string' ? value : canonicalJson(value);
  return createHash('sha256').update(input).digest('hex');
}

function supabaseConfiguration() {
  const baseUrl = String(process.env.AGENT_WORKSPACE_SUPABASE_URL ?? '').replace(/\/$/, '');
  const serviceRoleKey = String(process.env.AGENT_WORKSPACE_SUPABASE_SERVICE_ROLE_KEY ?? '');
  if (!baseUrl || !serviceRoleKey) throw new Error('missing_agent_workspace_supabase_configuration');
  return { baseUrl, serviceRoleKey };
}

export async function supabaseRequest(path, options = {}) {
  const { baseUrl, serviceRoleKey } = supabaseConfiguration();
  const url = new URL(`${baseUrl}/rest/v1/${path.replace(/^\//, '')}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    const detail = payload && typeof payload === 'object'
      ? payload.code ?? payload.message ?? response.statusText
      : response.statusText;
    throw new Error(`supabase_request_failed:${response.status}:${detail}`);
  }

  return payload;
}

export async function fetchSingle(table, query, select) {
  const payload = await supabaseRequest(table, {
    query: { ...query, select },
  });
  if (!Array.isArray(payload) || payload.length !== 1) {
    throw new Error(`expected_one_${table}_row_found_${Array.isArray(payload) ? payload.length : 'invalid'}`);
  }
  return payload[0];
}

export async function patchSingle(table, query, body, select = '*') {
  const payload = await supabaseRequest(table, {
    method: 'PATCH',
    query: { ...query, select },
    body,
    prefer: 'return=representation',
  });
  if (!Array.isArray(payload) || payload.length !== 1) {
    throw new Error(`expected_one_updated_${table}_row_found_${Array.isArray(payload) ? payload.length : 'invalid'}`);
  }
  return payload[0];
}

export function writeGithubOutput(values) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  for (const [key, value] of Object.entries(values)) {
    appendFileSync(outputPath, `${key}=${String(value).replace(/\n/g, '%0A')}\n`, 'utf8');
  }
}

export function assertHttpsUrl(name, value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name}_must_be_valid_url`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`${name}_must_use_https`);
  return parsed.toString();
}
