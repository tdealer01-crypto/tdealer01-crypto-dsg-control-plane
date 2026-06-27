/**
 * Safe DOM Manifest
 * Builds and manages the safe DOM manifest for verification
 */

import { createHash } from 'crypto';
import type {
  RawDomElement,
  SafeDomElement,
  SafeElementManifest,
  SafeDomView,
  SafeDomManifestConfig,
} from './types';
import { filterDangerousElements, assessElementRisk } from './filter';
import { redactValue } from './redact';

/**
 * Generate unique, frame-scoped element ID
 * Format: sha256(frameId)[:8]-e{index:03d}
 * This prevents ID collision across frames/sessions
 * SECURITY CRITICAL: Do not use simple e001, e002 without frame scoping
 */
function generateElementId(frameId: string, index: number): string {
  const frameHash = createHash('sha256')
    .update(frameId)
    .digest('hex')
    .substring(0, 8);
  return `${frameHash}-e${String(index).padStart(3, '0')}`;
}

/**
 * Hash a selector for verification
 */
function hashSelector(selector: string): string {
  return createHash('sha256').update(selector).digest('hex').slice(0, 16);
}

/**
 * Compute manifest hash for integrity verification
 */
function computeManifestHash(elements: SafeElementManifest[]): string {
  const payload = JSON.stringify(elements.map((e) => ({ id: e.id, selectorHash: e.selectorHash })));
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

/**
 * Build a safe DOM manifest from raw elements
 */
export function buildSafeManifest(
  rawElements: RawDomElement[],
  frameId: string = 'default',
  config: SafeDomManifestConfig = {}
): { manifest: SafeElementManifest[]; view: SafeDomView } {
  const {
    ttlSeconds = 300,
    filterDangerousElements: shouldFilter = true,
    redactSecrets: shouldRedact = true,
  } = config;

  // Filter dangerous elements
  const filtered = filterDangerousElements(rawElements, shouldFilter);

  // Build manifest entries
  const manifest: SafeElementManifest[] = filtered.map((element, index) => {
    const elementId = generateElementId(frameId, index);
    const selectorHash = hashSelector(element.selector);
    const risk = assessElementRisk(element);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    return {
      id: elementId,
      frameId,
      role: element.role,
      text: element.text,
      label: element.label,
      value: shouldRedact ? redactValue(element.value) : element.value,
      allowedOps: element.allowedOps || ['click'],
      selectorHash,
      internalSelector: element.selector, // Never sent to agent
      risk,
      expiresAt,
    };
  });

  // Build safe view for agent
  const manifestHash = computeManifestHash(manifest);
  const view: SafeDomView = {
    elements: manifest.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      label: m.label,
      value: m.value,
      allowedOps: m.allowedOps,
    })),
    frameId,
    expiresAt: manifest[0]?.expiresAt || new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    manifestHash,
  };

  return { manifest, view };
}

/**
 * Check if manifest is expired
 */
export function isManifestExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Find element in manifest by ID
 */
export function findElementInManifest(
  manifest: SafeElementManifest[],
  elementId: string
): SafeElementManifest | undefined {
  return manifest.find((e) => e.id === elementId);
}

/**
 * Verify manifest integrity
 */
export function verifyManifestIntegrity(
  manifest: SafeElementManifest[],
  expectedHash: string
): boolean {
  const computedHash = computeManifestHash(manifest);
  return computedHash === expectedHash;
}

/**
 * SECURITY CRITICAL: Validate a manifest for correctness
 *
 * Checks:
 * 1. No duplicate element IDs within each frame (collision detection)
 * 2. All TTLs are in the future (expiration check)
 * 3. Valid schema and required fields
 * 4. frameId is consistent (if multiple entries)
 *
 * Returns empty array if valid, or array of error messages if invalid
 * @throws Error if validation fails with critical security issue
 */
export function validateManifest(manifest: SafeElementManifest[]): string[] {
  const errors: string[] = [];

  // Empty manifest is valid
  if (!Array.isArray(manifest) || manifest.length === 0) {
    return errors;
  }

  const now = new Date();
  const seenIds = new Set<string>();
  const frameIds = new Set<string>();

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];

    // Check required fields exist
    if (!entry.id || typeof entry.id !== 'string') {
      errors.push(`[${i}] Missing or invalid id field`);
      continue;
    }

    if (!entry.frameId || typeof entry.frameId !== 'string') {
      errors.push(`[${i}] Missing or invalid frameId field`);
      continue;
    }

    if (!entry.expiresAt || typeof entry.expiresAt !== 'string') {
      errors.push(`[${i}] Missing or invalid expiresAt field`);
      continue;
    }

    // Check for duplicate IDs within the frame (critical security check)
    const idKey = `${entry.frameId}:${entry.id}`;
    if (seenIds.has(idKey)) {
      errors.push(
        `[${i}] Duplicate element ID collision detected: ${entry.id} in frame ${entry.frameId}`
      );
    }
    seenIds.add(idKey);

    // Track frameIds for consistency
    frameIds.add(entry.frameId);

    // Check TTL not expired (critical security check)
    let expiresDate: Date;
    try {
      expiresDate = new Date(entry.expiresAt);
    } catch {
      errors.push(`[${i}] Invalid expiresAt format: ${entry.expiresAt}`);
      continue;
    }

    if (isNaN(expiresDate.getTime())) {
      errors.push(`[${i}] Invalid expiresAt ISO 8601 timestamp: ${entry.expiresAt}`);
      continue;
    }

    if (expiresDate <= now) {
      errors.push(
        `[${i}] Manifest entry has expired (expiresAt: ${entry.expiresAt}, now: ${now.toISOString()})`
      );
    }

    // Validate schema fields
    if (!entry.role || typeof entry.role !== 'string') {
      errors.push(`[${i}] Missing or invalid role field`);
    }

    if (!Array.isArray(entry.allowedOps)) {
      errors.push(`[${i}] allowedOps must be an array`);
    }

    if (!entry.selectorHash || typeof entry.selectorHash !== 'string') {
      errors.push(`[${i}] Missing or invalid selectorHash field`);
    }

    if (!entry.internalSelector || typeof entry.internalSelector !== 'string') {
      errors.push(`[${i}] Missing or invalid internalSelector field`);
    }

    if (!entry.risk || typeof entry.risk !== 'string') {
      errors.push(`[${i}] Missing or invalid risk field`);
    }
  }

  // Ensure all entries have the same frameId (consistency check)
  if (frameIds.size > 1) {
    errors.push(
      `Manifest contains multiple frameIds: ${Array.from(frameIds).join(', ')}`
    );
  }

  // If there are critical errors, throw
  const criticalErrors = errors.filter(
    (e) => e.includes('collision') || e.includes('expired')
  );
  if (criticalErrors.length > 0) {
    throw new Error(
      `Critical manifest validation failures: ${criticalErrors.join('; ')}`
    );
  }

  return errors;
}
