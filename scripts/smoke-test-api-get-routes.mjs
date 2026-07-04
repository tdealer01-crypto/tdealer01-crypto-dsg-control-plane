#!/usr/bin/env node
// Boots against an already-running server and hits every static (no
// dynamic [param] segments) GET route under app/api/**/route.ts. Treats a
// completed HTTP response — any status code — as "alive". Only a network
// timeout/connection failure counts as a crash, since a well-behaved route
// should return a handled JSON error (e.g. missing config, 401, 503) rather
// than hang. This intentionally does not assert exact status codes per
// route: see tests/unit/security/api-route-auth-coverage.test.ts for the
// auth-coverage checks.

import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const REPO_ROOT = join(import.meta.dirname, '..');
const API_ROOT = join(REPO_ROOT, 'app', 'api');
const BASE_URL = process.env.SMOKE_TEST_BASE_URL || 'http://localhost:3000';
const TIMEOUT_MS = 20000;

// Routes that never close their response body by design (e.g. Server-Sent
// Events) — a timeout here is expected, not a failure signal.
const SKIP_ROUTES = new Set(['/api/monitoring/metrics/stream-sse']);

function findRouteFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) findRouteFiles(full, acc);
    else if (entry === 'route.ts') acc.push(full);
  }
  return acc;
}

function toRoutePath(filePath) {
  const rel = relative(join(REPO_ROOT, 'app'), filePath).replace(/\/route\.ts$/, '');
  return '/' + rel;
}

async function hasGet(filePath) {
  const { readFileSync } = await import('fs');
  const source = readFileSync(filePath, 'utf8');
  return /export\s+(async\s+)?function\s+GET\b/.test(source);
}

async function main() {
  const routeFiles = findRouteFiles(API_ROOT);
  const staticGetRoutes = [];
  for (const f of routeFiles) {
    const route = toRoutePath(f);
    if (route.includes('[')) continue; // skip dynamic segments — no safe placeholder value
    if (SKIP_ROUTES.has(route)) continue;
    if (await hasGet(f)) staticGetRoutes.push(route);
  }

  console.log(`Smoke-testing ${staticGetRoutes.length} static GET routes against ${BASE_URL}`);

  const failures = [];
  const statusCounts = {};
  const CONCURRENCY = Number(process.env.SMOKE_TEST_CONCURRENCY) || 2;
  let i = 0;

  async function checkRoute(route) {
    i += 1;
    const n = i;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const started = Date.now();
    try {
      const res = await fetch(BASE_URL + route, { signal: controller.signal });
      statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
      // Drain the body so keep-alive connections don't pile up, but never
      // wait longer than the same budget — a streaming (e.g. SSE) response
      // legitimately never closes its body, and that is not a failure.
      const drainTimer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      await res.arrayBuffer().catch(() => {});
      clearTimeout(drainTimer);
    } catch (err) {
      failures.push({ route, error: String(err) });
    } finally {
      clearTimeout(timer);
      const elapsed = Date.now() - started;
      if (process.env.SMOKE_TEST_VERBOSE) {
        console.log(`[${n}/${staticGetRoutes.length}] ${route} (${elapsed}ms)`);
      }
    }
  }

  const queue = [...staticGetRoutes];
  async function worker() {
    while (queue.length > 0) {
      const route = queue.shift();
      if (route) await checkRoute(route);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log('Status code distribution:', statusCounts);

  if (failures.length > 0) {
    console.error(`\n${failures.length} route(s) failed to respond within ${TIMEOUT_MS}ms:`);
    for (const f of failures) {
      console.error(` - ${f.route}: ${f.error}`);
    }
    process.exit(1);
  }

  console.log('All static GET routes responded (no timeouts/connection failures).');
}

main();
