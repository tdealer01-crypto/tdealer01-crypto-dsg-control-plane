#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

export type AndroidRunnerMode = 'dry_run' | 'live';
export type AndroidRunnerOperation = 'click' | 'type' | 'press';

export interface AndroidRunnerJob {
  jobId: string;
  appPackage: string;
  operation: AndroidRunnerOperation;
  selector?: string;
  value?: string;
  keyCode?: number;
  allowedApps: string[];
  captureScreenshot?: boolean;
  screenshotPath?: string;
  timeoutMs?: number;
}

export interface AndroidRunnerEvidence {
  ok: boolean;
  jobId: string;
  status: 'DRY_RUN_COMPLETED' | 'COMPLETED' | 'BLOCKED';
  reason: string;
  mode: AndroidRunnerMode;
  appPackage: string;
  appAllowed: boolean;
  touchedRealDevice: boolean;
  operation: AndroidRunnerOperation;
  selectorHash?: string;
  screenshotSha256?: string;
  evidenceHash: string;
}

function sha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function isAppAllowed(appPackage: string, allowedApps: string[]): boolean {
  const normalized = appPackage.toLowerCase().trim();
  return allowedApps.some((allowed) => {
    const candidate = allowed.toLowerCase().trim();
    return normalized === candidate || normalized.startsWith(`${candidate}.`);
  });
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readJob(): Promise<AndroidRunnerJob> {
  const jobFile = readArg('--job');
  if (jobFile) {
    return JSON.parse(await readFile(jobFile, 'utf8')) as AndroidRunnerJob;
  }

  const appPackage = readArg('--app') ?? process.env.ANDROID_APP_PACKAGE;
  const operation = (readArg('--operation') ?? 'click') as AndroidRunnerOperation;
  const selector = readArg('--selector') ?? process.env.ANDROID_SELECTOR;
  const value = readArg('--value') ?? process.env.ANDROID_VALUE;
  const allowedApps = (process.env.ANDROID_ALLOWED_APPS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!appPackage) {
    throw new Error('ANDROID_APP_PACKAGE_REQUIRED');
  }

  return {
    jobId: readArg('--job-id') ?? `local-${Date.now()}`,
    appPackage,
    operation,
    selector,
    value,
    allowedApps,
    captureScreenshot: process.env.ANDROID_CAPTURE_SCREENSHOT === 'true',
    screenshotPath: process.env.ANDROID_SCREENSHOT_PATH,
    timeoutMs: Number(process.env.ANDROID_TIMEOUT_MS ?? 15_000),
  };
}

function buildEvidence(input: Omit<AndroidRunnerEvidence, 'evidenceHash'>): AndroidRunnerEvidence {
  return {
    ...input,
    evidenceHash: sha256Hex(JSON.stringify({ ...input, version: 'dsg-android-runner-evidence-v1' })),
  };
}

async function execute(job: AndroidRunnerJob): Promise<AndroidRunnerEvidence> {
  const mode: AndroidRunnerMode = process.env.HERMES_ANDROID_LIVE === 'true' ? 'live' : 'dry_run';
  const appAllowed = isAppAllowed(job.appPackage, job.allowedApps);
  const selectorHash = job.selector ? sha256Hex(job.selector) : undefined;

  if (!appAllowed) {
    return buildEvidence({
      ok: true,
      jobId: job.jobId,
      status: 'BLOCKED',
      reason: 'APP_NOT_IN_ALLOWLIST',
      mode,
      appPackage: job.appPackage,
      appAllowed,
      touchedRealDevice: false,
      operation: job.operation,
      selectorHash,
    });
  }

  if (mode === 'dry_run') {
    return buildEvidence({
      ok: true,
      jobId: job.jobId,
      status: 'DRY_RUN_COMPLETED',
      reason: 'DRY_RUN_NO_APPIUM_LAUNCHED_SET_HERMES_ANDROID_LIVE_TRUE_TO_EXECUTE',
      mode,
      appPackage: job.appPackage,
      appAllowed,
      touchedRealDevice: false,
      operation: job.operation,
      selectorHash,
    });
  }

  if (!job.selector && job.operation !== 'press') {
    return buildEvidence({
      ok: true,
      jobId: job.jobId,
      status: 'BLOCKED',
      reason: 'SELECTOR_REQUIRED_FOR_LIVE_CLICK_OR_TYPE',
      mode,
      appPackage: job.appPackage,
      appAllowed,
      touchedRealDevice: false,
      operation: job.operation,
      selectorHash,
    });
  }

  const { remote } = await import('webdriverio');
  const client = await remote({
    protocol: 'http',
    hostname: process.env.APPIUM_HOST ?? '127.0.0.1',
    port: Number(process.env.APPIUM_PORT ?? 4723),
    path: process.env.APPIUM_PATH ?? '/wd/hub',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': process.env.APPIUM_AUTOMATION_NAME ?? 'UiAutomator2',
      'appium:appPackage': job.appPackage,
      'appium:appActivity': process.env.APPIUM_APP_ACTIVITY ?? '.MainActivity',
      'appium:noReset': true,
    },
    connectionRetryCount: 1,
    connectionRetryTimeout: job.timeoutMs ?? 15_000,
  });

  try {
    if (job.operation === 'press') {
      await client.pressKeyCode(job.keyCode ?? 66);
    } else if (job.operation === 'type') {
      const element = await client.$(job.selector!);
      await element.setValue(job.value ?? '');
    } else {
      const element = await client.$(job.selector!);
      await element.click();
    }

    let screenshotSha256: string | undefined;
    if (job.captureScreenshot || job.screenshotPath) {
      const base64 = await client.takeScreenshot();
      const buffer = Buffer.from(base64, 'base64');
      screenshotSha256 = sha256Hex(buffer);
      if (job.screenshotPath) {
        await writeFile(job.screenshotPath, buffer);
      }
    }

    return buildEvidence({
      ok: true,
      jobId: job.jobId,
      status: 'COMPLETED',
      reason: 'LIVE_ANDROID_ACTION_EXECUTED_BY_SELF_HOSTED_RUNNER',
      mode,
      appPackage: job.appPackage,
      appAllowed,
      touchedRealDevice: true,
      operation: job.operation,
      selectorHash,
      screenshotSha256,
    });
  } finally {
    await client.deleteSession();
  }
}

async function main(): Promise<void> {
  try {
    const job = await readJob();
    const evidence = await execute(job);
    console.log(JSON.stringify(evidence, null, 2));
    process.exit(evidence.status === 'BLOCKED' ? 2 : 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    console.error(JSON.stringify({ ok: false, status: 'BLOCKED', reason: message }, null, 2));
    process.exit(1);
  }
}

void main();
