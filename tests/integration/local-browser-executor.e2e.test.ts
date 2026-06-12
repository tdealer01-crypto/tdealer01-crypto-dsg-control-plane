import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import { buildSafeManifest } from '@/lib/dsg/safe-dom/manifest';
import type { RawDomElement, SafeDomCommand } from '@/lib/dsg/safe-dom/types';
import { executeLocalBrowserSafeDomCommand } from '@/lib/executors/local-browser';

// Serve a real HTML page locally so the browser drives a real DOM without
// ever touching an external website.
const TEST_PAGE = `<!doctype html>
<html><head><title>Local Test Form</title></head>
<body>
  <h1>Contact</h1>
  <form id="contact">
    <input id="name" name="name" placeholder="Name" />
    <textarea id="message" name="message" placeholder="Message"></textarea>
    <button id="next-step" type="button">Next</button>
  </form>
</body></html>`;

// The "live" test needs a downloaded Chromium (npx playwright-core install
// chromium). CI unit jobs do not install browsers, so skip it there instead of
// failing on browserType.launch.
function chromiumInstalled(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require('playwright-core') as typeof import('playwright-core');
    return fs.existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

describe('Local self-hosted browser executor (real Chromium, local page)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(TEST_PAGE);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}/`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const allowedHosts = ['127.0.0.1'];

  function manifestElementId(frameId: string, raw: RawDomElement[], text: string): string {
    const { manifest } = buildSafeManifest(raw, frameId, { filterDangerousElements: true });
    const el = manifest.find((m) => m.text === text || m.label === text);
    if (!el) throw new Error(`element ${text} not in manifest`);
    return el.id;
  }

  it('dry_run: host allowed, no browser launched, does not touch website', async () => {
    const command: SafeDomCommand = { frameId: 'f1', elementId: 'unknown', operation: 'click' };
    const result = await executeLocalBrowserSafeDomCommand({
      url: baseUrl,
      frameId: 'f1',
      command,
      allowedHosts,
      mode: 'dry_run',
      actionDescriptor: {
        domain: 'browser',
        operation: 'click',
        target: 'Next',
        dataSensitivity: 'internal',
        externalEffect: true,
        reversibility: 'reversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
    });

    expect(result.status).toBe('DRY_RUN_COMPLETED');
    expect(result.decision).toBe('ALLOW');
    expect(result.trace.touchedRealWebsite).toBe(false);
  });

  it('blocks a host that is not in the allowlist', async () => {
    const result = await executeLocalBrowserSafeDomCommand({
      url: 'http://evil.example.com/',
      frameId: 'f1',
      command: { frameId: 'f1', elementId: 'x', operation: 'click' },
      allowedHosts,
      mode: 'live',
      actionDescriptor: {
        domain: 'browser',
        operation: 'click',
        target: 'anything',
        dataSensitivity: 'internal',
        externalEffect: true,
        reversibility: 'reversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
    });

    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toBe('HOST_NOT_IN_ALLOWLIST');
    expect(result.trace.touchedRealWebsite).toBe(false);
  });

  it('blocks live mode when env flag is not set', async () => {
    const prev = process.env.HERMES_LOCAL_BROWSER_LIVE;
    delete process.env.HERMES_LOCAL_BROWSER_LIVE;

    const result = await executeLocalBrowserSafeDomCommand({
      url: baseUrl,
      frameId: 'f1',
      command: { frameId: 'f1', elementId: 'x', operation: 'click' },
      allowedHosts,
      mode: 'live',
      actionDescriptor: {
        domain: 'browser',
        operation: 'click',
        target: 'Next',
        dataSensitivity: 'internal',
        externalEffect: true,
        reversibility: 'reversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
    });

    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toContain('LIVE_EXECUTE_DISABLED_BY_DEFAULT');
    if (prev) process.env.HERMES_LOCAL_BROWSER_LIVE = prev;
  });

  it('blocks a credential action before launching the browser', async () => {
    process.env.HERMES_LOCAL_BROWSER_LIVE = 'true';
    const result = await executeLocalBrowserSafeDomCommand({
      url: baseUrl,
      frameId: 'f1',
      command: { frameId: 'f1', elementId: 'x', operation: 'type' },
      allowedHosts,
      mode: 'live',
      actionDescriptor: {
        domain: 'form',
        operation: 'submit',
        target: 'API Key',
        dataSensitivity: 'credential',
        externalEffect: true,
        reversibility: 'irreversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: false,
      },
    });

    expect(result.status).toBe('BLOCKED');
    expect(result.decision).toBe('BLOCK');
    expect(result.risk).toBe('CRITICAL');
    expect(result.reason).toBe('CREDENTIAL_OR_SECRET_BLOCKED');
    expect(result.trace.touchedRealWebsite).toBe(false);
    delete process.env.HERMES_LOCAL_BROWSER_LIVE;
  });

  it.skipIf(!chromiumInstalled())('live: drives a real Chromium, types into a real DOM input, captures evidence', async () => {
    process.env.HERMES_LOCAL_BROWSER_LIVE = 'true';

    const rawElements: RawDomElement[] = [
      { selector: '#name', role: 'input', label: 'name', allowedOps: ['type'] },
      { selector: '#message', role: 'textarea', label: 'message', allowedOps: ['type'] },
      { selector: '#next-step', role: 'button', text: 'Next', allowedOps: ['click'] },
    ];
    // The id the server-side manifest will assign to the #name input.
    const nameId = manifestElementId('f1', rawElements, 'name');

    const result = await executeLocalBrowserSafeDomCommand({
      url: baseUrl,
      frameId: 'f1',
      command: { frameId: 'f1', elementId: nameId, operation: 'type', value: 'Ada Lovelace' },
      allowedHosts,
      mode: 'live',
      captureScreenshot: true,
      actionDescriptor: {
        domain: 'form',
        operation: 'fill',
        target: 'name field',
        dataSensitivity: 'internal',
        externalEffect: false,
        reversibility: 'reversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.decision).toBe('ALLOW');
    expect(result.trace.touchedRealWebsite).toBe(true);
    expect(result.trace.pageTitle).toBe('Local Test Form');
    expect(result.trace.manifestElementCount).toBeGreaterThan(0);
    expect(result.trace.selectorHash).toMatch(/^[a-f0-9]{16}$/);
    expect(result.trace.screenshotSha256).toMatch(/^[a-f0-9]{64}$/);

    delete process.env.HERMES_LOCAL_BROWSER_LIVE;
  }, 60_000);
});
