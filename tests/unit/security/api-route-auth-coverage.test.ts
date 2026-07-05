import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..', '..');
const API_ROOT = join(REPO_ROOT, 'app', 'api');

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
const MUTATION_METHODS: Method[] = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Broad, deliberately generous heuristic: matches any of the common ways this
 * repo gates a route (session/user checks, Bearer/API-key resolution, cron
 * secrets, internal service tokens, webhook signature verification, admin/
 * service-role usage, custom "require*"/"resolve*Actor" helpers, etc). A
 * false negative here means a route needs a human look, not that it's broken.
 */
const AUTH_HEURISTIC =
  /auth|bearer|verify|require|resolve.*actor|session|permission|access|signature|token|api.?key|role|secret|cron_secret|internal_service/i;

/**
 * Routes confirmed (by reading the source) to be intentionally open with no
 * per-request identity check, and why. Anything with a mutation method that
 * is NOT here and NOT matched by AUTH_HEURISTIC fails the test below.
 */
const ALLOWLIST_INTENTIONALLY_PUBLIC: Record<string, string> = {
  '/api': 'catch-all 404 stub for unmatched API paths; no logic to protect',
  '/api/gateway/webhook/inbox':
    'echo-only test/debug endpoint — returns the request back, no DB write, no side effect',
  '/api/demo/bootstrap': 'disabled scaffold, always returns 410 Gone',
  '/api/finance-governance/server-store/submit': 'deprecated stub, always returns a blocked response',
  '/api/finance-governance/server-store/reset': 'deprecated stub, always returns a blocked response',
  '/api/finance-governance/server-store/approvals/[id]/escalate':
    'deprecated stub, always returns a blocked response',
  '/api/finance-governance/server-store/approvals/[id]/approve':
    'deprecated stub, always returns a blocked response',
  '/api/finance-governance/server-store/approvals/[id]/reject':
    'deprecated stub, always returns a blocked response',
  '/api/dsg/context-graph/build': 'pure computation over caller-supplied input, no DB/fs access',
  '/api/dsg/evaluate': 'stateless deterministic-gate demo evaluator, no DB access',
  '/api/dsg/flow-studio/mcp':
    'sandboxed to a hardcoded https host allowlist (wikipedia.org only), no DB access',
  '/api/dsg/midmarket-governance-autopilot/production-runtime':
    'pure computation over caller-supplied input, no DB access',
  '/api/playground/evaluate': 'stateless deterministic-gate playground demo, no DB access',
  '/api/stripe-app/gate/summary': 'scaffold — always returns hardcoded zero counts, not wired to storage',
  '/api/nvidia/stream':
    'public AI chat proxy demo (mirrors /api/try/chat); no DB write, cost/rate-limit-abuse risk only, not a data leak',
};

/**
 * KNOWN GAPS — confirmed to have no identity/auth check by reading the
 * source, kept OUT of the "intentionally public" allowlist on purpose. These
 * need a product/architecture decision, not a silent pass. Do not add new
 * entries here without discussing with the team; prefer fixing the route.
 *
 * Previously flagged here (now fixed, kept for history):
 * - /api/stripe-app/gateway/evaluate, /api/stripe-app/gate/evaluate — now
 *   gated with requireInternalService() before touching stripe_operation_audits.
 * - /api/gateway/plan-check — now gated with requireOrgPermission('org.execute'),
 *   and identity is taken only from the verified access context (empty
 *   Headers() passed to normalizeGatewayToolRequest so spoofed headers can't
 *   leak through), matching the sibling /api/gateway/tools/execute route.
 * - /api/dsg/app-builder/jobs (+ [jobId]/plan, [jobId]/approval,
 *   [jobId]/runtime-handoff) — getDevSmokeAppBuilderContext() renamed to
 *   getAppBuilderContext() and now requires a verified requireInternalService()
 *   Bearer token before trusting workspaceId/actorId.
 */
const KNOWN_GAPS_PENDING_DECISION = new Set<string>([]);

function findRouteFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      findRouteFiles(full, acc);
    } else if (entry === 'route.ts') {
      acc.push(full);
    }
  }
  return acc;
}

function routeMethods(source: string): Method[] {
  const found = new Set<Method>();
  for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as Method[]) {
    if (new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(source)) {
      found.add(m);
    }
  }
  return [...found];
}

function toRoutePath(filePath: string): string {
  const rel = relative(join(REPO_ROOT, 'app'), filePath).replace(/\/route\.ts$/, '');
  return '/' + rel;
}

describe('API route auth coverage (static scan)', () => {
  const routeFiles = findRouteFiles(API_ROOT);
  expect(routeFiles.length).toBeGreaterThan(100); // sanity check the scan itself found real routes

  for (const filePath of routeFiles) {
    const route = toRoutePath(filePath);
    if (KNOWN_GAPS_PENDING_DECISION.has(route)) {
      // Deliberately skipped — see comment above. Not silently green.
      continue;
    }

    const source = readFileSync(filePath, 'utf8');
    const methods = routeMethods(source);
    const hasMutation = methods.some((m) => MUTATION_METHODS.includes(m));
    if (!hasMutation) continue;

    it(`${route} (${methods.join(',')}) has an auth-like check or is allowlisted as intentionally public`, () => {
      const allowlisted = route in ALLOWLIST_INTENTIONALLY_PUBLIC;
      const hasAuthPattern = AUTH_HEURISTIC.test(source);
      expect(
        allowlisted || hasAuthPattern,
        `${route} exports a mutation method (${methods.join(',')}) with no detected auth pattern ` +
          `and is not in ALLOWLIST_INTENTIONALLY_PUBLIC. If this is genuinely public, add it to the ` +
          `allowlist with a one-line justification; otherwise add an auth check.`,
      ).toBe(true);
    });
  }

  it('does not let KNOWN_GAPS_PENDING_DECISION silently grow without review', () => {
    // Bumping this number means someone added a new known gap — that's a
    // real security decision and should get eyes on it in review, not just
    // pass quietly.
    expect(KNOWN_GAPS_PENDING_DECISION.size).toBe(0);
  });
});
