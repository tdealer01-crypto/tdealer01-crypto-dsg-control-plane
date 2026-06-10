/**
 * Safe DOM Verification for Spine Execution
 *
 * This module provides Safe DOM intent verification before gate checks.
 * It validates that commands only target elements explicitly exposed in the manifest.
 */

import { getSupabaseAdmin } from '../supabase-server';
import type { SpineIntentPayload } from './types';

/**
 * Safe DOM element manifest entry
 */
export type SafeElementManifest = {
  element_id: string; // Format: xxx-e001, xxx-e002, etc
  selector: string; // CSS selector for the element
  tag_name: string; // HTML tag (button, input, etc)
  visible: boolean; // Whether element is currently visible
  frame_id?: string; // Frame ID if in iframe
  created_at: string;
  expires_at: string; // TTL for manifest (5 min default)
};

/**
 * Safe DOM command in spine intent
 */
export type SafeDomCommand = {
  frameId: string;
  elementId: string;
  action: string; // click, type, clear, etc
  value?: string | number | boolean;
};

/**
 * Verification result
 */
export type SafeDomVerificationResult = {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  elementId?: string;
  elementSelector?: string;
};

/**
 * Verify Safe DOM command against manifest
 *
 * Validates that the command targets an element that exists in the manifest
 * and that the action is safe for that element type.
 */
export async function verifySafeDomIntentOrPass(
  payload: SpineIntentPayload,
  sessionId: string
): Promise<SafeDomVerificationResult | null> {
  // Check if payload contains Safe DOM command
  const safeDomCmd = extractSafeDomCommand(payload);
  if (!safeDomCmd) {
    // No Safe DOM command, pass through (legacy rawCommand or normal action)
    return null;
  }

  // Query manifest from database
  const manifest = await getSafeDomManifest(sessionId, safeDomCmd.frameId);
  if (!manifest || manifest.length === 0) {
    return {
      decision: 'BLOCK',
      reason: `No Safe DOM manifest found for session ${sessionId} frame ${safeDomCmd.frameId}`,
      elementId: safeDomCmd.elementId,
    };
  }

  // Verify element exists in manifest
  const element = manifest.find((e) => e.element_id === safeDomCmd.elementId);
  if (!element) {
    return {
      decision: 'BLOCK',
      reason: `Element ${safeDomCmd.elementId} not found in manifest. Only exposed elements are allowed.`,
      elementId: safeDomCmd.elementId,
    };
  }

  // Check element is not expired
  const expiresAt = new Date(element.expires_at);
  if (expiresAt < new Date()) {
    return {
      decision: 'BLOCK',
      reason: `Element ${safeDomCmd.elementId} manifest entry expired at ${element.expires_at}`,
      elementId: safeDomCmd.elementId,
    };
  }

  // Check element is visible
  if (!element.visible) {
    return {
      decision: 'REVIEW',
      reason: `Element ${safeDomCmd.elementId} is not currently visible. Manual review may be needed.`,
      elementId: safeDomCmd.elementId,
      elementSelector: element.selector,
    };
  }

  // Validate action is safe for element type
  const actionValidation = validateActionForElement(safeDomCmd.action, element.tag_name);
  if (!actionValidation.safe) {
    return {
      decision: 'BLOCK',
      reason: `Action "${safeDomCmd.action}" is not safe for ${element.tag_name} elements. ${actionValidation.reason}`,
      elementId: safeDomCmd.elementId,
      elementSelector: element.selector,
    };
  }

  // All checks passed
  return {
    decision: 'ALLOW',
    reason: `Safe DOM element ${safeDomCmd.elementId} verified and allowed for action ${safeDomCmd.action}`,
    elementId: safeDomCmd.elementId,
    elementSelector: element.selector,
  };
}

/**
 * Extract Safe DOM command from spine intent payload
 */
function extractSafeDomCommand(payload: SpineIntentPayload): SafeDomCommand | null {
  // Check if intent has safeDomCommand field
  const input = payload.input || {};

  if (
    input.safeDomCommand &&
    typeof input.safeDomCommand === 'object' &&
    !Array.isArray(input.safeDomCommand)
  ) {
    const cmd = input.safeDomCommand as Record<string, unknown>;
    if (cmd.frameId && cmd.elementId && cmd.action) {
      return {
        frameId: String(cmd.frameId),
        elementId: String(cmd.elementId),
        action: String(cmd.action),
        value: cmd.value,
      };
    }
  }

  return null;
}

/**
 * Query Safe DOM manifest from database
 */
async function getSafeDomManifest(
  sessionId: string,
  frameId: string
): Promise<SafeElementManifest[]> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('safe_dom_manifests')
      .select('*')
      .eq('session_id', sessionId)
      .eq('frame_id', frameId)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error(`Safe DOM manifest query error: ${error.message}`);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      element_id: String(row.element_id || ''),
      selector: String(row.selector || ''),
      tag_name: String(row.tag_name || ''),
      visible: Boolean(row.visible),
      frame_id: String(row.frame_id || ''),
      created_at: String(row.created_at || ''),
      expires_at: String(row.expires_at || ''),
    }));
  } catch (err) {
    console.error('Safe DOM manifest fetch failed:', err);
    return [];
  }
}

/**
 * Validate action is safe for element type
 */
function validateActionForElement(
  action: string,
  tagName: string
): { safe: boolean; reason?: string } {
  const normalizedAction = action.toLowerCase().trim();
  const normalizedTag = tagName.toLowerCase().trim();

  // Safe actions by element type
  const actionMap: Record<string, Set<string>> = {
    button: new Set(['click', 'focus', 'blur']),
    input: new Set(['click', 'type', 'clear', 'focus', 'blur', 'change']),
    textarea: new Set(['click', 'type', 'clear', 'focus', 'blur', 'change']),
    select: new Set(['click', 'change', 'focus', 'blur']),
    a: new Set(['click', 'focus', 'blur']),
    form: new Set(['submit', 'reset', 'focus', 'blur']),
    checkbox: new Set(['click', 'change', 'focus', 'blur']),
    radio: new Set(['click', 'change', 'focus', 'blur']),
  };

  const allowedActions = actionMap[normalizedTag];
  if (!allowedActions) {
    return {
      safe: false,
      reason: `No safe actions defined for ${tagName} elements`,
    };
  }

  if (!allowedActions.has(normalizedAction)) {
    return {
      safe: false,
      reason: `Action "${normalizedAction}" not allowed for ${tagName}. Allowed: ${Array.from(allowedActions).join(', ')}`,
    };
  }

  return { safe: true };
}
