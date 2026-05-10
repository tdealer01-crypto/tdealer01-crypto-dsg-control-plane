import { createHash } from 'node:crypto';

export type BrowserCaptureRequest = {
  url: string;
  includeDom: boolean;
  includeNetwork: boolean;
  includeConsole: boolean;
  includeScreenshot: boolean;
  maxDomChars: number;
  redactionEnabled: boolean;
  containsSensitiveAccountData?: boolean;
};

export type BrowserPrivacyGuardResult = {
  ok: boolean;
  status: 'PASS' | 'BLOCKED';
  blockedReasons: string[];
  proofHash: string;
  nextAction: string;
};

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function httpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function evaluateBrowserPrivacyGuard(request: BrowserCaptureRequest): BrowserPrivacyGuardResult {
  const blockedReasons: string[] = [];

  if (!httpsUrl(request.url)) blockedReasons.push('URL_MUST_BE_HTTPS');
  if (request.containsSensitiveAccountData && !request.redactionEnabled) blockedReasons.push('SENSITIVE_DATA_REQUIRES_REDACTION');
  if (request.includeDom && request.maxDomChars > 50000) blockedReasons.push('DOM_CAPTURE_TOO_LARGE');
  if (!request.includeScreenshot && !request.includeDom && !request.includeConsole && !request.includeNetwork) blockedReasons.push('NO_CAPTURE_MODE_SELECTED');
  if ((request.includeDom || request.includeNetwork) && !request.redactionEnabled) blockedReasons.push('DOM_OR_NETWORK_CAPTURE_REQUIRES_REDACTION');

  const ok = blockedReasons.length === 0;
  return {
    ok,
    status: ok ? 'PASS' : 'BLOCKED',
    blockedReasons,
    proofHash: hash({ request, blockedReasons, ok }),
    nextAction: ok
      ? 'Browser capture request is safe to execute within declared limits.'
      : 'Reduce capture scope, enable redaction, or switch to manual screenshot evidence.',
  };
}
