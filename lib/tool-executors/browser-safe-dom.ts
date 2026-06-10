/**
 * Browser Safe DOM Executor
 *
 * Routes browser/DOM manipulation steps through safe DOM verification.
 * Only allows interactions with elements in the manifest.
 */

import { createHash } from 'crypto';
import type { AgentWorkStep } from '../delegation/types';
import type { SafeElementManifest } from '../spine/verify-safe-dom-intent';
import { verifySafeDomIntentOrPass } from '../spine/verify-safe-dom-intent';
import { executeVerifiedCommand, type SafeDomCommand } from '../executors/browserbase-safe-dom-integration';
import { blockedResult, pendingResult, successResult, type ToolExecutionResult } from './types';

/**
 * Safe DOM context from delegation.
 */
export interface BrowserExecutionContext {
  sessionId: string;
  frameId?: string;
  manifest?: SafeElementManifest;
  orgId: string;
}

/**
 * Execute a browser step through safe DOM verification.
 *
 * Validates that the element is in the manifest before allowing execution.
 * Captures manifest hash and screenshot ID as evidence.
 */
export async function executeBrowserStep(
  step: AgentWorkStep,
  context: {
    delegation: any;
    manifest?: SafeElementManifest;
    sessionId?: string;
    orgId?: string;
  },
): Promise<ToolExecutionResult> {
  // Validate we have required context
  const sessionId = context.sessionId || step.target;
  if (!sessionId) {
    return blockedResult('Browser execution requires sessionId in step target or context');
  }

  const orgId = context.orgId || context.delegation?.orgId;
  if (!orgId) {
    return blockedResult('Browser execution requires orgId in context or delegation');
  }

  // Extract element ID and action from step
  const elementId = step.target;
  const action = step.action.toLowerCase();

  if (!elementId) {
    return blockedResult('Browser step requires target element ID');
  }

  // Validate action against delegation scope
  if (context.delegation?.blockedActions?.includes(`browser.${action}`)) {
    return blockedResult(`Action "browser.${action}" is blocked by delegation contract`);
  }

  // If action requires confirmation per delegation
  if (context.delegation?.requiresUserConfirm?.includes(`browser.${action}`)) {
    const manifestHash = context.manifest ? hashManifest(context.manifest) : 'no-manifest';
    return pendingResult(
      `Browser action "${action}" requires user confirmation per delegation`,
      [`manifest:${manifestHash}`, `element:${elementId}`],
      'CONFIRM_BROWSER_ACTION',
      `/browser/session/${sessionId}/element/${elementId}?action=${action}`
    );
  }

  // Build safe DOM command
  let safeDomAction: 'click' | 'type' | 'submit' | 'navigate' = 'click';
  if (action === 'type') safeDomAction = 'type';
  else if (action === 'submit') safeDomAction = 'submit';
  else if (action === 'navigate') safeDomAction = 'navigate';

  const safeDomCommand: SafeDomCommand = {
    frameId: context.manifest?.frame_id || 'main',
    elementId,
    action: safeDomAction,
    value: step.action.includes('type') ? step.target : undefined,
  };

  // Verify against manifest
  const verification = await verifySafeDomIntentOrPass(
    { input: { safeDomCommand } } as any,
    sessionId
  );

  if (verification && verification.decision !== 'ALLOW') {
    return blockedResult(verification.reason || 'Safe DOM verification failed', [
      `verification:${verification.decision}`,
      `element:${elementId}`,
    ]);
  }

  // Execute verified command through Browserbase
  try {
    const result = await executeVerifiedCommand(sessionId, safeDomCommand);

    const manifestHash = context.manifest ? hashManifest(context.manifest) : 'command-executed';
    const screenshotId = (result as Record<string, unknown>).screenshotId as string || `ss-${Date.now()}`;

    return successResult(
      `Browser action "${action}" executed on element "${elementId}"`,
      [
        `manifest:${manifestHash}`,
        `element:${elementId}`,
        `screenshot:${screenshotId}`,
      ]
    );
  } catch (err) {
    return blockedResult(`Browser execution failed: ${String(err).slice(0, 100)}`);
  }
}

/**
 * Hash a manifest for audit evidence.
 */
function hashManifest(manifest: SafeElementManifest): string {
  const data = JSON.stringify(manifest);
  return createHash('sha256').update(data).digest('hex').slice(0, 12);
}
