/**
 * Safe DOM Verify Command
 * Verifies agent commands against safe DOM manifest
 */

import type {
  SafeDomCommand,
  SafeElementManifest,
  SafeDomVerificationResult,
  SafeDomOperation,
} from './types';
import { isManifestExpired, findElementInManifest } from './manifest';

const VALID_OPERATIONS: SafeDomOperation[] = ['click', 'type', 'scroll', 'press'];

/**
 * Verify an agent command against the manifest
 */
export function verifySafeDomCommand(
  command: SafeDomCommand,
  manifest: SafeElementManifest[],
  frameId?: string
): SafeDomVerificationResult {
  // Check frame ID exists in manifest
  const frameExists = manifest.some((e) => e.frameId === command.frameId);
  if (!frameExists) {
    return {
      decision: 'BLOCK',
      reason: 'INVALID_COMMAND_FRAME',
      elementId: command.elementId,
      operation: command.operation,
    };
  }

  // Verify frame ID matches context if provided
  if (frameId && command.frameId !== frameId) {
    return {
      decision: 'BLOCK',
      reason: 'INVALID_COMMAND_FRAME',
      elementId: command.elementId,
      operation: command.operation,
    };
  }

  // Find element in manifest for this specific frame
  const element = manifest.find(
    (e) => e.id === command.elementId && e.frameId === command.frameId
  );
  if (!element) {
    return {
      decision: 'BLOCK',
      reason: 'ELEMENT_NOT_EXPOSED_TO_AGENT',
      elementId: command.elementId,
      operation: command.operation,
    };
  }

  // Verify operation is valid
  if (!VALID_OPERATIONS.includes(command.operation)) {
    return {
      decision: 'BLOCK',
      reason: `INVALID_OPERATION: ${command.operation}`,
      elementId: command.elementId,
      operation: command.operation,
    };
  }

  // Check if manifest is expired
  if (isManifestExpired(element.expiresAt)) {
    return {
      decision: 'BLOCK',
      reason: 'SAFE_VIEW_EXPIRED',
      elementId: command.elementId,
    };
  }

  // Verify operation is allowed
  if (!element.allowedOps.includes(command.operation)) {
    return {
      decision: 'BLOCK',
      reason: 'OP_NOT_ALLOWED_FOR_ELEMENT',
      elementId: command.elementId,
      operation: command.operation,
    };
  }

  // Special validation for 'type' operation
  if (command.operation === 'type') {
    if (element.role !== 'input' && element.role !== 'textarea') {
      return {
        decision: 'BLOCK',
        reason: 'OP_NOT_ALLOWED_FOR_ELEMENT: type only allowed on input/textarea',
        elementId: command.elementId,
        operation: 'type',
      };
    }
  }

  // Special validation for 'press' operation
  if (command.operation === 'press') {
    const validKeys = ['Enter', 'Escape', 'Tab', 'Backspace'];
    if (command.key && !validKeys.includes(command.key)) {
      return {
        decision: 'BLOCK',
        reason: `INVALID_KEY: ${command.key}`,
        elementId: command.elementId,
      };
    }
  }

  // Command is allowed
  return {
    decision: 'ALLOW',
    reason: 'VERIFIED',
    elementId: command.elementId,
    operation: command.operation,
    risk: element.risk,
  };
}

/**
 * Batch verify multiple commands
 */
export function verifySafeDomCommands(
  commands: SafeDomCommand[],
  manifest: SafeElementManifest[],
  frameId?: string
): SafeDomVerificationResult[] {
  return commands.map((cmd) => verifySafeDomCommand(cmd, manifest, frameId));
}

/**
 * Check if all commands are allowed
 */
export function areAllCommandsAllowed(
  commands: SafeDomCommand[],
  manifest: SafeElementManifest[],
  frameId?: string
): boolean {
  const results = verifySafeDomCommands(commands, manifest, frameId);
  return results.every((r) => r.decision === 'ALLOW');
}
