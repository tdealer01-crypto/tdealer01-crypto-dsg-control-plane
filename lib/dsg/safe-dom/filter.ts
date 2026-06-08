import type { RawDomElement } from './types';

export const SAFE_DOM_POLICY_VERSION = 'safe-dom-v1';

export const DANGEROUS_TERMS = [
  'delete',
  'remove',
  'destroy',
  'confirm',
  'pay',
  'purchase',
  'billing',
  'deploy production',
  'merge',
  'publish',
  'post',
  'send',
  'invite',
  'rotate secret',
  'change permission',
  'export',
] as const;

function normalize(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function getElementSearchText(element: Pick<RawDomElement, 'text' | 'label' | 'selector'>): string {
  return [element.text, element.label, element.selector].map(normalize).filter(Boolean).join(' ');
}

export function isDangerousElement(element: RawDomElement): boolean {
  const searchText = getElementSearchText(element);
  return DANGEROUS_TERMS.some((term) => searchText.includes(term));
}

export function filterDangerousElements(elements: RawDomElement[]): {
  safe: RawDomElement[];
  removed: RawDomElement[];
} {
  return elements.reduce(
    (acc, element) => {
      if (isDangerousElement(element)) {
        acc.removed.push(element);
      } else {
        acc.safe.push(element);
      }
      return acc;
    },
    { safe: [] as RawDomElement[], removed: [] as RawDomElement[] },
  );
}
