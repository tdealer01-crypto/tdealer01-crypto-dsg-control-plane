import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { executeAndroidSafeDomCommand } from '@/lib/executors/android-executor';

// Manual LIVE demo — requires:
//   1. HERMES_ANDROID_LIVE=true (environment flag)
//   2. RUN_LIVE_ANDROID_DEMO=1 (explicit user opt-in)
//   3. Appium server running (default localhost:4723)
//   4. Android emulator or real device with target app installed
// Command: RUN_LIVE_ANDROID_DEMO=1 HERMES_ANDROID_LIVE=true npx vitest run <file>
const RUN = process.env.RUN_LIVE_ANDROID_DEMO === '1' && process.env.HERMES_ANDROID_LIVE === 'true';

// Manifest ids are deterministic: sha256(frameId)[:8] + '-e{index:03d}'.
function elementId(frameId: string, index: number): string {
  const h = createHash('sha256').update(frameId).digest('hex').slice(0, 8);
  return `${h}-e${String(index).padStart(3, '0')}`;
}

describe.runIf(RUN)('LIVE: Appium drives a real Android app', () => {
  const appPackage = process.env.ANDROID_TEST_APP || 'com.android.settings';
  const allowedApps = [appPackage];

  it('executes click action on Settings app, captures evidence', async () => {
    const frameId = 'live-demo-settings';
    // Settings typically has a back button or other clickable element at index 0.
    const command = {
      frameId,
      elementId: elementId(frameId, 0),
      operation: 'click' as const,
    };

    const result = await executeAndroidSafeDomCommand({
      appPackage,
      frameId,
      command,
      allowedApps,
      mode: 'live',
      captureScreenshot: true,
      screenshotPath: '/tmp/live-android-evidence.png',
      actionDescriptor: {
        domain: 'android',
        operation: 'click',
        target: 'settings button',
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
    expect(result.trace.touchedRealDevice).toBe(true);
    expect(result.trace.manifestElementCount).toBeGreaterThan(0);
    expect(result.trace.selectorHash).toMatch(/^[a-f0-9]{16}$/);
    expect(result.trace.screenshotSha256).toMatch(/^[a-f0-9]{64}$/);
  }, 60_000);
});
