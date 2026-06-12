import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { executeLocalBrowserSafeDomCommand } from '@/lib/executors/local-browser';

// Manual LIVE demo — touches a real external website (example.com, an
// IANA-reserved domain for testing). Guarded so it never runs in CI:
//   RUN_LIVE_BROWSER_DEMO=1 HERMES_LOCAL_BROWSER_LIVE=true npx vitest run <file>
const RUN = process.env.RUN_LIVE_BROWSER_DEMO === '1';

// Manifest ids are deterministic: sha256(frameId)[:8] + '-e{index:03d}'.
function elementId(frameId: string, index: number): string {
  const h = createHash('sha256').update(frameId).digest('hex').slice(0, 8);
  return `${h}-e${String(index).padStart(3, '0')}`;
}

describe.runIf(RUN)('LIVE: self-hosted browser drives a real external website', () => {
  it('opens example.com, extracts real DOM, clicks the real link, captures evidence', async () => {
    const frameId = 'live-demo-example';
    // example.com has exactly one interactive element: the "More information..."
    // link at index 0.
    const command = {
      frameId,
      elementId: elementId(frameId, 0),
      operation: 'click' as const,
    };

    const result = await executeLocalBrowserSafeDomCommand({
      url: 'https://example.com/',
      frameId,
      command,
      allowedHosts: ['example.com'],
      mode: 'live',
      captureScreenshot: true,
      screenshotPath: '/tmp/live-browser-evidence.png',
      // This sandbox routes egress through a TLS-intercepting proxy whose CA
      // the bundled Chromium does not carry; accept it for this demo only.
      ignoreHttpsErrors: true,
      actionDescriptor: {
        domain: 'browser',
        operation: 'click',
        target: 'More information link',
        dataSensitivity: 'public',
        externalEffect: false,
        reversibility: 'reversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
    });

    // eslint-disable-next-line no-console
    console.log('LIVE RESULT:', JSON.stringify(result, null, 2));

    expect(result.status).toBe('COMPLETED');
    expect(result.decision).toBe('ALLOW');
    expect(result.trace.touchedRealWebsite).toBe(true);
    expect(result.trace.pageTitle).toBe('Example Domain');
    expect(result.trace.manifestElementCount).toBeGreaterThan(0);
    expect(result.trace.selectorHash).toMatch(/^[a-f0-9]{16}$/);
    expect(result.trace.screenshotSha256).toMatch(/^[a-f0-9]{64}$/);
  }, 60_000);
});
