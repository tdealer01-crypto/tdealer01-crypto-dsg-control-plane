import { describe, expect, it } from 'vitest';
import { readJsonBody, jsonSizeBytes, maxObjectDepth } from '../../../lib/security/request-json';

function makeRequest(body: string, contentLength?: number, contentType = 'application/json') {
  const headers: Record<string, string> = { 'content-type': contentType };
  if (contentLength !== undefined) {
    headers['content-length'] = String(contentLength);
  }
  return new Request('http://localhost/', {
    method: 'POST',
    headers,
    body,
  });
}

// ─── readJsonBody ─────────────────────────────────────────────────────────────

describe('readJsonBody', () => {
  it('returns ok:true and parsed value for valid JSON', async () => {
    const result = await readJsonBody(makeRequest('{"key":"value"}'));
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ key: 'value' });
    expect(result.status).toBe(200);
    expect(result.error).toBeNull();
  });

  it('returns 400 empty_body for empty body', async () => {
    const result = await readJsonBody(makeRequest(''));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toBe('empty_body');
    expect(result.value).toBeNull();
  });

  it('returns 400 invalid_json for non-JSON body', async () => {
    const result = await readJsonBody(makeRequest('not json'));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toBe('invalid_json');
  });

  it('returns 413 payload_too_large when content-length header exceeds default maxBytes', async () => {
    const result = await readJsonBody(makeRequest('{}', 65_000));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(413);
    expect(result.error).toBe('payload_too_large');
  });

  it('returns 413 payload_too_large when content-length header exceeds custom maxBytes', async () => {
    const result = await readJsonBody(makeRequest('{"x":1}', 500), { maxBytes: 100 });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(413);
    expect(result.error).toBe('payload_too_large');
  });

  it('accepts body at default maxBytes boundary', async () => {
    const result = await readJsonBody(makeRequest('{"x":1}', 100));
    expect(result.ok).toBe(true);
  });

  it('parses arrays at top level', async () => {
    const result = await readJsonBody(makeRequest('[1,2,3]'));
    expect(result.ok).toBe(true);
    expect(result.value).toEqual([1, 2, 3]);
  });

  it('parses primitive JSON values', async () => {
    const result = await readJsonBody(makeRequest('"hello"'));
    expect(result.ok).toBe(true);
    expect(result.value).toBe('hello');
  });

  it('returns generic type when T is specified', async () => {
    type Payload = { orgId: string };
    const result = await readJsonBody<Payload>(makeRequest('{"orgId":"org-1"}'));
    expect(result.ok).toBe(true);
    expect(result.value?.orgId).toBe('org-1');
  });
});

// ─── jsonSizeBytes ────────────────────────────────────────────────────────────

describe('jsonSizeBytes', () => {
  it('returns byte size of a JSON-serialized object', () => {
    const value = { a: 1 };
    const expected = Buffer.byteLength(JSON.stringify(value), 'utf8');
    expect(jsonSizeBytes(value)).toBe(expected);
  });

  it('handles empty object', () => {
    expect(jsonSizeBytes({})).toBe(2); // "{}"
  });

  it('handles null', () => {
    expect(jsonSizeBytes(null)).toBe(4); // "null"
  });

  it('handles multi-byte unicode characters', () => {
    const value = { emoji: '🔒' };
    const expected = Buffer.byteLength(JSON.stringify(value), 'utf8');
    expect(jsonSizeBytes(value)).toBe(expected);
  });
});

// ─── maxObjectDepth ──────────────────────────────────────────────────────────

describe('maxObjectDepth', () => {
  it('returns true for a flat object (depth 1)', () => {
    expect(maxObjectDepth({ a: 1, b: 2 })).toBe(true);
  });

  it('returns true for null', () => {
    expect(maxObjectDepth(null)).toBe(true);
  });

  it('returns true for a primitive', () => {
    expect(maxObjectDepth(42)).toBe(true);
    expect(maxObjectDepth('str')).toBe(true);
  });

  it('returns true for an array of primitives', () => {
    expect(maxObjectDepth([1, 2, 3])).toBe(true);
  });

  it('returns true for nested object within default maxDepth (8)', () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: { h: 1 } } } } } } } };
    expect(maxObjectDepth(deep)).toBe(true);
  });

  it('returns false for object deeper than maxDepth', () => {
    const tooDeep = { a: { b: { c: { d: { e: { f: { g: { h: { i: 1 } } } } } } } } };
    expect(maxObjectDepth(tooDeep)).toBe(false);
  });

  it('returns false when custom maxDepth is exceeded', () => {
    expect(maxObjectDepth({ a: { b: { c: 1 } } }, 2)).toBe(false);
  });

  it('returns true when nested array depth is within limit', () => {
    expect(maxObjectDepth([[1, 2], [3, 4]], 2)).toBe(true);
  });
});
