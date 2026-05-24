/**
 * Browser integration tests.
 * These tests require Playwright + Chromium. They are excluded from the default
 * `vitest run` config and only run when PLAYWRIGHT_INTEGRATION=1 is set.
 *
 * Prerequisites:
 *   npm run playwright:install
 *   PLAYWRIGHT_INTEGRATION=1 npx vitest run src/__tests__/browser.integration.test.ts
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { openBrowserSnapshot } from '../browser.js';

const INTEGRATION = process.env.PLAYWRIGHT_INTEGRATION === '1';

describe('openBrowserSnapshot – blocked origin (no Playwright needed)', () => {
  afterEach(() => {
    delete process.env.DSG_BROWSER_ALLOWED_ORIGINS;
    delete process.env.DSG_EVIDENCE_DIR;
  });

  it('throws immediately when the origin is not in DSG_BROWSER_ALLOWED_ORIGINS', async () => {
    process.env.DSG_BROWSER_ALLOWED_ORIGINS = 'https://allowed.example.com';
    await expect(
      openBrowserSnapshot({ url: 'https://evil.com/page' }),
    ).rejects.toThrow('Blocked origin:');
  });

  it('throws for a file:// URL even if no origins are configured', async () => {
    process.env.DSG_BROWSER_ALLOWED_ORIGINS = '';
    await expect(
      openBrowserSnapshot({ url: 'file:///etc/passwd' }),
    ).rejects.toThrow();
  });
});

describe.skipIf(!INTEGRATION)('openBrowserSnapshot – full Playwright integration', () => {
  let server: http.Server;
  let origin: string;
  let evidenceDir: string;

  beforeAll(async () => {
    evidenceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsg-evidence-'));
    await new Promise<void>((resolve) => {
      server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><head><title>Test Page</title></head><body>Hello</body></html>');
      });
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        origin = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    delete process.env.DSG_BROWSER_ALLOWED_ORIGINS;
    delete process.env.DSG_EVIDENCE_DIR;
  });

  it('returns a PASS gate result with evidence files on disk', async () => {
    process.env.DSG_BROWSER_ALLOWED_ORIGINS = origin;
    process.env.DSG_EVIDENCE_DIR = evidenceDir;

    const result = await openBrowserSnapshot({ url: `${origin}/`, note: 'test run' });

    expect(result.gate.status).toBe('PASS');
    expect(result.gate.risk).toBe('low');
    expect(result.title).toBe('Test Page');

    const screenshotExists = await fs.stat(result.screenshotPath).then(() => true).catch(() => false);
    expect(screenshotExists).toBe(true);

    const metadataRaw = await fs.readFile(result.metadataPath, 'utf8');
    const metadata = JSON.parse(metadataRaw);
    expect(metadata).toMatchObject({
      requestedUrl: `${origin}/`,
      title: 'Test Page',
      gate: { status: 'PASS' },
    });
    expect(typeof metadata.screenshotSha256).toBe('string');
    expect(metadata.screenshotSha256).toHaveLength(64);
  });

  it('evidence metadata screenshotSha256 matches the actual screenshot file', async () => {
    process.env.DSG_BROWSER_ALLOWED_ORIGINS = origin;
    process.env.DSG_EVIDENCE_DIR = evidenceDir;
    const { sha256 } = await import('../policy.js');

    const result = await openBrowserSnapshot({ url: `${origin}/` });
    const metadataRaw = await fs.readFile(result.metadataPath, 'utf8');
    const metadata = JSON.parse(metadataRaw);
    const screenshotBytes = await fs.readFile(result.screenshotPath);

    expect(metadata.screenshotSha256).toBe(sha256(screenshotBytes));
  });
});
