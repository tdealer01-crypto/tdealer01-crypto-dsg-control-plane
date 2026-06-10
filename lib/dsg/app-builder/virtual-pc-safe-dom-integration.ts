/**
 * Virtual PC + Safe DOM Integration
 * Connects Virtual PC GUI simulator to Safe DOM manifest workflow
 * 
 * Provides:
 * 1. DOM extraction from rendered React components
 * 2. Safe DOM manifest building and session storage
 * 3. Command verification before execution
 */

import {
  buildSafeManifest,
  verifySafeDomCommand,
  type RawDomElement,
  type SafeDomElement,
  type SafeDomCommand,
  type SafeElementManifest,
  type SafeDomView,
  type SafeDomVerificationResult,
  type SafeDomManifestConfig,
} from '../safe-dom';

/**
 * Virtual PC session state
 * Stores manifest and related metadata for a simulated DOM session
 */
export interface VirtualPcSessionState {
  sessionId: string;
  manifest: SafeElementManifest[];
  view: SafeDomView;
  frameId: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Extract raw DOM elements from a rendered DOM container
 *
 * This function extracts accessible elements from a DOM tree
 * without sending selector information to the agent
 *
 * @param container - DOM container or element to extract from
 * @returns Array of RawDomElement (contains selectors, server-side only)
 */
export function domExtractorFromReact(container: Element | Document = typeof document !== 'undefined' ? document : null): RawDomElement[] {
  const elements: RawDomElement[] = [];

  if (!container) {
    return elements;
  }

  try {
    // Extract button elements
    const buttons = container.querySelectorAll('button, [role="button"]');
    buttons.forEach((btn, index) => {
      elements.push({
        selector: btn.getAttribute('data-testid') || `.button-${index}`,
        role: 'button',
        text: btn.textContent || undefined,
        label: btn.getAttribute('aria-label') || undefined,
        value: btn.getAttribute('value') || undefined,
        allowedOps: ['click'],
      });
    });

    // Extract input elements
    const inputs = container.querySelectorAll('input, textarea');
    inputs.forEach((input, index) => {
      const isTextarea = input.tagName === 'TEXTAREA';
      elements.push({
        selector: input.getAttribute('data-testid') || `.input-${index}`,
        role: isTextarea ? 'textarea' : 'input',
        label: input.getAttribute('aria-label') || undefined,
        value: input.getAttribute('value') || undefined,
        allowedOps: ['click', 'type'],
      });
    });

    // Extract links
    const links = container.querySelectorAll('a, [role="link"]');
    links.forEach((link, index) => {
      elements.push({
        selector: link.getAttribute('href') || `.link-${index}`,
        role: 'link',
        text: link.textContent || undefined,
        label: link.getAttribute('aria-label') || undefined,
        allowedOps: ['click'],
      });
    });

    // Extract text containers
    const texts = container.querySelectorAll('p, span, div[data-text]');
    texts.forEach((text, index) => {
      if (text.textContent && text.textContent.length > 0) {
        elements.push({
          selector: text.getAttribute('data-testid') || `.text-${index}`,
          role: 'text',
          text: text.textContent,
          allowedOps: [],
        });
      }
    });
  } catch (error) {
    // If DOM access fails, return empty array
    console.warn('DOM extraction failed:', error);
  }

  return elements;
}

/**
 * Build a Safe DOM manifest from raw elements and store in session
 * 
 * This function:
 * 1. Takes raw DOM elements (with selectors)
 * 2. Filters dangerous elements (delete buttons, etc.)
 * 3. Redacts secrets from values
 * 4. Builds internal manifest for verification
 * 5. Creates safe view for agent
 * 6. Stores manifest in session state
 * 7. Returns only SafeDomElement[] to agent (no selectors)
 * 
 * @param rawElements - Raw DOM elements extracted from component
 * @param sessionId - Unique session identifier
 * @param config - Configuration for manifest building
 * @returns Session state with safe view (agent-facing elements)
 */
export function buildSessionManifest(
  rawElements: RawDomElement[],
  sessionId: string,
  config: SafeDomManifestConfig = {}
): VirtualPcSessionState {
  const frameId = 'virtual-pc';
  const ttlSeconds = config.ttlSeconds || 300;

  // Build safe manifest from raw elements
  const { manifest, view } = buildSafeManifest(rawElements, frameId, config);

  // Create session state
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  const sessionState: VirtualPcSessionState = {
    sessionId,
    manifest, // Server-side only, contains selectors
    view, // Agent-facing view, no selectors
    frameId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  return sessionState;
}

/**
 * Verify a mouse/DOM command before execution
 * 
 * This function checks if a command from the agent is safe to execute
 * by verifying it against the manifest
 * 
 * @param command - Command from agent (elementId-based, not selector-based)
 * @param sessionState - Current session state with manifest
 * @returns Verification result (ALLOW or BLOCK with reason)
 */
export function verifyMouseCommand(
  command: SafeDomCommand,
  sessionState: VirtualPcSessionState
): SafeDomVerificationResult {
  // Check session expiration
  if (new Date(sessionState.expiresAt) < new Date()) {
    return {
      decision: 'BLOCK',
      reason: 'SESSION_EXPIRED',
    };
  }

  // Verify command against manifest
  const result = verifySafeDomCommand(command, sessionState.manifest, sessionState.frameId);

  return result;
}

/**
 * Refresh manifest TTL for an active session
 * Called when agent makes a new request within existing session
 * 
 * @param sessionState - Current session state
 * @param config - Configuration with new TTL
 * @returns Updated session state with extended expiration
 */
export function refreshSessionManifest(
  sessionState: VirtualPcSessionState,
  config: SafeDomManifestConfig = {}
): VirtualPcSessionState {
  const ttlSeconds = config.ttlSeconds || 300;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  return {
    ...sessionState,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Get safe view from session (what to send to agent)
 * Filters out internal manifest details
 * 
 * @param sessionState - Session state
 * @returns SafeDomElement[] - Only safe elements visible to agent
 */
export function getSafeViewFromSession(sessionState: VirtualPcSessionState): SafeDomElement[] {
  return sessionState.view.elements;
}

/**
 * Get the internal selector for an element (verification only)
 * Used internally to translate element ID back to selector for actual DOM execution
 * 
 * @param sessionState - Session state
 * @param elementId - Element ID (e.g., 'e001')
 * @returns Internal selector string, or undefined if not found
 */
export function getInternalSelectorForElement(
  sessionState: VirtualPcSessionState,
  elementId: string
): string | undefined {
  const element = sessionState.manifest.find((e) => e.id === elementId);
  return element?.internalSelector;
}
