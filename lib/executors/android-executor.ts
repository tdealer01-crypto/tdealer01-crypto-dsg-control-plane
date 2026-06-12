import { createHash } from 'node:crypto';
import { buildSafeManifest } from '@/lib/dsg/safe-dom/manifest';
import { verifySafeDomCommand } from '@/lib/dsg/safe-dom/verify-command';
import type { RawDomElement, SafeDomCommand } from '@/lib/dsg/safe-dom/types';
import { evaluateActionPolicy } from '@/lib/dsg/hermes-e2e/policy';
import type { ActionDescriptor, GateDecision, RiskLevel } from '@/lib/dsg/hermes-e2e/types';

/**
 * Android app executor (Appium-driven).
 *
 * Drives real Android apps via Appium WebDriver instead of browser automation.
 * Reuses all safety layers from the browser executor:
 *
 *   1. evaluateActionPolicy   — credential/high-impact actions blocked
 *   2. app allowlist          — only explicitly allowed apps may be opened
 *   3. HERMES_ANDROID_LIVE flag — live execution off by default
 *   4. Safe DOM manifest      — agent only sees filtered accessibility elements
 *   5. verifySafeDomCommand   — element/operation allow-list check
 *
 * Raw selectors never returned to caller; only selector hashes appear in evidence.
 */

export type AndroidExecutorMode = 'dry_run' | 'live';

export interface AndroidExecutorCommandInput {
  appPackage: string;
  frameId: string;
  command: SafeDomCommand;
  actionDescriptor: ActionDescriptor;
  /** Apps the agent is permitted to open, e.g. ['com.example.app']. */
  allowedApps?: string[];
  mode?: AndroidExecutorMode;
  /** Capture a screenshot as evidence after the action (live mode only). */
  captureScreenshot?: boolean;
  /** Optional path to persist the evidence screenshot (live mode only). */
  screenshotPath?: string;
  timeoutMs?: number;
}

export interface AndroidExecutorCompletion {
  ok: boolean;
  status: 'DRY_RUN_COMPLETED' | 'COMPLETED' | 'BLOCKED' | 'WAITING_APPROVAL';
  decision: GateDecision;
  risk: RiskLevel;
  reason: string;
  completedSafely: boolean;
  mode: AndroidExecutorMode;
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
  const normalized = appPackage.toLowerCase().trim();
  return allowedApps.some((allowed) => {
    const a = allowed.toLowerCase().trim();
    return normalized === a || normalized.startsWith(`${a}.`);
  });
}

/**
 * Extracts interactive accessibility elements from Android app.
 * Returns stable accessibility IDs so the server can act on them without
 * exposing them to the agent.
 */
const EXTRACT_ACCESSIBILITY_TREE_FN = `
(() => {
  const AccessibilityNodeInfo = Java.type('android.view.accessibility.AccessibilityNodeInfo');
  const role = (node) => {
    if (!node) return 'other';
    const className = node.getClassName().toString();
    if (className.includes('Button')) return 'button';
    if (className.includes('EditText')) return 'input';
    if (className.includes('TextView')) return 'text';
    if (className.includes('CheckBox')) return 'checkbox';
    if (className.includes('RadioButton')) return 'radio';
    if (className.includes('Spinner')) return 'select';
    return 'other';
  };
  const opsFor = (node) => {
    const className = node.getClassName().toString();
    if (className.includes('EditText')) return ['type'];
    if (className.includes('CheckBox') || className.includes('RadioButton'))
      return ['click'];
    return ['click'];
  };
  const walk = (node, depth, result) => {
    if (!node || depth > 10 || result.length >= 200) return;
    try {
      const text = node.getText() ? node.getText().toString() : '';
      const contentDesc = node.getContentDescription()
        ? node.getContentDescription().toString()
        : '';
      const resourceId = node.getViewIdResourceName()
        ? node.getViewIdResourceName().toString()
        : '';
      if (text || contentDesc || resourceId) {
        result.push({
          selector: resourceId || contentDesc || text.slice(0, 20),
          role: role(node),
          text: text.slice(0, 120) || undefined,
          label: contentDesc || undefined,
          allowedOps: opsFor(node),
        });
      }
      for (let i = 0; i < node.getChildCount(); i++) {
        walk(node.getChild(i), depth + 1, result);
      }
    } catch (e) {
      // ignore errors in tree walk
    }
  };
  const root = arguments[arguments.length - 1];
  const result = [];
  walk(root, 0, result);
  return result;
})()
`;

export async function executeAndroidSafeDomCommand(
  input: AndroidExecutorCommandInput,
): Promise<AndroidExecutorCompletion> {
  const mode: AndroidExecutorMode = input.mode ?? 'dry_run';
  const allowedApps = input.allowedApps ?? [];
  const appAllowed = isAppAllowed(input.appPackage, allowedApps);

  const baseTrace = {
    appPackage: input.appPackage,
    appAllowed,
    manifestElementCount: 0,
    domMirrorHash: 'NOT_BUILT',
    commandElementId: input.command.elementId,
    commandOperation: input.command.operation,
    touchedRealDevice: false,
  };

  // 1. Policy gate — same rules as browser/mobile paths.
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

  // 2. App allowlist — never open an app the caller did not authorize.
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

  // 3. Dry-run never launches Appium/device.
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

  // 5. Live execution against a real Android device via Appium.
  try {
    const { remote } = await import('webdriverio');

    const client = await remote({
      protocol: 'http',
      hostname: process.env.APPIUM_HOST || 'localhost',
      port: parseInt(process.env.APPIUM_PORT || '4723', 10),
      path: '/wd/hub',
      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:appPackage': input.appPackage,
        'appium:appActivity': process.env.APPIUM_APP_ACTIVITY || '.MainActivity',
        'appium:noReset': true,
      },
      connectionRetryCount: 3,
      connectionRetryTimeout: input.timeoutMs ?? 15_000,
    });

    try {
      // Wait for app to be ready
      await client.pause(1000);

      // Extract accessibility tree
      const rawElements = (await client.execute(EXTRACT_ACCESSIBILITY_TREE_FN)) as RawDomElement[];

      const { manifest } = buildSafeManifest(rawElements, input.frameId, {
        ttlSeconds: 60,
        filterDangerousElements: true,
      });

      const domMirrorHash = sha256Hex(
        JSON.stringify(manifest.map((m) => ({ id: m.id, selectorHash: m.selectorHash }))),
      );

      const gate = verifySafeDomCommand(input.command, manifest);
      if (gate.decision !== 'ALLOW') {
        return {
          ok: true,
          status: 'BLOCKED',
          decision: 'BLOCK',
          risk: 'LOW',
          reason: gate.reason ?? 'SAFE_DOM_BLOCKED',
          completedSafely: true,
          mode,
          trace: {
            ...baseTrace,
            manifestElementCount: manifest.length,
            domMirrorHash,
          },
        };
      }

      const target = manifest.find((m) => m.id === input.command.elementId)!;
      const selector = target.internalSelector;

      // Android keycode mapping for common keys
      const keyCodeMap: Record<string, number> = {
        'KEYCODE_ENTER': 66,
        'KEYCODE_BACK': 4,
        'KEYCODE_HOME': 3,
        'KEYCODE_MENU': 82,
      };

      // Execute action on device
      if (input.command.operation === 'type') {
        const element = await client.$(selector);
        await element.setValue(input.command.value ?? '');
      } else if (input.command.operation === 'click') {
        const element = await client.$(selector);
        await element.click();
      } else if (input.command.operation === 'press') {
        const keyName = input.command.key ?? 'KEYCODE_ENTER';
        const keyCode = keyCodeMap[keyName] ?? 66;
        await client.pressKeyCode(keyCode);
      }

      let screenshotSha256: string | undefined;
      let screenTitle: string | undefined;
      if (input.captureScreenshot || input.screenshotPath) {
        const buf = await client.takeScreenshot();
        const screenshotBuffer = Buffer.from(buf, 'base64');
        if (input.screenshotPath) {
          const fs = await import('node:fs/promises');
          await fs.writeFile(input.screenshotPath, screenshotBuffer);
        }
        screenshotSha256 = createHash('sha256').update(screenshotBuffer).digest('hex');
      }

      // Try to get current screen title
      try {
        const currentActivity = await client.getCurrentActivity();
        screenTitle = currentActivity;
      } catch {
        screenTitle = 'Unknown';
      }

      return {
        ok: true,
        status: 'COMPLETED',
        decision: 'ALLOW',
        risk: policy.risk,
        reason: 'LIVE_SAFE_DOM_COMMAND_EXECUTED',
        completedSafely: true,
        mode,
        trace: {
          appPackage: input.appPackage,
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
      await client.deleteSession();
    }
  } catch (error) {
    return {
      ok: false,
      status: 'BLOCKED',
      decision: 'BLOCK',
      risk: 'HIGH',
      reason: `APPIUM_ERROR: ${error instanceof Error ? error.message : 'unknown'}`,
      completedSafely: false,
      mode,
      trace: baseTrace,
    };
  }
}
