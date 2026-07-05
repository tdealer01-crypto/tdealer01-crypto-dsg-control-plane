import { describe, expect, it } from 'vitest';
import {
  buildSafeManifest,
  filterDangerousElements,
  redactSensitiveValues,
  verifySafeDomCommand,
  type RawDomElement,
} from '../../lib/dsg/safe-dom';

const now = new Date('2026-06-08T00:00:00.000Z');

function rawElement(overrides: Partial<RawDomElement>): RawDomElement {
  return {
    selector: '[data-test="safe"]',
    role: 'button',
    text: 'Open logs',
    allowedOps: ['click'],
    ...overrides,
  };
}

describe('safe DOM dangerous element filtering', () => {
  it('removes dangerous actions before agent observation', () => {
    const result = filterDangerousElements([
      rawElement({ selector: '#logs', text: 'View logs' }),
      rawElement({ selector: '#delete', text: 'Delete project' }),
      rawElement({ selector: '#billing', label: 'Billing settings' }),
      rawElement({ selector: '#merge', text: 'Merge pull request' }),
    ]);

    expect(result.safe.map((item) => item.selector)).toEqual(['#logs']);
    expect(result.removed.map((item) => item.selector)).toEqual(['#delete', '#billing', '#merge']);
  });
});

describe('safe DOM redaction', () => {
  it('redacts secret-like values before agent observation', () => {
    const result = redactSensitiveValues([
      rawElement({ selector: '#token', value: 'sk_live_abc123456789' }),
      rawElement({ selector: '#github', text: 'ghp_abcdefghijklmnopqrstuvwxyz' }),
      rawElement({ selector: '#public', text: 'Public docs' }),
    ]);

    expect(result.redactedCount).toBe(2);
    expect(result.elements[0].value).toBe('[REDACTED_SECRET]');
    expect(result.elements[1].text).toBe('[REDACTED_SECRET]');
    expect(result.elements[2].text).toBe('Public docs');
  });
});

describe('safe DOM manifest construction', () => {
  it('builds an agent-facing view without raw selectors', () => {
    const result = buildSafeManifest({
      frameId: 'frame_001',
      url: 'https://example.test',
      title: 'Example',
      now,
      ttlMs: 30_000,
      elements: [
        rawElement({ selector: '#logs', text: 'View logs' }),
        rawElement({ selector: '#delete', text: 'Delete project' }),
        rawElement({ selector: '#search', role: 'textbox', label: 'Search', allowedOps: undefined }),
      ],
    });

    expect(result.view.elements).toHaveLength(2);
    expect(result.view.removedCount).toBe(1);
    expect(result.view.elements[0]).not.toHaveProperty('selector');
    expect(result.manifest[0].internalSelector).toBe('#logs');
    expect(result.manifest[0].selectorHash).toMatch(/^[a-f0-9]{8}$/);
    expect(result.view.elements[1].allowedOps).toEqual(['type']);
  });
});

describe('safe DOM command verification', () => {
  it('allows an exposed unexpired element with a permitted operation', () => {
    const result = buildSafeManifest({
      frameId: 'frame_001',
      url: 'https://example.test',
      now,
      ttlMs: 30_000,
      elements: [rawElement({ selector: '#logs', text: 'View logs', allowedOps: ['click'] })],
    });

    const decision = verifySafeDomCommand(
      { frameId: 'frame_001', op: 'click', elementId: 'e001' },
      result.manifest,
      now,
    );

    expect(decision.decision).toBe('ALLOW');
    if (decision.decision === 'ALLOW') {
      expect(decision.element.internalSelector).toBe('#logs');
    }
  });

  it('blocks an unknown element id even when the frame exists', () => {
    const result = buildSafeManifest({
      frameId: 'frame_001',
      url: 'https://example.test',
      now,
      elements: [rawElement({ selector: '#logs' })],
    });

    const decision = verifySafeDomCommand(
      { frameId: 'frame_001', op: 'click', elementId: 'e999' },
      result.manifest,
      now,
    );

    expect(decision).toEqual({ decision: 'BLOCK', reason: 'ELEMENT_NOT_EXPOSED_TO_AGENT' });
  });

  it('blocks expired manifests', () => {
    const result = buildSafeManifest({
      frameId: 'frame_001',
      url: 'https://example.test',
      now,
      ttlMs: 1_000,
      elements: [rawElement({ selector: '#logs' })],
    });

    const decision = verifySafeDomCommand(
      { frameId: 'frame_001', op: 'click', elementId: 'e001' },
      result.manifest,
      new Date('2026-06-08T00:00:02.000Z'),
    );

    expect(decision).toEqual({ decision: 'BLOCK', reason: 'SAFE_VIEW_EXPIRED' });
  });

  it('blocks operations not listed in allowedOps', () => {
    const result = buildSafeManifest({
      frameId: 'frame_001',
      url: 'https://example.test',
      now,
      elements: [rawElement({ selector: '#logs', allowedOps: ['click'] })],
    });

    const decision = verifySafeDomCommand(
      { frameId: 'frame_001', op: 'type', elementId: 'e001', text: 'unsafe text' },
      result.manifest,
      now,
    );

    expect(decision).toEqual({ decision: 'BLOCK', reason: 'OP_NOT_ALLOWED_FOR_ELEMENT' });
  });

  it('blocks commands from a frame that has no manifest', () => {
    const result = buildSafeManifest({
      frameId: 'frame_001',
      url: 'https://example.test',
      now,
      elements: [rawElement({ selector: '#logs' })],
    });

    const decision = verifySafeDomCommand(
      { frameId: 'frame_002', op: 'click', elementId: 'e001' },
      result.manifest,
      now,
    );

    expect(decision).toEqual({ decision: 'BLOCK', reason: 'INVALID_COMMAND_FRAME' });
  });
});
