import { createHash } from 'node:crypto';

export type BrowserSessionProof = {
  providerId: string;
  sessionId: string;
  jobId: string;
  startUrl: string;
  navigationLogRef: string;
  screenshotRefs: string[];
  takeoverCheckpoints: string[];
};

export type BrowserSessionResult = {
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

export function evaluateBrowserSessionProof(proof?: Partial<BrowserSessionProof>): BrowserSessionResult {
  const missing: string[] = [];
  if (!proof?.providerId) missing.push('providerId');
  if (!proof?.sessionId) missing.push('sessionId');
  if (!proof?.jobId) missing.push('jobId');
  if (!isHttps(proof?.startUrl)) missing.push('startUrl_https');
  if (!proof?.navigationLogRef) missing.push('navigationLogRef');
  if (!proof?.screenshotRefs?.length) missing.push('screenshotRefs');
  if (!proof?.takeoverCheckpoints?.length) missing.push('takeoverCheckpoints');

  const ok = missing.length === 0;
  return {
    ok,
    status: ok ? 'PASS' : 'PROOF_REQUIRED',
    missing,
    proofHash: hash({ proof, missing, ok }),
    nextAction: ok ? 'Attach browser session proof to the job timeline.' : 'Connect a real browser provider and capture screenshots/navigation/takeover proof.',
  };
}
