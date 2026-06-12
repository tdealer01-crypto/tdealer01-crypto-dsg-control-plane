import { executeBrowserbaseAction } from '@/lib/executors/browserbase';
import { verifySafeDomCommand } from '@/lib/dsg/safe-dom/verify-command';
import { buildHermesDomMirror } from './dom-mirror';
import { evaluateActionPolicy } from './policy';
import type { BrowserbaseSafeCommandInput, BrowserbaseSafeCompletion } from './types';

export async function executeBrowserbaseSafeDomCommand(
  input: BrowserbaseSafeCommandInput,
): Promise<BrowserbaseSafeCompletion> {
  const executionMode = input.executionMode ?? 'dry_run';

  const policy = evaluateActionPolicy(input.actionDescriptor);

  if (policy.decision !== 'ALLOW') {
    return {
      ok: true,
      status: policy.decision === 'REVIEW' ? 'WAITING_APPROVAL' : 'BLOCKED',
      decision: policy.decision,
      risk: policy.risk,
      reason: policy.reason,
      completedSafely: true,
      executionMode,
      trace: {
        romContextHash: input.rom.contextHash,
        domMirrorHash: 'NOT_BUILT_POLICY_BLOCKED_FIRST',
        manifestElementCount: 0,
        commandElementId: input.command.elementId,
        commandOperation: input.command.operation,
        browserbaseTouchedRealWebsite: false,
      },
    };
  }

  const mirror = buildHermesDomMirror({
    frameId: input.frameId,
    rawElements: input.rawElements,
    romContextHash: input.rom.contextHash,
  });

  const domGate = verifySafeDomCommand(input.command, mirror.manifest);

  if (domGate.decision !== 'ALLOW') {
    return {
      ok: true,
      status: 'BLOCKED',
      decision: 'BLOCK',
      risk: 'LOW',
      reason: domGate.reason,
      completedSafely: true,
      executionMode,
      trace: {
        romContextHash: input.rom.contextHash,
        domMirrorHash: mirror.mirrorHash,
        manifestElementCount: mirror.manifest.length,
        commandElementId: input.command.elementId,
        commandOperation: input.command.operation,
        browserbaseTouchedRealWebsite: false,
      },
    };
  }

  const selector = domGate.selector;

  if (executionMode === 'dry_run') {
    return {
      ok: true,
      status: 'DRY_RUN_COMPLETED',
      decision: 'ALLOW',
      risk: policy.risk,
      reason: 'DRY_RUN_SAFE_DOM_COMMAND_VERIFIED_NO_REAL_WEBSITE_TOUCHED',
      completedSafely: true,
      executionMode,
      trace: {
        romContextHash: input.rom.contextHash,
        domMirrorHash: mirror.mirrorHash,
        manifestElementCount: mirror.manifest.length,
        commandElementId: input.command.elementId,
        commandOperation: input.command.operation,
        selector,
        browserbaseTouchedRealWebsite: false,
      },
    };
  }

  if (executionMode === 'create_session_only') {
    const browserbase = await executeBrowserbaseAction({
      effectId: input.effectId,
      orgId: input.orgId,
      agentId: input.agentId,
      action: input.action,
      payload: {
        mode: 'SAFE_DOM_CREATE_SESSION_ONLY',
        sessionId: input.sessionId,
        frameId: input.frameId,
        elementId: input.command.elementId,
        operation: input.command.operation,
        selectorHashOnly: true,
      },
    } as any);

    return {
      ok: true,
      status: 'COMPLETED',
      decision: 'ALLOW',
      risk: policy.risk,
      reason: 'BROWSERBASE_SESSION_CREATED_NO_NAVIGATION_NO_REAL_WEBSITE_TOUCHED',
      completedSafely: true,
      executionMode,
      trace: {
        romContextHash: input.rom.contextHash,
        domMirrorHash: mirror.mirrorHash,
        manifestElementCount: mirror.manifest.length,
        commandElementId: input.command.elementId,
        commandOperation: input.command.operation,
        selector,
        browserbaseSessionId: browserbase.externalId,
        browserbaseTouchedRealWebsite: false,
      },
    };
  }

  return {
    ok: true,
    status: 'BLOCKED',
    decision: 'BLOCK',
    risk: 'HIGH',
    reason: 'LIVE_EXECUTE_DISABLED_BY_DEFAULT',
    completedSafely: true,
    executionMode,
    trace: {
      romContextHash: input.rom.contextHash,
      domMirrorHash: mirror.mirrorHash,
      manifestElementCount: mirror.manifest.length,
      commandElementId: input.command.elementId,
      commandOperation: input.command.operation,
      selector,
      browserbaseTouchedRealWebsite: false,
    },
  };
}
