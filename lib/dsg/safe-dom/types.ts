/**
 * Safe DOM Types
 * Data structures for deterministic DOM filtering, redaction, and verification
 */

export type SafeDomRole =
  | 'button'
  | 'link'
  | 'input'
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'textarea'
  | 'heading'
  | 'container'
  | 'image'
  | 'table'
  | 'list'
  | 'form'
  | 'other';

export type SafeDomOperation = 'click' | 'type' | 'scroll' | 'press';

export type SafeDomRisk = 'low' | 'medium' | 'high';

export type SafeDomDecision = 'ALLOW' | 'BLOCK';

/**
 * Raw DOM element extracted from a rendered component
 * Contains server-side sensitive information (selectors)
 */
export interface RawDomElement {
  selector: string; // Server-side only, never sent to agent
  role: SafeDomRole;
  text?: string;
  label?: string;
  value?: string;
  allowedOps?: SafeDomOperation[];
}

/**
 * Safe DOM element visible to agents
 * Selector is redacted; element identified by unique ID
 */
export interface SafeDomElement {
  id: string; // e.g., 'e001', 'e002', ...
  role: SafeDomRole;
  text?: string;
  label?: string;
  value?: string; // Redacted if secret
  allowedOps: SafeDomOperation[];
}

/**
 * Internal server-side manifest entry
 * Used for verification; never sent to agent
 */
export interface SafeElementManifest extends SafeDomElement {
  frameId: string;
  selectorHash: string;
  internalSelector: string; // Raw selector, never sent to agent
  risk: SafeDomRisk;
  expiresAt: string; // ISO 8601 timestamp
}

/**
 * Safe view sent to agent
 * Contains only non-sensitive information
 */
export interface SafeDomView {
  elements: SafeDomElement[];
  frameId: string;
  expiresAt: string; // ISO 8601 timestamp
  manifestHash: string; // For verification against manifest
}

/**
 * Agent-issued command targeting a Safe DOM element
 */
export interface SafeDomCommand {
  frameId: string;
  elementId: string; // e.g., 'e001'
  operation: SafeDomOperation;
  value?: string; // For 'type' operation
  key?: string; // For 'press' operation (Enter, Escape, Tab, Backspace)
}

/**
 * Verification result
 */
export interface SafeDomVerificationResult {
  decision: SafeDomDecision;
  reason?: string;
  elementId?: string;
  operation?: SafeDomOperation;
  risk?: SafeDomRisk;
}

/**
 * Configuration for Safe DOM manifest building
 */
export interface SafeDomManifestConfig {
  ttlSeconds?: number; // Default: 300 (5 minutes)
  filterDangerousElements?: boolean; // Default: true
  redactSecrets?: boolean; // Default: true
}
