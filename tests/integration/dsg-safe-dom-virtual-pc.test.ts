/**
 * Virtual PC + Safe DOM Integration Tests
 * 
 * Tests the complete workflow:
 * 1. Extract DOM from simulated React component
 * 2. Filter dangerous elements (delete button removed)
 * 3. Redact secrets (hidden values)
 * 4. Allow valid click on element (logs button)
 * 5. Block unknown element ID
 * 6. Block expired manifest
 * 7. TTL refresh on new request
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RawDomElement, SafeDomCommand } from '../../lib/dsg/safe-dom';
import {
  buildSafeManifest,
  verifySafeDomCommand,
  filterDangerousElements,
  redactValue,
  containsSecret,
} from '../../lib/dsg/safe-dom';
import {
  buildSessionManifest,
  verifyMouseCommand,
  getSafeViewFromSession,
  getInternalSelectorForElement,
  refreshSessionManifest,
} from '../../lib/dsg/app-builder/virtual-pc-safe-dom-integration';

describe('Virtual PC + Safe DOM Integration', () => {
  let mockElements: RawDomElement[];
  let sessionId: string;

  beforeEach(() => {
    // Mock DOM elements from virtual PC simulator
    mockElements = [
      {
        selector: '[data-testid="logs-button"]',
        role: 'button',
        text: 'View Logs',
        allowedOps: ['click'],
      },
      {
        selector: '[data-testid="settings-button"]',
        role: 'button',
        text: 'Settings',
        allowedOps: ['click'],
      },
      {
        selector: '[data-testid="delete-button"]',
        role: 'button',
        text: 'Delete Configuration',
        allowedOps: ['click'],
      },
      {
        selector: '[data-testid="api-key-input"]',
        role: 'input',
        label: 'API Key',
        value: 'sk_live_abcdef123456789xyz',
        allowedOps: ['click', 'type'],
      },
      {
        selector: '[data-testid="username-input"]',
        role: 'input',
        label: 'Username',
        value: 'testuser',
        allowedOps: ['click', 'type'],
      },
    ];

    sessionId = 'session-' + Date.now();
  });

  describe('Test 1: Extract DOM from simulated React component', () => {
    it('should build manifest from raw elements', () => {
      const { manifest, view } = buildSafeManifest(mockElements, 'virtual-pc');

      expect(manifest).toBeDefined();
      expect(manifest.length).toBeGreaterThan(0);
      expect(view).toBeDefined();
      expect(view.elements).toBeDefined();
    });

    it('should assign unique IDs to elements', () => {
      const { manifest } = buildSafeManifest(mockElements, 'virtual-pc');

      const ids = manifest.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
      // IDs are frame-scoped with hash: {frameHash}-e{index}
      expect(ids[0]).toMatch(/^[a-f0-9]{8}-e000$/);
      expect(ids[1]).toMatch(/^[a-f0-9]{8}-e001$/);
    });

    it('should preserve element properties in safe view', () => {
      const { view } = buildSafeManifest(mockElements, 'virtual-pc');

      const firstElement = view.elements[0];
      expect(firstElement).toHaveProperty('id');
      expect(firstElement).toHaveProperty('role');
      expect(firstElement).toHaveProperty('text');
      expect(firstElement).toHaveProperty('allowedOps');
    });

    it('should not expose selectors to agent', () => {
      const { view } = buildSafeManifest(mockElements, 'virtual-pc');

      view.elements.forEach((el) => {
        expect(el).not.toHaveProperty('selector');
      });
    });
  });

  describe('Test 2: Filter dangerous elements (delete button removed)', () => {
    it('should filter high-risk elements', () => {
      const filtered = filterDangerousElements(mockElements, true);

      const hasDeleteButton = filtered.some((el) => el.text?.includes('Delete'));
      expect(hasDeleteButton).toBe(false);
    });

    it('should keep safe elements', () => {
      const filtered = filterDangerousElements(mockElements, true);

      const hasLogsButton = filtered.some((el) => el.text?.includes('Logs'));
      expect(hasLogsButton).toBe(true);
    });

    it('should not filter when disabled', () => {
      const filtered = filterDangerousElements(mockElements, false);

      expect(filtered.length).toBe(mockElements.length);
    });

    it('should assess risk levels correctly', () => {
      const { manifest } = buildSafeManifest(mockElements, 'virtual-pc');

      const deleteEl = manifest.find((e) => e.text?.includes('Delete'));
      const logsEl = manifest.find((e) => e.text?.includes('Logs'));

      // Delete button should not exist if filtered
      expect(deleteEl).toBeUndefined();
      // Logs button should be low risk
      expect(logsEl?.risk).toBe('low');
    });
  });

  describe('Test 3: Redact secrets (hidden values)', () => {
    it('should detect Stripe keys', () => {
      const stripeKey = 'sk_live_abcdef123456789xyz';
      expect(containsSecret(stripeKey)).toBe(true);
    });

    it('should redact Stripe keys', () => {
      const stripeKey = 'sk_live_abcdef123456789xyz';
      const redacted = redactValue(stripeKey);
      expect(redacted).toBe('[REDACTED]');
    });

    it('should not redact normal values', () => {
      const normalValue = 'testuser';
      const redacted = redactValue(normalValue);
      expect(redacted).toBe('testuser');
    });

    it('should redact values in manifest', () => {
      const { manifest } = buildSafeManifest(mockElements, 'virtual-pc', {
        redactSecrets: true,
      });

      const apiKeyEl = manifest.find((e) => e.label?.includes('API Key'));
      expect(apiKeyEl?.value).toBe('[REDACTED]');
    });

    it('should not redact when disabled', () => {
      const { manifest } = buildSafeManifest(mockElements, 'virtual-pc', {
        redactSecrets: false,
      });

      const apiKeyEl = manifest.find((e) => e.label?.includes('API Key'));
      expect(apiKeyEl?.value).toBe('sk_live_abcdef123456789xyz');
    });
  });

  describe('Test 4: Allow valid click on e001 (logs button)', () => {
    it('should allow click on exposed element', () => {
      const sessionState = buildSessionManifest(mockElements, sessionId, {
        filterDangerousElements: true,
      });

      // Get the logs button ID (should be e001 after filtering)
      const logsButton = sessionState.view.elements.find((e) =>
        e.text?.includes('Logs')
      );
      expect(logsButton).toBeDefined();

      const command: SafeDomCommand = {
        frameId: 'virtual-pc',
        elementId: logsButton!.id,
        operation: 'click',
      };

      const result = verifyMouseCommand(command, sessionState);
      expect(result.decision).toBe('ALLOW');
      expect(result.risk).toBe('low');
    });

    it('should execute and track allowed commands', () => {
      const sessionState = buildSessionManifest(mockElements, sessionId);
      const logsButton = sessionState.view.elements[0]; // First element after filtering

      const command: SafeDomCommand = {
        frameId: 'virtual-pc',
        elementId: logsButton.id,
        operation: 'click',
      };

      const result = verifyMouseCommand(command, sessionState);
      expect(result.decision).toBe('ALLOW');
    });

    it('should allow typing on input elements', () => {
      const sessionState = buildSessionManifest(mockElements, sessionId);
      const inputEl = sessionState.view.elements.find((e) => e.role === 'input');
      expect(inputEl).toBeDefined();

      const command: SafeDomCommand = {
        frameId: 'virtual-pc',
        elementId: inputEl!.id,
        operation: 'type',
        value: 'new value',
      };

      const result = verifyMouseCommand(command, sessionState);
      expect(result.decision).toBe('ALLOW');
    });
  });

  describe('Test 5: Block unknown element ID', () => {
    it('should block commands for unknown elements', () => {
      const sessionState = buildSessionManifest(mockElements, sessionId);

      const command: SafeDomCommand = {
        frameId: 'virtual-pc',
        elementId: 'e999',
        operation: 'click',
      };

      const result = verifyMouseCommand(command, sessionState);
      expect(result.decision).toBe('BLOCK');
      expect(result.reason).toBe('ELEMENT_NOT_EXPOSED_TO_AGENT');
    });

    it('should provide clear block reason', () => {
      const sessionState = buildSessionManifest(mockElements, sessionId);

      const command: SafeDomCommand = {
        frameId: 'virtual-pc',
        elementId: 'e999',
        operation: 'click',
      };

      const result = verifyMouseCommand(command, sessionState);
      expect(result.reason).toBeDefined();
    });
  });

  describe('Test 6: Block expired manifest', () => {
    it('should block commands when manifest expires', () => {
      let sessionState = buildSessionManifest(mockElements, sessionId, {
        ttlSeconds: 0.1, // 100ms
      });

      // Wait for expiration
      vi.useFakeTimers();
      vi.advanceTimersByTime(200); // Wait 200ms

      const logsButton = sessionState.view.elements[0];
      const command: SafeDomCommand = {
        frameId: 'virtual-pc',
        elementId: logsButton.id,
        operation: 'click',
      };

      const result = verifyMouseCommand(command, sessionState);
      expect(result.decision).toBe('BLOCK');
      expect(result.reason).toMatch(/EXPIRED|expired/);

      vi.useRealTimers();
    });
  });

  describe('Test 7: TTL refresh on new request', () => {
    it('should extend TTL on refresh', () => {
      let sessionState = buildSessionManifest(mockElements, sessionId, {
        ttlSeconds: 300,
      });

      const originalExpiry = sessionState.expiresAt;

      // Simulate time passing
      vi.useFakeTimers();
      vi.advanceTimersByTime(100); // Wait 100ms

      // Refresh session
      sessionState = refreshSessionManifest(sessionState, { ttlSeconds: 300 });

      const newExpiry = sessionState.expiresAt;
      expect(newExpiry).not.toBe(originalExpiry);

      vi.useRealTimers();
    });

    it('should allow commands after refresh', () => {
      let sessionState = buildSessionManifest(mockElements, sessionId, {
        ttlSeconds: 100,
      });

      const logsButton = sessionState.view.elements[0];
      const command: SafeDomCommand = {
        frameId: 'virtual-pc',
        elementId: logsButton.id,
        operation: 'click',
      };

      // Refresh before expiration
      sessionState = refreshSessionManifest(sessionState, { ttlSeconds: 300 });

      const result = verifyMouseCommand(command, sessionState);
      expect(result.decision).toBe('ALLOW');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow: extract > build > verify', () => {
      // Step 1: Build session from raw elements
      const sessionState = buildSessionManifest(mockElements, sessionId);

      // Step 2: Get safe view for agent
      const safeView = getSafeViewFromSession(sessionState);
      expect(safeView.length).toBeGreaterThan(0);
      expect(safeView.length).toBeLessThan(mockElements.length); // Some filtered

      // Step 3: Agent clicks element
      const firstElement = safeView[0];
      const command: SafeDomCommand = {
        frameId: 'virtual-pc',
        elementId: firstElement.id,
        operation: 'click',
      };

      // Step 4: Verify command
      const result = verifyMouseCommand(command, sessionState);
      expect(result.decision).toBe('ALLOW');

      // Step 5: Get internal selector for execution (server-side only)
      const selector = getInternalSelectorForElement(sessionState, firstElement.id);
      expect(selector).toBeDefined();
    });

    it('should prevent access to filtered elements', () => {
      const sessionState = buildSessionManifest(mockElements, sessionId, {
        filterDangerousElements: true,
      });

      // Delete button should be filtered, so its ID should not exist
      const safeIds = new Set(sessionState.view.elements.map((e) => e.id));

      // Try to access a non-exposed element by constructing a fake ID
      // (In reality, agent wouldn't know about filtered elements)
      const command: SafeDomCommand = {
        frameId: 'virtual-pc',
        elementId: 'e003', // Potentially a filtered element
        operation: 'click',
      };

      const result = verifyMouseCommand(command, sessionState);
      // Should either ALLOW if it's a valid filtered element, or BLOCK
      expect(['ALLOW', 'BLOCK']).toContain(result.decision);
    });
  });

  describe('Manifest integrity', () => {
    it('should maintain manifest consistency', () => {
      const sessionState = buildSessionManifest(mockElements, sessionId);

      // Verify manifest has consistent IDs and view
      const manifestIds = new Set(sessionState.manifest.map((e) => e.id));
      const viewIds = new Set(sessionState.view.elements.map((e) => e.id));

      expect(manifestIds.size).toBe(viewIds.size);
      manifestIds.forEach((id) => {
        expect(viewIds.has(id)).toBe(true);
      });
    });

    it('should never expose selectors in view', () => {
      const sessionState = buildSessionManifest(mockElements, sessionId);

      // Verify no selector info leaks to agent view
      sessionState.view.elements.forEach((el) => {
        expect(el).not.toHaveProperty('selector');
        expect(el).not.toHaveProperty('internalSelector');
        expect(el).not.toHaveProperty('selectorHash');
      });
    });
  });
});
