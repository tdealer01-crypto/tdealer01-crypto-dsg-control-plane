import { describe, it, expect, afterEach } from 'vitest';
import {
  canonicalJson,
  sha256,
  gate,
  parseAllowedOrigins,
  assertUrlAllowed,
  assertInsideRoot,
  classifyBrowserAction,
  requireApprovalForRisk,
} from '../policy.js';

// ---------------------------------------------------------------------------
// canonicalJson / sortJson
// ---------------------------------------------------------------------------
describe('canonicalJson', () => {
  it('sorts object keys alphabetically', () => {
    expect(canonicalJson({ z: 1, a: 2, m: 3 })).toBe('{"a":2,"m":3,"z":1}');
  });

  it('sorts nested object keys recursively', () => {
    expect(canonicalJson({ b: { z: 1, a: 2 }, a: 0 })).toBe('{"a":0,"b":{"a":2,"z":1}}');
  });

  it('preserves array order (arrays are not sorted)', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
  });

  it('sorts objects inside arrays', () => {
    expect(canonicalJson([{ z: 1, a: 2 }])).toBe('[{"a":2,"z":1}]');
  });

  it('handles primitives unchanged', () => {
    expect(canonicalJson(42)).toBe('42');
    expect(canonicalJson('hello')).toBe('"hello"');
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson(true)).toBe('true');
  });

  it('produces the same output regardless of insertion order', () => {
    const a = canonicalJson({ x: 1, y: 2 });
    const b = canonicalJson({ y: 2, x: 1 });
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// sha256
// ---------------------------------------------------------------------------
describe('sha256', () => {
  it('returns a 64-character hex string', () => {
    const result = sha256('hello');
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same string input always produces the same hash', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
  });

  it('string and equivalent Buffer produce the same hash', () => {
    const str = 'hello world';
    const buf = Buffer.from(str, 'utf8');
    expect(sha256(str)).toBe(sha256(buf));
  });

  it('different inputs produce different hashes', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
  });
});

// ---------------------------------------------------------------------------
// gate
// ---------------------------------------------------------------------------
describe('gate', () => {
  it('returns PASS when passed=true', () => {
    const result = gate({ url: 'https://example.com' }, 'low', true, 'ok');
    expect(result.status).toBe('PASS');
  });

  it('returns BLOCKED_WITH_EVIDENCE when passed=false', () => {
    const result = gate({ url: 'https://evil.com' }, 'low', false, 'blocked');
    expect(result.status).toBe('BLOCKED_WITH_EVIDENCE');
  });

  it('always has policyVersion dsg-mcp-browser-agent-v0.1', () => {
    const result = gate({}, 'high', true, 'reason');
    expect(result.policyVersion).toBe('dsg-mcp-browser-agent-v0.1');
  });

  it('reflects the risk level', () => {
    expect(gate({}, 'medium', true, 'r').risk).toBe('medium');
    expect(gate({}, 'high', false, 'r').risk).toBe('high');
  });

  it('inputHash equals sha256 of canonical JSON of the input', () => {
    const input = { z: 2, a: 1 };
    const result = gate(input, 'low', true, 'ok');
    expect(result.inputHash).toBe(sha256(canonicalJson(input)));
  });

  it('evidenceHash changes when the reason changes (tamper-evidence)', () => {
    const r1 = gate({ x: 1 }, 'low', true, 'reason A');
    const r2 = gate({ x: 1 }, 'low', true, 'reason B');
    expect(r1.evidenceHash).not.toBe(r2.evidenceHash);
  });

  it('evidenceHash changes when passed flips', () => {
    const r1 = gate({ x: 1 }, 'low', true, 'same reason');
    const r2 = gate({ x: 1 }, 'low', false, 'same reason');
    expect(r1.evidenceHash).not.toBe(r2.evidenceHash);
  });

  it('evidenceHash changes when risk changes', () => {
    const r1 = gate({}, 'low', true, 'r');
    const r2 = gate({}, 'high', true, 'r');
    expect(r1.evidenceHash).not.toBe(r2.evidenceHash);
  });
});

// ---------------------------------------------------------------------------
// parseAllowedOrigins
// ---------------------------------------------------------------------------
describe('parseAllowedOrigins', () => {
  it('returns an empty Set for undefined', () => {
    expect(parseAllowedOrigins(undefined).size).toBe(0);
  });

  it('returns an empty Set for an empty string', () => {
    expect(parseAllowedOrigins('').size).toBe(0);
  });

  it('parses a single origin', () => {
    const set = parseAllowedOrigins('https://example.com');
    expect(set.has('https://example.com')).toBe(true);
    expect(set.size).toBe(1);
  });

  it('parses multiple comma-separated origins', () => {
    const set = parseAllowedOrigins('https://a.com,https://b.com');
    expect(set.has('https://a.com')).toBe(true);
    expect(set.has('https://b.com')).toBe(true);
    expect(set.size).toBe(2);
  });

  it('trims whitespace from each entry', () => {
    const set = parseAllowedOrigins('  https://a.com  ,  https://b.com  ');
    expect(set.has('https://a.com')).toBe(true);
    expect(set.has('https://b.com')).toBe(true);
  });

  it('filters out blank segments from trailing commas', () => {
    const set = parseAllowedOrigins('https://a.com,,');
    expect(set.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// assertUrlAllowed (security-critical)
// ---------------------------------------------------------------------------
describe('assertUrlAllowed', () => {
  const origins = new Set(['https://example.com', 'http://localhost:3000']);

  it('returns a URL object for an allowed origin', () => {
    const url = assertUrlAllowed('https://example.com/path?q=1', origins);
    expect(url).toBeInstanceOf(URL);
    expect(url.origin).toBe('https://example.com');
  });

  it('allows URLs with paths, query strings, and fragments on an allowed origin', () => {
    expect(() =>
      assertUrlAllowed('https://example.com/deep/path?a=1#anchor', origins),
    ).not.toThrow();
  });

  it('throws for an origin not in the allowlist', () => {
    expect(() => assertUrlAllowed('https://evil.com', origins)).toThrow('Blocked origin:');
  });

  it('blocks file:// protocol', () => {
    expect(() => assertUrlAllowed('file:///etc/passwd', origins)).toThrow(
      'Blocked URL protocol: file:',
    );
  });

  it('blocks data: protocol', () => {
    expect(() =>
      assertUrlAllowed('data:text/html,<h1>xss</h1>', origins),
    ).toThrow('Blocked URL protocol:');
  });

  it('treats an IP address as a distinct origin from a hostname (no SSRF bypass)', () => {
    const onlyHostname = new Set(['https://example.com']);
    expect(() => assertUrlAllowed('https://1.2.3.4/path', onlyHostname)).toThrow(
      'Blocked origin:',
    );
  });

  it('allows http:// on an allowlisted http origin', () => {
    expect(() =>
      assertUrlAllowed('http://localhost:3000/api', origins),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// assertInsideRoot (security-critical)
// ---------------------------------------------------------------------------
describe('assertInsideRoot', () => {
  it('returns the resolved absolute path for a legitimate child', () => {
    const result = assertInsideRoot('/workspace', 'subdir/file.txt');
    expect(result).toBe('/workspace/subdir/file.txt');
  });

  it('returns the root itself when candidate resolves to root', () => {
    expect(() => assertInsideRoot('/workspace', '.')).not.toThrow();
  });

  it('throws on ../traversal out of root', () => {
    expect(() => assertInsideRoot('/workspace', '../escape')).toThrow(
      'Blocked path traversal outside DSG_WORKSPACE_ROOT',
    );
  });

  it('throws on a deeply nested traversal', () => {
    expect(() =>
      assertInsideRoot('/workspace', 'sub/../../etc/passwd'),
    ).toThrow('Blocked path traversal outside DSG_WORKSPACE_ROOT');
  });

  it('throws when candidate is an absolute path outside root', () => {
    expect(() => assertInsideRoot('/workspace', '/etc/shadow')).toThrow(
      'Blocked path traversal outside DSG_WORKSPACE_ROOT',
    );
  });

  it('allows a deep legitimate relative path', () => {
    expect(() =>
      assertInsideRoot('/workspace', 'a/b/c/d/e/file.ts'),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// classifyBrowserAction
// ---------------------------------------------------------------------------
describe('classifyBrowserAction', () => {
  it.each(['inspect', 'navigate', 'snapshot'])('%s is low risk', (action) => {
    expect(classifyBrowserAction(action)).toBe('low');
  });

  it.each(['click', 'download'])('%s is medium risk', (action) => {
    expect(classifyBrowserAction(action)).toBe('medium');
  });

  it.each(['form_fill', 'submit', 'unknown_action'])('%s is high risk', (action) => {
    expect(classifyBrowserAction(action)).toBe('high');
  });
});

// ---------------------------------------------------------------------------
// requireApprovalForRisk
// ---------------------------------------------------------------------------
describe('requireApprovalForRisk', () => {
  afterEach(() => {
    delete process.env.DSG_APPROVAL_TOKEN;
  });

  it('low risk returns without checking env or token', () => {
    delete process.env.DSG_APPROVAL_TOKEN;
    expect(() => requireApprovalForRisk('low')).not.toThrow();
    expect(() => requireApprovalForRisk('low', 'any-token')).not.toThrow();
  });

  it('medium risk with no DSG_APPROVAL_TOKEN env throws', () => {
    delete process.env.DSG_APPROVAL_TOKEN;
    expect(() => requireApprovalForRisk('medium', 'any')).toThrow('Blocked:');
  });

  it('medium risk with wrong approvalToken throws', () => {
    process.env.DSG_APPROVAL_TOKEN = 'correct-secret';
    expect(() => requireApprovalForRisk('medium', 'wrong')).toThrow('Blocked:');
  });

  it('medium risk with undefined approvalToken throws', () => {
    process.env.DSG_APPROVAL_TOKEN = 'correct-secret';
    expect(() => requireApprovalForRisk('medium', undefined)).toThrow('Blocked:');
  });

  it('medium risk with correct approvalToken does not throw', () => {
    process.env.DSG_APPROVAL_TOKEN = 'correct-secret';
    expect(() => requireApprovalForRisk('medium', 'correct-secret')).not.toThrow();
  });

  it('high risk with correct approvalToken does not throw', () => {
    process.env.DSG_APPROVAL_TOKEN = 'tok';
    expect(() => requireApprovalForRisk('high', 'tok')).not.toThrow();
  });

  it('high risk without env or token throws', () => {
    delete process.env.DSG_APPROVAL_TOKEN;
    expect(() => requireApprovalForRisk('high')).toThrow('Blocked:');
  });
});
