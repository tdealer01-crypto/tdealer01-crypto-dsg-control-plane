/**
 * Accessibility Validators — WCAG 2.2 AA Compliance Checks
 *
 * Utilities for validating common accessibility requirements:
 * - Color contrast (WCAG 2.2 SC 1.4.3)
 * - Focus management (WCAG 2.2 SC 2.4.7, SC 2.4.11)
 * - Semantic HTML (WCAG 2.2 SC 1.3.1, SC 2.4.1)
 * - ARIA attributes (WCAG 2.2 SC 4.1.2)
 * - Keyboard accessibility (WCAG 2.2 SC 2.1.1)
 */

/**
 * Calculate relative luminance of a color (WCAG formula)
 * Used for contrast ratio calculation
 */
export function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Parse CSS color to RGB array
 */
export function parseRgbColor(color: string): [number, number, number] | null {
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }
  return null;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 * Returns contrast ratio (1:1 to 21:1)
 */
export function getContrastRatio(
  foreground: [number, number, number],
  background: [number, number, number]
): number {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG 2.2 AA standards
 * AA: 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold)
 */
export function meetsContrastRequirement(
  contrastRatio: number,
  textSize: 'normal' | 'large' = 'normal'
): boolean {
  const requirement = textSize === 'large' ? 3 : 4.5;
  return contrastRatio >= requirement;
}

/**
 * Validate that an element has an accessible name
 * Required by WCAG 2.2 SC 4.1.2 (Name, Role, Value)
 */
export function hasAccessibleName(element: Element): boolean {
  // Check for aria-label
  if (element.getAttribute('aria-label')) return true;

  // Check for aria-labelledby
  if (element.getAttribute('aria-labelledby')) return true;

  // Check for visible text content
  const textContent = element.textContent?.trim();
  if (textContent && textContent.length > 0) return true;

  // Check for title attribute
  if (element.getAttribute('title')) return true;

  // Check for associated label (for form inputs)
  if (element instanceof HTMLInputElement) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label && label.textContent?.trim()) return true;
  }

  return false;
}

/**
 * Validate heading hierarchy is logical
 * WCAG 2.2 SC 1.3.1 (Info and Relationships)
 */
export function validateHeadingHierarchy(headings: HTMLHeadingElement[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    const currentLevel = parseInt(current.tagName[1]);

    if (i > 0) {
      const previous = headings[i - 1];
      const previousLevel = parseInt(previous.tagName[1]);

      // Check for logical progression
      if (currentLevel > previousLevel + 1) {
        errors.push(
          `Heading hierarchy jump at position ${i}: ${previous.tagName} (level ${previousLevel}) ` +
            `to ${current.tagName} (level ${currentLevel}). Missing intermediate levels.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate focus visibility
 * WCAG 2.2 SC 2.4.7 (Focus Visible)
 */
export function hasFocusIndicator(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;

  const styles = window.getComputedStyle(element, ':focus');

  // Check for outline
  const outline = styles.outline;
  const outlineWidth = styles.outlineWidth;
  const outlineStyle = styles.outlineStyle;

  // Check if outline is visible
  if (outlineStyle && outlineStyle !== 'none' && outlineWidth && parseInt(outlineWidth) > 0) {
    return true;
  }

  // Check for box-shadow (alternative focus indicator)
  const boxShadow = styles.boxShadow;
  if (boxShadow && boxShadow !== 'none') {
    return true;
  }

  // Check for border (used in some designs)
  const borderWidth = styles.borderWidth;
  if (borderWidth && parseInt(borderWidth) > 0) {
    return true;
  }

  return false;
}

/**
 * Validate that landmarks are present on the page
 * WCAG 2.2 SC 1.3.1 (Info and Relationships)
 */
export function validateLandmarks(): {
  hasMain: boolean;
  hasNav: boolean;
  hasContentRegion: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const hasMain = !!document.querySelector('main, [role="main"]');
  const hasNav = !!document.querySelector('nav, [role="navigation"]');
  const hasContentRegion = !!document.querySelector('[role="region"]');

  if (!hasMain) {
    errors.push('Missing <main> element or [role="main"] landmark');
  }

  return {
    hasMain,
    hasNav,
    hasContentRegion,
    errors,
  };
}

/**
 * Validate keyboard accessibility
 * Check if all interactive elements are keyboard accessible
 */
export function validateKeyboardAccessibility(): {
  allInteractiveAccessible: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const interactiveSelectors = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[role="menuitem"]',
  ];

  for (const selector of interactiveSelectors) {
    const elements = document.querySelectorAll(selector);

    elements.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;

      // Check if element is focusable
      const tabIndex = element.getAttribute('tabindex');
      const isFocusable = element.offsetParent !== null || tabIndex !== null;

      if (!isFocusable && element.tagName !== 'A' && element.tagName !== 'BUTTON') {
        issues.push(`Element ${element.tagName} with selector ${selector} is not keyboard accessible`);
      }
    });
  }

  return {
    allInteractiveAccessible: issues.length === 0,
    issues,
  };
}

/**
 * Check if element meets minimum target size (24x24px)
 * WCAG 2.2 SC 2.5.8 (Target Size)
 */
export function meetsMinimumTargetSize(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;

  const rect = element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // 24x24 CSS pixels minimum
  return width >= 24 && height >= 24;
}

/**
 * Validate ARIA roles are used correctly
 * WCAG 2.2 SC 4.1.2 (Name, Role, Value)
 */
export function validateAriaUsage(): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const elementsWithAriaRole = document.querySelectorAll('[role]');

  elementsWithAriaRole.forEach((element) => {
    const role = element.getAttribute('role');

    // Check for invalid roles
    if (!role || role.trim().length === 0) {
      warnings.push(`Element has empty role attribute`);
    }

    // Check for redundant roles
    const tagName = element.tagName.toLowerCase();
    if (role === 'button' && tagName === 'button') {
      warnings.push(`Redundant role="button" on <button> element`);
    }
    if (role === 'link' && tagName === 'a') {
      warnings.push(`Redundant role="link" on <a> element`);
    }
  });

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
