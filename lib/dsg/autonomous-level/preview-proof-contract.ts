import { createHash } from 'node:crypto';

export type PreviewRouteProof = {
  path: string;
  status: number;
  bodyHash?: string;
  screenshotRef?: string;
};

export type PreviewDeploymentProof = {
  jobId: string;
  deploymentUrl: string;
  providerStatus: 'READY' | 'ERROR' | 'CANCELED';
  routes: PreviewRouteProof[];
};

export type PreviewProofResult = {
  ok: boolean;
  status: 'PASS' | 'PROOF_REQUIRED' | 'BLOCKED';
  missing: string[];
  proofHash: string;
  nextAction: string;
};

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isHttps(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function evaluatePreviewDeploymentProof(proof?: Partial<PreviewDeploymentProof>): PreviewProofResult {
  const missing: string[] = [];
  if (!proof?.jobId) missing.push('jobId');
  if (!isHttps(proof?.deploymentUrl)) missing.push('deploymentUrl_https');
  if (proof?.providerStatus !== 'READY') missing.push('providerStatus_READY');
  if (!proof?.routes?.length) missing.push('routes');

  for (const route of proof?.routes ?? []) {
    if (!route.path?.startsWith('/')) missing.push('route_path');
    if (route.status < 200 || route.status >= 400) missing.push(`route_${route.path}_status_${route.status}`);
    if (!route.bodyHash && !route.screenshotRef) missing.push(`route_${route.path}_bodyHash_or_screenshotRef`);
  }

  const ok = missing.length === 0;
  return {
    ok,
    status: ok ? 'PASS' : 'PROOF_REQUIRED',
    missing,
    proofHash: hash({ proof, missing, ok }),
    nextAction: ok ? 'Preview proof can support deployable claim promotion.' : 'Collect preview URL, route status, and body/screenshot proof.',
  };
}
