import type { RawDomElement } from './types';

const SECRET_PATTERNS = [
  /sk_live_[A-Za-z0-9_\-]+/i,
  /sk_test_[A-Za-z0-9_\-]+/i,
  /ghp_[A-Za-z0-9_]+/i,
  /github_pat_[A-Za-z0-9_]+/i,
  /xox[baprs]-[A-Za-z0-9\-]+/i,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]/i,
];

export const REDACTED_SECRET = '[REDACTED_SECRET]';
export const REDACTED_LONG_VALUE = '[REDACTED_LONG_VALUE]';

export function isSensitiveValue(value: string | undefined): boolean {
  if (!value) return false;
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

export function redactValue(value: string | undefined): { value?: string; redacted: boolean } {
  if (value === undefined) {
    return { value, redacted: false };
  }

  if (isSensitiveValue(value)) {
    return { value: REDACTED_SECRET, redacted: true };
  }

  if (value.length > 128) {
    return { value: REDACTED_LONG_VALUE, redacted: true };
  }

  return { value, redacted: false };
}

export function redactElement(element: RawDomElement): { element: RawDomElement; redactedCount: number } {
  const text = redactValue(element.text);
  const label = redactValue(element.label);
  const value = redactValue(element.value);

  return {
    element: {
      ...element,
      text: text.value,
      label: label.value,
      value: value.value,
    },
    redactedCount: [text, label, value].filter((item) => item.redacted).length,
  };
}

export function redactSensitiveValues(elements: RawDomElement[]): {
  elements: RawDomElement[];
  redactedCount: number;
} {
  return elements.reduce(
    (acc, element) => {
      const redacted = redactElement(element);
      acc.elements.push(redacted.element);
      acc.redactedCount += redacted.redactedCount;
      return acc;
    },
    { elements: [] as RawDomElement[], redactedCount: 0 },
  );
}
