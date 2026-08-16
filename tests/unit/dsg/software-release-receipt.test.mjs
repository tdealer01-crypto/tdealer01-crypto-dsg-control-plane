import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HEX64 = 'a'.repeat(64);
const SOFTWARE_HASH = `sha256:${'b'.repeat(64)}`;

function runReceipt(dir, readinessBody = { ready: true, checks: { api: true } }) {
  writeFileSync(path.join(dir, 'health.json'), JSON.stringify({ ok: true, status: 'healthy' }));
  writeFileSync(path.join(dir, 'readiness.json'), JSON.stringify(readinessBody));
  execFileSync(process.execPath, ['scripts/create-software-release-receipt.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      COMMIT_SHA: 'abcdef1234567890',
      DEPLOY_URL: 'https://example.vercel.app',
      SOFTWARE_EVIDENCE_HASH: SOFTWARE_HASH,
      DSG_PROOF_HASH: HEX64,
      DSG_RELEASE_DIR: dir,
    },
    stdio: 'pipe',
  });
  return JSON.parse(readFileSync(path.join(dir, 'release-receipt.json'), 'utf8'));
}

describe('software release receipt', () => {
  it('is deterministic for the same bound evidence', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'dsg-release-'));
    const first = runReceipt(dir);
    const second = runReceipt(dir);
    expect(first.receiptHash).toBe(second.receiptHash);
    expect(first.observedPostconditions.readiness).toBe(true);
    expect(first.dsgProofHash).toBe(HEX64);
  });

  it('changes when observed readiness evidence changes', () => {
    const firstDir = mkdtempSync(path.join(tmpdir(), 'dsg-release-a-'));
    const secondDir = mkdtempSync(path.join(tmpdir(), 'dsg-release-b-'));
    const first = runReceipt(firstDir, { ready: true, checks: { api: true } });
    const second = runReceipt(secondDir, { ready: true, checks: { api: true, db: true } });
    expect(first.observedPostconditions.readinessHash).not.toBe(second.observedPostconditions.readinessHash);
    expect(first.receiptHash).not.toBe(second.receiptHash);
  });
});
