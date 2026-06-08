import type { SafeDomCommand, SafeDomVerifyResult, SafeElementManifest } from './types';

function getCommandElementId(command: SafeDomCommand): string {
  return command.elementId;
}

export function verifySafeDomCommand(
  command: SafeDomCommand,
  manifest: SafeElementManifest[],
  now: Date = new Date(),
): SafeDomVerifyResult {
  const element = manifest.find(
    (item) => item.frameId === command.frameId && item.elementId === getCommandElementId(command),
  );

  if (!element) {
    const frameExists = manifest.some((item) => item.frameId === command.frameId);
    return {
      decision: 'BLOCK',
      reason: frameExists ? 'ELEMENT_NOT_EXPOSED_TO_AGENT' : 'INVALID_COMMAND_FRAME',
    };
  }

  if (new Date(element.expiresAt).getTime() < now.getTime()) {
    return { decision: 'BLOCK', reason: 'SAFE_VIEW_EXPIRED' };
  }

  if (!element.allowedOps.includes(command.op)) {
    return { decision: 'BLOCK', reason: 'OP_NOT_ALLOWED_FOR_ELEMENT' };
  }

  return { decision: 'ALLOW', element };
}
