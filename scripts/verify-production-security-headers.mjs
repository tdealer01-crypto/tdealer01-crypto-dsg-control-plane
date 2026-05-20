#!/usr/bin/env node

const target = process.env.SECURITY_HEADERS_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

if (!target) {
  console.error('[security-headers] Set SECURITY_HEADERS_URL, NEXT_PUBLIC_APP_URL, or APP_URL');
  process.exit(1);
}

const url = new URL('/', target);
const response = await fetch(url, { method: 'GET', redirect: 'manual' });
const headers = response.headers;
const failures = [];

function requireHeader(name) {
  const value = headers.get(name);
  if (!value) failures.push(`${name}: missing`);
  return value;
}

function forbidValue(name, forbidden) {
  const value = headers.get(name);
  if (value && value.trim() === forbidden) failures.push(`${name}: forbidden value ${forbidden}`);
}

const csp = requireHeader('content-security-policy');
requireHeader('strict-transport-security');
requireHeader('x-frame-options');
requireHeader('x-content-type-options');
requireHeader('referrer-policy');
requireHeader('permissions-policy');
forbidValue('access-control-allow-origin', '*');

if (csp) {
  for (const directive of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"]) {
    if (!csp.includes(directive)) failures.push(`content-security-policy: missing ${directive}`);
  }
}

if (failures.length > 0) {
  console.error('[security-headers] FAIL', { url: url.toString(), status: response.status, failures });
  process.exit(1);
}

console.log('[security-headers] PASS', {
  url: url.toString(),
  status: response.status,
  checked: [
    'content-security-policy',
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'access-control-allow-origin',
  ],
});
