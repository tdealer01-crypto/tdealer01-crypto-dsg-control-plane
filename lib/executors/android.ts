import { createHash } from 'node:crypto';
import { evaluateActionPolicy } from '@/lib/dsg/hermes-e2e/policy';
import type { ActionDescriptor, GateDecision, RiskLevel } from '@/lib/dsg/hermes-e2e/types';
import type { BrowserbaseSafeExecutionMode } from '@/lib/dsg/hermes-e2e/types';

/**
 * Android Executor using Appium/WebDriverIO.
 *
 * Drives a real Android device/emulator via Appium, gated behind the SAME
 * safety layers as the rest of the Hermes pipeline:
 *
 *   1. evaluateActionPolicy   — credential/high-impact actions blocked
 *   2. App package allowlist  — only explicitly allowed apps may be interacted with
 *   3. HERMES_ANDROID_LIVE flag — live execution is off by default
 *   4. Accessibility tree extraction — agent only sees filtered, exposed elements
 *   5. Command verification     — element/operation allow-list check
 *
 * Raw selectors are never returned to the caller; only selector hashes appear
 * in evidence.
 */

export type AndroidMode = 'dry_run' | 'live';

export interface AndroidAppConfig {
  appPackage: string;
  allowedApps: string[];
}

export interface AndroidCommandInput {
  appConfig: AndroidAppConfig;
  frameId: string;
  command: AndroidSafeCommand;
  actionDescriptor: ActionDescriptor;
  mode?: AndroidMode;
  captureScreenshot?: boolean;
  screenshotPath?: string;
  timeoutMs?: number;
  appiumHost?: string;
  appiumPort?: number;
}

export interface AndroidSafeCommand {
  elementId: string;
  operation: 'click' | 'input_text' | 'get_text' | 'swipe' | 'long_click' | 'scroll';
  value?: string;
  key?: string;
  swipeDirection?: 'up' | 'down' | 'left' | 'right';
}

export interface AndroidRawElement {
  selector: string;          // Appium selector (resource-id, xpath, accessibility-id)
  role: string;              // button, input, text, image, etc.
  text?: string;             // visible text (truncated)
  label?: string;            // accessibility label
  value?: string;            // current value for inputs
  allowedOps: string[];      // operations allowed on this element
  bounds?: string;           // element bounds for swipe/scroll
  resourceId?: string;       // Android resource-id
  className?: string;        // Android class name
  contentDesc?: string;      // content-description
}

export interface AndroidSafeManifest {
  id: string;                // stable internal ID
  selectorHash: string;      // sha256 of selector
  role: string;
  allowedOps: string[];
  bounds?: string;
  resourceId?: string;
}

export interface AndroidCompletion {
  ok: boolean;
  status: 'DRY_RUN_COMPLETED' | 'COMPLETED' | 'BLOCKED' | 'WAITING_APPROVAL';
  decision: GateDecision;
  risk: RiskLevel;
  reason: string;
  completedSafely: boolean;
  mode: AndroidMode;
  executionMode: BrowserbaseSafeExecutionMode;
  trace: {
    appPackage: string;
    appAllowed: boolean;
    manifestElementCount: number;
    domMirrorHash: string;
    commandElementId: string;
    commandOperation: string;
    selectorHash?: string;
    screenTitle?: string;
    screenshotSha256?: string;
    touchedRealDevice: boolean;
  };
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isAppAllowed(appPackage: string, allowedApps: string[]): boolean {
  return allowedApps.some((allowed) => {
    const a = allowed.toLowerCase().trim();
    return appPackage.toLowerCase() === a;
  });
}

/**
 * Extracts interactive Android elements via Appium accessibility tree.
 * Returns stable selectors (resource-id, xpath) so the server can act on them
 * without exposing them to the agent.
 */
const EXTRACT_ANDROID_DOM_FN = `
(() => {
  function getElements(driver) {
    return driver.findElements('xpath', '//*[@clickable="true" or @focusable="true" or @long-clickable="true" or @text!=""]');
  }
})()
`;

async function getAppiumDriver(appiumHost: string, appiumPort: number, appPackage: string) {
  const { remote } = await import('webdriverio');
  return await remote({
    hostname: appiumHost,
    port: appiumPort,
    path: '/wd/hub',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:appPackage': appPackage,
      'appium:appActivity': `${appPackage}.MainActivity`,
      'appium:noReset': true,
      'appium:fullReset': false,
    },
  });
}

async function extractAndroidElements(driver: any): Promise<AndroidRawElement[]> {
  // Get all interactive elements using UiAutomator2
  const elements = await driver.$$('//*[@clickable="true" or @focusable="true" or @long-clickable="true" or @text!=""]');
  const results: AndroidRawElement[] = [];

  for (let i = 0; i < elements.length && i < 200; i++) {
    const el = elements[i];
    try {
      const resourceId = await el.getAttribute('resource-id');
      const className = await el.getAttribute('class');
      const text = await el.getText();
      const contentDesc = await el.getAttribute('content-desc');
      const clickable = await el.getAttribute('clickable');
      const focusable = await el.getAttribute('focusable');
      const longClickable = await el.getAttribute('long-clickable');
      const bounds = await el.getAttribute('bounds');

      const allowedOps: string[] = [];
      if (clickable === 'true') allowedOps.push('click');
      if (longClickable === 'true') allowedOps.push('long_click');
      if (focusable === 'true') allowedOps.push('input_text');
      allowedOps.push('get_text');
      allowedOps.push('scroll');

      const selector = resourceId
        ? `id=${resourceId}`
        : contentDesc
        ? `accessibility id=${contentDesc}`
        : `xpath=//*[@class="${className}"][${i + 1}]`;

      results.push({
        selector,
        role: className?.split('.').pop()?.toLowerCase() || 'view',
        text: text?.slice(0, 120),
        label: contentDesc || text?.slice(0, 120),
        value: await el.getAttribute('text'),
        allowedOps,
        bounds,
        resourceId,
        className,
        contentDesc,
      });
    } catch {
      // Skip elements we can't inspect
    }
  }

  return results;
}

function buildAndroidSafeManifest(rawElements: AndroidRawElement[], frameId: string): AndroidSafeManifest[] {
  return rawElements.map((el, index) => {
    const id = `${frameId}-el-${index}`;
    const selectorHash = sha256Hex(el.selector);
    return {
      id,
      selectorHash,
      role: el.role,
      allowedOps: el.allowedOps,
      bounds: el.bounds,
      resourceId: el.resourceId,
    };
  });
}

function verifyAndroidCommand(command: AndroidSafeCommand, manifest: AndroidSafeManifest[]): { decision: GateDecision; reason?: string } {
  const target = manifest.find((m) => m.id === command.elementId);
  if (!target) {
    return { decision: 'BLOCK', reason: 'ELEMENT_NOT_IN_MANIFEST' };
  }
  if (!target.allowedOps.includes(command.operation)) {
    return { decision: 'BLOCK', reason: 'OPERATION_NOT_ALLOWED_ON_ELEMENT' };
  }
  return { decision: 'ALLOW' };
}

export async function executeAndroidSafeCommand(input: AndroidCommandInput): Promise<AndroidCompletion> {
  const mode: AndroidMode = input.mode ?? 'dry_run';
  const appAllowed = isAppAllowed(input.appConfig.appPackage, input.appConfig.allowedApps);
  const appiumHost = input.appiumHost ?? process.env.APPIUM_HOST ?? 'localhost';
  const appiumPort = input.appiumPort ?? parseInt(process.env.APPIUM_PORT ?? '4723', 10);

  const baseTrace = {
    appPackage: input.appConfig.appPackage,
    appAllowed,
    manifestElementCount: 0,
    domMirrorHash: 'NOT_BUILT',
    commandElementId: input.command.elementId,
    commandOperation: input.command.operation,
    touchedRealDevice: false,
  };

  // 1. Policy gate — same rules as the browser path.
  const policy = evaluateActionPolicy(input.actionDescriptor);
  if (policy.decision !== 'ALLOW') {
    return {
      ok: true,
      status: policy.decision === 'REVIEW' || policy.decision === 'SAFE_ALTERNATIVE'
        ? 'WAITING_APPROVAL'
        : 'BLOCKED',
      decision: policy.decision,
      risk: policy.risk,
      reason: policy.reason,
      completedSafely: true,
      mode,
      trace: baseTrace,
    };
  }

  // 2. App allowlist — never interact with an app the caller did not authorize.
  if (!appAllowed) {
    return {
      ok: true,
      status: 'BLOCKED',
      decision: 'BLOCK',
      risk: 'HIGH',
      reason: 'APP_NOT_IN_ALLOWLIST',
      completedSafely: true,
      mode,
      trace: baseTrace,
    };
  }

  // 3. Dry-run never launches Appium.
  if (mode === 'dry_run') {
    return {
      ok: true,
      status: 'DRY_RUN_COMPLETED',
      decision: 'ALLOW',
      risk: policy.risk,
      reason: 'DRY_RUN_APP_ALLOWED_NO_APPIUM_LAUNCHED',
      completedSafely: true,
      mode,
      trace: baseTrace,
    };
  }

  // 4. Live mode is off unless explicitly enabled by environment.
  if (process.env.HERMES_ANDROID_LIVE !== 'true') {
    return {
      ok: true,
      status: 'BLOCKED',
      decision: 'BLOCK',
      risk: 'HIGH',
      reason: 'LIVE_EXECUTE_DISABLED_BY_DEFAULT_SET_HERMES_ANDROID_LIVE',
      completedSafely: true,
      mode,
      trace: baseTrace,
    };
  }

  // 5. Live execution against real Android device via Appium.
  let driver: any;
  try {
    driver = await getAppiumDriver(appiumHost, appiumPort, input.appConfig.appPackage);

    // Get current activity as screen title
    const currentActivity = await driver.getCurrentActivity();
    const screenTitle = currentActivity.split('.').pop() || 'UnknownActivity';

    // Extract Android elements (accessibility tree)
    const rawElements = await extractAndroidElements(driver);
    const manifest = buildAndroidSafeManifest(rawElements, input.frameId);

    const domMirrorHash = sha256Hex(
      JSON.stringify(manifest.map((m) => ({ id: m.id, selectorHash: m.selectorHash }))),
    );

    const gate = verifyAndroidCommand(input.command, manifest);
    if (gate.decision !== 'ALLOW') {
      return {
        ok: true,
        status: 'BLOCKED',
        decision: 'BLOCK',
        risk: 'LOW',
        reason: gate.reason ?? 'SAFE_ANDROID_BLOCKED',
        completedSafely: true,
        mode,
        trace: {
          ...baseTrace,
          manifestElementCount: manifest.length,
          domMirrorHash,
          screenTitle,
        },
      };
    }

    const target = manifest.find((m) => m.id === input.command.elementId)!;
    const rawElement = rawElements.find((el) => sha256Hex(el.selector) === target.selectorHash);

    if (!rawElement) {
      return {
        ok: true,
        status: 'BLOCKED',
        decision: 'BLOCK',
        risk: 'LOW',
        reason: 'TARGET_ELEMENT_NOT_FOUND',
        completedSafely: true,
        mode,
        trace: {
          ...baseTrace,
          manifestElementCount: manifest.length,
          domMirrorHash,
          screenTitle,
        },
      };
    }

    // Execute the command
    const el = await driver.$(rawElement.selector);

    if (input.command.operation === 'click') {
      await el.click();
    } else if (input.command.operation === 'input_text') {
      await el.setValue(input.command.value ?? '');
    } else if (input.command.operation === 'long_click') {
      await el.longClick({ duration: 1000 });
    } else if (input.command.operation === 'swipe') {
      const direction = input.command.swipeDirection ?? 'up';
      const bounds = rawElement.bounds ? JSON.parse(rawElement.bounds.replace(/[\[\]]/g, '').replace(' ', ',')) : null;
      if (bounds) {
        const centerX = (bounds[0] + bounds[2]) / 2;
        const centerY = (bounds[1] + bounds[3]) / 2;
        const distance = 300;
        let endX = centerX, endY = centerY;
        if (direction === 'up') endY -= distance;
        else if (direction === 'down') endY += distance;
        else if (direction === 'left') endX -= distance;
        else if (direction === 'right') endX += distance;
        await driver.touchPerform([
          { action: 'press', options: { x: centerX, y: centerY } },
          { action: 'wait', options: { ms: 100 } },
          { action: 'moveTo', options: { x: endX, y: endY } },
          { action: 'release' },
        ]);
      }
    } else if (input.command.operation === 'scroll') {
      await driver.execute('mobile: scroll', { direction: 'down' });
    } else if (input.command.operation === 'get_text') {
      // get_text is handled by reading the element text
    }

    // Capture screenshot for evidence
    let screenshotSha256: string | undefined;
    if (input.captureScreenshot || input.screenshotPath) {
      const buf = await driver.takeScreenshot();
      const buffer = Buffer.from(buf, 'base64');
      screenshotSha256 = createHash('sha256').update(buffer).digest('hex');
      if (input.screenshotPath) {
        await driver.saveScreenshot(input.screenshotPath);
      }
    }

    return {
      ok: true,
      status: 'COMPLETED',
      decision: 'ALLOW',
      risk: policy.risk,
      reason: 'LIVE_ANDROID_COMMAND_EXECUTED',
      completedSafely: true,
      mode,
      trace: {
        appPackage: input.appConfig.appPackage,
        appAllowed: true,
        manifestElementCount: manifest.length,
        domMirrorHash,
        commandElementId: input.command.elementId,
        commandOperation: input.command.operation,
        selectorHash: target.selectorHash,
        screenTitle,
        screenshotSha256,
        touchedRealDevice: true,
      },
    };
  } finally {
    if (driver) {
      await driver.deleteSession();
    }
  }
}