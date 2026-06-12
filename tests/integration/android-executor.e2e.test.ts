import { describe, expect, it } from 'vitest';
import { executeAndroidSafeDomCommand } from '@/lib/executors/android-executor';
import type { SafeDomCommand } from '@/lib/dsg/safe-dom/types';

describe('Android executor (Appium-driven)', () => {
  const testAppPackage = 'com.example.testapp';
  const allowedApps = [testAppPackage, 'com.android.settings'];

  it('dry_run: app allowed, no Appium launched, does not touch device', async () => {
    const command: SafeDomCommand = { frameId: 'android-1', elementId: 'unknown', operation: 'click' };
    const result = await executeAndroidSafeDomCommand({
      appPackage: testAppPackage,
      frameId: 'android-1',
      command,
      allowedApps,
      mode: 'dry_run',
      actionDescriptor: {
        domain: 'android',
        operation: 'click',
        target: 'button',
        dataSensitivity: 'public',
        externalEffect: false,
        reversibility: 'reversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
    });

    expect(result.status).toBe('DRY_RUN_COMPLETED');
    expect(result.decision).toBe('ALLOW');
    expect(result.trace.touchedRealDevice).toBe(false);
    expect(result.mode).toBe('dry_run');
  });

  it('blocks an app that is not in the allowlist', async () => {
    const result = await executeAndroidSafeDomCommand({
      appPackage: 'com.malicious.app',
      frameId: 'android-1',
      command: { frameId: 'android-1', elementId: 'x', operation: 'click' },
      allowedApps,
      mode: 'live',
      actionDescriptor: {
        domain: 'android',
        operation: 'click',
        target: 'button',
        dataSensitivity: 'public',
        externalEffect: false,
        reversibility: 'reversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
    });

    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toBe('APP_NOT_IN_ALLOWLIST');
    expect(result.trace.touchedRealDevice).toBe(false);
  });

  it('blocks live mode when HERMES_ANDROID_LIVE env flag is not set', async () => {
    const prev = process.env.HERMES_ANDROID_LIVE;
    delete process.env.HERMES_ANDROID_LIVE;

    const result = await executeAndroidSafeDomCommand({
      appPackage: testAppPackage,
      frameId: 'android-1',
      command: { frameId: 'android-1', elementId: 'x', operation: 'click' },
      allowedApps,
      mode: 'live',
      actionDescriptor: {
        domain: 'android',
        operation: 'click',
        target: 'button',
        dataSensitivity: 'public',
        externalEffect: false,
        reversibility: 'reversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
    });

    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toContain('LIVE_EXECUTE_DISABLED_BY_DEFAULT');
    if (prev) process.env.HERMES_ANDROID_LIVE = prev;
  });

  it('blocks a credential action before launching Appium', async () => {
    process.env.HERMES_ANDROID_LIVE = 'true';

    const result = await executeAndroidSafeDomCommand({
      appPackage: testAppPackage,
      frameId: 'android-1',
      command: { frameId: 'android-1', elementId: 'x', operation: 'type', value: 'secret' },
      allowedApps,
      mode: 'live',
      actionDescriptor: {
        domain: 'android',
        operation: 'type',
        target: 'API Key input',
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
    expect(result.trace.touchedRealDevice).toBe(false);
    delete process.env.HERMES_ANDROID_LIVE;
  });

  it('returns proper trace structure with expected fields', async () => {
    const result = await executeAndroidSafeDomCommand({
      appPackage: testAppPackage,
      frameId: 'android-1',
      command: { frameId: 'android-1', elementId: 'elem-001', operation: 'click' },
      allowedApps,
      mode: 'dry_run',
      actionDescriptor: {
        domain: 'android',
        operation: 'click',
        target: 'button',
        dataSensitivity: 'public',
        externalEffect: false,
        reversibility: 'reversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
    });

    expect(result.trace).toHaveProperty('appPackage', testAppPackage);
    expect(result.trace).toHaveProperty('appAllowed', true);
    expect(result.trace).toHaveProperty('manifestElementCount');
    expect(result.trace).toHaveProperty('domMirrorHash');
    expect(result.trace).toHaveProperty('commandElementId', 'elem-001');
    expect(result.trace).toHaveProperty('commandOperation', 'click');
    expect(result.trace).toHaveProperty('touchedRealDevice', false);
  });
});
