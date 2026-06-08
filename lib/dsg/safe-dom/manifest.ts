import { filterDangerousElements, SAFE_DOM_POLICY_VERSION } from './filter';
import { redactSensitiveValues } from './redact';
import type {
  RawDomElement,
  SafeDomBuildInput,
  SafeDomBuildResult,
  SafeDomElement,
  SafeDomOperation,
  SafeElementManifest,
} from './types';

const DEFAULT_TTL_MS = 60_000;

function hashSelector(selector: string): string {
  let hash = 2166136261;
  for (let i = 0; i < selector.length; i += 1) {
    hash ^= selector.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function defaultAllowedOps(element: RawDomElement): SafeDomOperation[] {
  if (element.allowedOps && element.allowedOps.length > 0) {
    return element.allowedOps;
  }

  if (element.role === 'textbox') {
    return ['type'];
  }

  return ['click'];
}

function safeElementId(index: number): string {
  return `e${String(index + 1).padStart(3, '0')}`;
}

export function buildSafeManifest(input: SafeDomBuildInput): SafeDomBuildResult {
  const now = input.now ?? new Date();
  const ttlMs = input.ttlMs ?? DEFAULT_TTL_MS;
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  const filtered = filterDangerousElements(input.elements);
  const redacted = redactSensitiveValues(filtered.safe);

  const viewElements: SafeDomElement[] = [];
  const manifest: SafeElementManifest[] = [];

  redacted.elements.forEach((element, index) => {
    const id = safeElementId(index);
    const allowedOps = defaultAllowedOps(element);
    const viewElement: SafeDomElement = {
      id,
      role: element.role,
      text: element.text,
      label: element.label,
      value: element.value,
      allowedOps,
    };

    viewElements.push(viewElement);
    manifest.push({
      ...viewElement,
      frameId: input.frameId,
      selectorHash: hashSelector(element.selector),
      internalSelector: element.selector,
      risk: 'LOW',
      expiresAt,
    });
  });

  return {
    view: {
      frameId: input.frameId,
      url: input.url,
      title: input.title,
      elements: viewElements,
      removedCount: filtered.removed.length,
      redactedCount: redacted.redactedCount,
      policyVersion: SAFE_DOM_POLICY_VERSION,
    },
    manifest,
    removed: filtered.removed,
  };
}
