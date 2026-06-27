/**
 * Safe DOM Filter
 * Detects dangerous elements that should be filtered from the safe view
 */

import type { RawDomElement, SafeDomRisk } from './types';

const DANGEROUS_PATTERNS = [
  // Destructive operations
  /delete/i,
  /remove/i,
  /destroy/i,
  /drop\s+table/i,
  /truncate/i,
  /clear\s+all/i,
  
  // Financial operations
  /confirm|confirmation/i,
  /pay|payment/i,
  /purchase|buy/i,
  /charge|billing/i,
  /refund/i,
  
  // Deployment/production
  /deploy\s+production/i,
  /production\s+deploy/i,
  /go\s+live/i,
  
  // Publishing
  /merge\s+(to\s+)?main/i,
  /publish/i,
  /post/i,
  /submit/i,
  
  // Communication
  /send/i,
  /invite/i,
  /share/i,
  
  // Security/permissions
  /rotate\s+secret/i,
  /change\s+permission/i,
  /revoke\s+access/i,
  /reset\s+password/i,
  
  // Export/data extraction
  /export/i,
];

const DANGEROUS_SELECTORS = [
  /delete-btn/i,
  /remove-btn/i,
  /danger-zone/i,
  /destructive/i,
];

/**
 * Assess risk level of an element based on its text, label, and selector
 */
export function assessElementRisk(element: RawDomElement): SafeDomRisk {
  const combinedText = [
    element.text,
    element.label,
    element.selector,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Check against dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(combinedText)) {
      return 'high';
    }
  }

  // Check against dangerous selectors
  for (const pattern of DANGEROUS_SELECTORS) {
    if (pattern.test(element.selector)) {
      return 'high';
    }
  }

  // Buttons without clear purpose are medium risk
  if (element.role === 'button' && !element.text && !element.label) {
    return 'medium';
  }

  return 'low';
}

/**
 * Determine if an element should be filtered out
 * High-risk elements are filtered by default
 */
export function shouldFilterElement(
  element: RawDomElement,
  filterDangerousElements: boolean = true
): boolean {
  if (!filterDangerousElements) {
    return false;
  }

  const risk = assessElementRisk(element);
  return risk === 'high';
}

/**
 * Filter raw DOM elements to only safe ones
 */
export function filterDangerousElements(
  elements: RawDomElement[],
  filterDangerousElements: boolean = true
): RawDomElement[] {
  if (!filterDangerousElements) {
    return elements;
  }

  return elements.filter((el) => !shouldFilterElement(el, filterDangerousElements));
}
