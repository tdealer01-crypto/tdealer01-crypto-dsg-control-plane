import { sha256Json } from './hash';

const REDIRECT_STATUS = new Set([302, 303, 307, 308]);
const PROTECTED_REJECT_STATUS = new Set([401, 403, 302, 303, 307, 308]);

export type ProbeRoute = { path: string; kind: 'public' | 'protected' | 'admin' };

export type AuthRbacProofInput = {
  previewUrl?: string;
  routes: ProbeRoute[];
  authRequired?: boolean;
  rbacRequired?: boolean;
  oauthFlow?: 'none' | 'manual_only';
  hasTestIdentity?: boolean;
  signals?: { fakeCookie?: boolean; fakeRoleHeader?: boolean; callerBooleans?: boolean };
};

export type RouteProbeResult = {
  path: string;
  kind: ProbeRoute['kind'];
  status: number;
  location?: string;
  ok: boolean;
};

export type AuthRbacProofOutput = {
  status: 'PASS' | 'BLOCK' | 'FAILED' | 'MANUAL_REQUIRED';
  routesChecked: RouteProbeResult[];
  summary: string;
  hardFailures: string[];
  proofHash: string;
};

function normalizeUrl(base: string, path: string): string {
  const target = new URL(path.startsWith('/') ? path : `/${path}`, base);
  return target.toString();
}

function isRejected(status: number): boolean {
  return PROTECTED_REJECT_STATUS.has(status);
}

async function probeRoute(previewUrl: string, route: ProbeRoute): Promise<RouteProbeResult> {
  const res = await fetch(normalizeUrl(previewUrl, route.path), { method: 'GET', redirect: 'manual' });
  const status = res.status;
  const location = REDIRECT_STATUS.has(status) ? res.headers.get('location') ?? undefined : undefined;
  const ok = route.kind === 'public' ? status >= 200 && status < 400 : isRejected(status);
  return { path: route.path, kind: route.kind, status, location, ok };
}

export async function runAuthRbacProof(input: AuthRbacProofInput): Promise<AuthRbacProofOutput> {
  const hardFailures: string[] = [];
  if (!input.previewUrl) hardFailures.push('MISSING_PREVIEW_URL');
  if (input.signals?.fakeCookie) hardFailures.push('FAKE_COOKIE_SIGNAL');
  if (input.signals?.fakeRoleHeader) hardFailures.push('FAKE_ROLE_HEADER_SIGNAL');
  if (input.signals?.callerBooleans) hardFailures.push('CALLER_BOOLEAN_SIGNAL_IGNORED');

  const protectedRoutes = input.routes.filter((r) => r.kind === 'protected');
  const adminRoutes = input.routes.filter((r) => r.kind === 'admin');

  if (input.authRequired && protectedRoutes.length === 0) hardFailures.push('AUTH_REQUIRED_WITHOUT_PROTECTED_ROUTES');
  if (input.rbacRequired && adminRoutes.length === 0) hardFailures.push('RBAC_REQUIRED_WITHOUT_ADMIN_ROUTES');

  if (input.oauthFlow === 'manual_only' && !input.hasTestIdentity) {
    const payload = { status: 'MANUAL_REQUIRED' as const, routesChecked: [], summary: 'OAuth flow requires manual verification', hardFailures };
    return { ...payload, proofHash: sha256Json(payload) };
  }

  if (hardFailures.length > 0 || !input.previewUrl) {
    const payload = { status: 'BLOCK' as const, routesChecked: [], summary: 'Fail-closed: configuration or spoofing signals detected', hardFailures };
    return { ...payload, proofHash: sha256Json(payload) };
  }

  const routesChecked: RouteProbeResult[] = [];
  for (const route of input.routes) routesChecked.push(await probeRoute(input.previewUrl, route));

  const failed = routesChecked.filter((r) => !r.ok);
  if (failed.some((r) => r.kind === 'protected' && r.status >= 200 && r.status < 300)) {
    hardFailures.push('PROTECTED_ROUTE_ACCESSIBLE_ANONYMOUS');
  }
  if (failed.some((r) => r.kind === 'admin' && r.status >= 200 && r.status < 300)) {
    hardFailures.push('ADMIN_ROUTE_ACCESSIBLE_NON_ADMIN');
  }

  const status: AuthRbacProofOutput['status'] = hardFailures.length > 0 ? 'FAILED' : 'PASS';
  const payload = {
    status,
    routesChecked,
    summary: hardFailures.length > 0 ? 'Auth/RBAC probe found policy violations' : 'Auth/RBAC probe passed',
    hardFailures,
  };
  return { ...payload, proofHash: sha256Json(payload) };
}
