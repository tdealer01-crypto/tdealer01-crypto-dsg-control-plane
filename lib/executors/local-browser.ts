import { createHash } from 'node:crypto';
import { buildSafeManifest } from '@/lib/dsg/safe-dom/manifest';
import { verifySafeDomCommand } from '@/lib/dsg/safe-dom/verify-command';
import type { RawDomElement, SafeDomCommand } from '@/lib/dsg/safe-dom/types';
import { evaluateActionPolicy } from '@/lib/dsg/hermes-e2e/policy';
import type { ActionDescriptor, GateDecision, RiskLevel } from '@/lib/dsg/hermes-e2e/types';

/**
 * Local self-hosted browser executor.
 *
 * This is the self-hosted equivalent of the Browserbase adapter: it drives a
 * real Chromium via playwright-core instead of a paid cloud session. It is
 * gated behind the SAME safety layers as the rest of the Hermes pipeline:
 *
 *   1. evaluateActionPolicy   — credential/high-impact actions are blocked
 *   2. domain allowlist       — only explicitly allowed hosts may be opened
 *   3. HERMES_LOCAL_BROWSER_LIVE flag — live navigation is off by default
 *   4. Safe DOM manifest      — agent only sees filtered, exposed elements
 *   5. verifySafeDomCommand   — element/operation allow-list check
 *
 * Raw selectors are never returned to the caller; only selector hashes appear
 * in evidence.
 */

export type LocalBrowserMode = 'dry_run' | 'live';

export interface LocalBrowserCommandInput {
  url: string;
  frameId: string;
  command: SafeDomCommand;
  actionDescriptor: ActionDescriptor;
  /** Hosts the agent is permitted to open, e.g. ['example.com']. */
  allowedHosts?: string[];
  mode?: LocalBrowserMode;
  /** Capture a screenshot as evidence after the action (live mode only). */
  captureScreenshot?: boolean;
  /** Optional path to persist the evidence screenshot (live mode only). */
  screenshotPath?: string;
  /**
   * Accept untrusted TLS certs. Default false (secure). Only enable in trusted
   * environments behind a TLS-intercepting egress proxy whose CA the bundled
   * Chromium does not carry.
   */
  ignoreHttpsErrors?: boolean;
  timeoutMs?: number;
}

export interface LocalBrowserCompletion {
  ok: boolean;
  status: 'DRY_RUN_COMPLETED' | 'COMPLETED' | 'BLOCKED' | 'WAITING_APPROVAL';
  decision: GateDecision;
  risk: RiskLevel;
  reason: string;
  completedSafely: boolean;
  mode: LocalBrowserMode;
  trace: {
    url: string;
    hostAllowed: boolean;
    manifestElementCount: number;
    domMirrorHash: string;
    commandElementId: string;
    commandOperation: string;
    selectorHash?: string;
    pageTitle?: string;
    screenshotSha256?: string;
    touchedRealWebsite: boolean;
  };
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isHostAllowed(url: string, allowedHosts: string[]): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowedHosts.some((allowed) => {
    const a = allowed.toLowerCase().trim();
    return host === a || host.endsWith(`.${a}`);
  });
}

/**
 * Extracts interactive DOM elements as RawDomElement[]. Runs inside the page.
 * Returns stable nth-of-type selectors so the server can act on them without
 * exposing them to the agent.
 */
const EXTRACT_DOM_FN = `(() => {
  function cssPath(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let sel = node.nodeName.toLowerCase();
      if (node.parentNode) {
        const siblings = Array.from(node.parentNode.children).filter(
          (c) => c.nodeName === node.nodeName,
        );
        if (siblings.length > 1) {
          sel += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')';
        }
      }
      parts.unshift(sel);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }
  const roleFor = (el) => {
    const tag = el.nodeName.toLowerCase();
    if (tag === 'a') return 'link';
    if (tag === 'button') return 'button';
    if (tag === 'textarea') return 'textarea';
    if (tag === 'select') return 'select';
    if (tag === 'input') {
      const t = (el.getAttribute('type') || 'text').toLowerCase();
      if (t === 'checkbox') return 'checkbox';
      if (t === 'radio') return 'radio';
      return 'input';
    }
    return 'other';
  };
  const opsFor = (el) => {
    const tag = el.nodeName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return ['type'];
    return ['click'];
  };
  const nodes = Array.from(
    document.querySelectorAll('a, button, input, textarea, select, [role=button]'),
  );
  return nodes.slice(0, 200).map((el) => ({
    selector: cssPath(el),
    role: roleFor(el),
    text: (el.textContent || '').trim().slice(0, 120) || undefined,
    label:
      el.getAttribute('aria-label') ||
      el.getAttribute('name') ||
      el.getAttribute('placeholder') ||
      undefined,
    value: el.value || undefined,
    allowedOps: opsFor(el),
  }));
})()`;

export async function executeLocalBrowserSafeDomCommand(
  input: LocalBrowserCommandInput,
): Promise<LocalBrowserCompletion> {
  const mode: LocalBrowserMode = input.mode ?? 'dry_run';
  const allowedHosts = input.allowedHosts ?? [];
  const hostAllowed = isHostAllowed(input.url, allowedHosts);

  const baseTrace = {
    url: input.url,
    hostAllowed,
    manifestElementCount: 0,
    domMirrorHash: 'NOT_BUILT',
    commandElementId: input.command.elementId,
    commandOperation: input.command.operation,
    touchedRealWebsite: false,
  };

  // 1. Policy gate — same rules as the Browserbase path.
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

  // 2. Domain allowlist — never open a host the caller did not authorize.
  if (!hostAllowed) {
    return {
      ok: true,
      status: 'BLOCKED',
      decision: 'BLOCK',
      risk: 'HIGH',
      reason: 'HOST_NOT_IN_ALLOWLIST',
      completedSafely: true,
      mode,
      trace: baseTrace,
    };
  }

  // 3. Dry-run never launches a browser.
  if (mode === 'dry_run') {
    return {
      ok: true,
      status: 'DRY_RUN_COMPLETED',
      decision: 'ALLOW',
      risk: policy.risk,
      reason: 'DRY_RUN_HOST_ALLOWED_NO_BROWSER_LAUNCHED',
      completedSafely: true,
      mode,
      trace: baseTrace,
    };
  }

  // 4. Live mode is off unless explicitly enabled by environment.
  if (process.env.HERMES_LOCAL_BROWSER_LIVE !== 'true') {
    return {
      ok: true,
      status: 'BLOCKED',
      decision: 'BLOCK',
      risk: 'HIGH',
      reason: 'LIVE_EXECUTE_DISABLED_BY_DEFAULT_SET_HERMES_LOCAL_BROWSER_LIVE',
      completedSafely: true,
      mode,
      trace: baseTrace,
    };
  }

  // 5. Live execution against a real Chromium.
  const { chromium } = await import('playwright-core');
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: input.ignoreHttpsErrors === true,
    });
    const page = await context.newPage();
    await page.goto(input.url, {
      waitUntil: 'domcontentloaded',
      timeout: input.timeoutMs ?? 15_000,
    });

    const pageTitle = await page.title();
    const rawElements = (await page.evaluate(EXTRACT_DOM_FN)) as RawDomElement[];

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
          pageTitle,
        },
      };
    }

    const target = manifest.find((m) => m.id === input.command.elementId)!;
    const selector = target.internalSelector;

    if (input.command.operation === 'type') {
      await page.fill(selector, input.command.value ?? '');
    } else if (input.command.operation === 'click') {
      await page.click(selector, { timeout: input.timeoutMs ?? 15_000 });
    } else if (input.command.operation === 'press') {
      await page.press(selector, input.command.key ?? 'Enter');
    }

    let screenshotSha256: string | undefined;
    if (input.captureScreenshot || input.screenshotPath) {
      const buf = await page.screenshot({
        fullPage: false,
        ...(input.screenshotPath ? { path: input.screenshotPath } : {}),
      });
      screenshotSha256 = createHash('sha256').update(buf).digest('hex');
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
        url: input.url,
        hostAllowed: true,
        manifestElementCount: manifest.length,
        domMirrorHash,
        commandElementId: input.command.elementId,
        commandOperation: input.command.operation,
        selectorHash: target.selectorHash,
        pageTitle,
        screenshotSha256,
        touchedRealWebsite: true,
      },
    };
  } finally {
    await browser.close();
  }
}
