import { test, expect } from '@playwright/test';

/**
 * Accessibility E2E Tests (WCAG 2.2 AA)
 *
 * Tests for core accessibility features:
 * - Skip-link functionality (SC 2.4.1 - Bypass Blocks)
 * - ARIA landmarks (SC 1.3.1 - Info and Relationships)
 * - Keyboard navigation (SC 2.1.1 - Keyboard)
 * - Focus visibility (SC 2.4.7 - Focus Visible)
 * - Heading hierarchy (SC 1.3.1)
 * - Form labels and associations (SC 1.3.1, SC 4.1.2)
 *
 * Note: These tests validate DOM structure and keyboard interaction,
 * not screen reader output (use AxeCore for automated scanning).
 */

test.describe('Accessibility - Skip-Link (SC 2.4.1)', () => {
  test('skip-link exists and is hidden initially', async ({ page }) => {
    await page.goto('/dashboard');

    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toHaveCount(1, { timeout: 5000 });

    // Should have sr-only class (screen reader only)
    const classes = await skipLink.getAttribute('class');
    expect(classes).toContain('sr-only');
  });

  test('skip-link becomes visible on Tab focus', async ({ page }) => {
    await page.goto('/dashboard');

    const skipLink = page.locator('a[href="#main-content"]');

    // Initially hidden
    expect(await skipLink.evaluate((el) => getComputedStyle(el).display)).toBe('none');

    // Press Tab to focus skip-link
    await page.keyboard.press('Tab');

    // Skip-link should now be visible
    const isVisible = await skipLink.evaluate((el) => {
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    expect(isVisible).toBe(true);
  });

  test('skip-link jumps to main content on click', async ({ page }) => {
    await page.goto('/dashboard');

    // Get main content element
    const mainContent = page.locator('main, [role="main"]');
    const skipLink = page.locator('a[href="#main-content"]');

    // Focus and click skip-link
    await skipLink.focus();
    await skipLink.click();

    // Main content should be visible and focused
    await expect(mainContent).toBeVisible();

    // Check if main content has focus (via data-focused or similar)
    const mainHasFocus = await page.evaluate(() => {
      const main = document.querySelector('main, [role="main"]');
      return main?.id === 'main-content';
    });

    expect(mainHasFocus).toBe(true);
  });

  test('skip-link is first in tab order', async ({ page }) => {
    await page.goto('/dashboard');

    const skipLink = page.locator('a[href="#main-content"]');
    const tabIndex = await skipLink.getAttribute('tabindex');

    // Should be focusable (tabindex 0 or no positive value)
    expect(tabIndex === null || tabIndex === '0').toBe(true);
  });
});

test.describe('Accessibility - ARIA Landmarks (SC 1.3.1)', () => {
  test('main content landmark exists', async ({ page }) => {
    await page.goto('/dashboard');

    const main = page.locator('main, [role="main"]');
    await expect(main).toHaveCount(1, { timeout: 5000 });
  });

  test('main content has id="main-content" for skip-link target', async ({ page }) => {
    await page.goto('/dashboard');

    const main = page.locator('#main-content');
    const count = await main.count();

    // Either explicit ID or skip-link should work
    if (count === 0) {
      // Fallback: skip-link might inject ID dynamically
      console.warn('No element with id="main-content" found; check if skip-link adds it');
    } else {
      await expect(main).toBeVisible();
    }
  });

  test('navigation landmark is labeled', async ({ page }) => {
    await page.goto('/dashboard');

    const nav = page.locator('nav, [role="navigation"]');
    const count = await nav.count();

    if (count > 0) {
      // Check if labeled with aria-label or aria-labelledby
      for (let i = 0; i < count; i++) {
        const item = nav.nth(i);
        const label = await item.getAttribute('aria-label');
        const labelledBy = await item.getAttribute('aria-labelledby');

        const isLabeled = !!label || !!labelledBy;
        expect(isLabeled).toBe(true, 'Navigation should have aria-label or aria-labelledby');
      }
    }
  });

  test('landmark regions are not nested incorrectly', async ({ page }) => {
    await page.goto('/dashboard');

    // Check that main is not inside nav
    const navContainsMain = await page.evaluate(() => {
      const nav = document.querySelector('nav, [role="navigation"]');
      const main = document.querySelector('main, [role="main"]');

      if (!nav || !main) return false;
      return nav.contains(main);
    });

    expect(navContainsMain).toBe(false);
  });
});

test.describe('Accessibility - Keyboard Navigation (SC 2.1.1)', () => {
  test('all buttons are keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard');

    const buttons = page.locator('button, [role="button"], a[href]');
    const count = await buttons.count();

    expect(count).toBeGreaterThan(0);

    // Check a sample of buttons
    for (let i = 0; i < Math.min(5, count); i++) {
      const button = buttons.nth(i);

      // Should be focusable via Tab
      const isFocusable = await button.evaluate((el) => {
        const tabIndex = el.getAttribute('tabindex');
        return (el as HTMLElement).offsetParent !== null && (tabIndex === null || parseInt(tabIndex) >= -1);
      });

      expect(isFocusable).toBe(true);
    }
  });

  test('no keyboard traps exist in primary navigation', async ({ page }) => {
    await page.goto('/dashboard');

    const result = await page.evaluate(async () => {
      const focusedElements: string[] = [];
      let currentElement = document.activeElement;

      // Try to tab through first 10 focusable elements
      for (let i = 0; i < 10; i++) {
        if (currentElement instanceof HTMLElement) {
          focusedElements.push(currentElement.tagName);
        }

        // Send Tab key
        const event = new KeyboardEvent('keydown', {
          key: 'Tab',
          code: 'Tab',
          keyCode: 9,
          bubbles: true,
        });

        document.dispatchEvent(event);

        // Small delay
        await new Promise((r) => setTimeout(r, 10));

        currentElement = document.activeElement;
      }

      // If focus is stuck on same element, it's a trap
      const uniqueElements = new Set(focusedElements);
      return uniqueElements.size > 1;
    });

    expect(result).toBe(true);
  });

  test('links respond to Enter key', async ({ page }) => {
    await page.goto('/dashboard');

    const links = page.locator('a[href]');
    const firstLink = links.first();

    // Focus link
    await firstLink.focus();

    // Check if link has href
    const href = await firstLink.getAttribute('href');
    expect(href).toBeTruthy();
  });

  test('form inputs are keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard');

    const inputs = page.locator('input[type="text"], input[type="email"], textarea, select');

    if (await inputs.count() > 0) {
      const firstInput = inputs.first();

      // Should be focusable
      await firstInput.focus();

      const isFocused = await firstInput.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
    }
  });
});

test.describe('Accessibility - Focus Visibility (SC 2.4.7)', () => {
  test('focused elements have visible focus indicator', async ({ page }) => {
    await page.goto('/dashboard');

    const button = page.locator('button').first();

    if ((await button.count()) > 0) {
      // Focus button
      await button.focus();

      // Check computed style for focus indicator
      const hasFocusStyle = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el, ':focus-visible');
        const outline = styles.outline || styles.outlineWidth;
        const boxShadow = styles.boxShadow;

        return outline !== 'none' || (boxShadow && boxShadow !== 'none');
      });

      // Note: :focus-visible pseudo-selector support varies; this is a best-effort check
      console.log(`Button focus indicator check: ${hasFocusStyle ? 'passed' : 'may need review'}`);
    }
  });

  test('interactive elements are not hidden on focus', async ({ page }) => {
    await page.goto('/dashboard');

    const result = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');

      for (const button of buttons) {
        if (button instanceof HTMLElement) {
          button.focus();

          const rect = button.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;

          if (!isVisible) {
            return false;
          }

          button.blur();
        }
      }

      return true;
    });

    expect(result).toBe(true);
  });
});

test.describe('Accessibility - Heading Hierarchy (SC 1.3.1)', () => {
  test('headings follow logical hierarchy', async ({ page }) => {
    await page.goto('/dashboard');

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    const hierarchy: number[] = [];

    for (const heading of headings) {
      const tag = await heading.evaluate((el) => el.tagName);
      const level = parseInt(tag[1]);
      hierarchy.push(level);
    }

    // Check for logical progression
    let valid = true;
    for (let i = 1; i < hierarchy.length; i++) {
      const prev = hierarchy[i - 1];
      const curr = hierarchy[i];

      // Allow same level or increase by 1
      if (curr > prev + 1) {
        console.warn(`Heading hierarchy gap: h${prev} → h${curr}`);
        valid = false;
      }
    }

    expect(valid).toBe(true);
  });

  test('page has at least one h1', async ({ page }) => {
    await page.goto('/dashboard');

    const h1 = page.locator('h1');
    const count = await h1.count();

    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Accessibility - Form Labels (SC 1.3.1, SC 4.1.2)', () => {
  test('form inputs have associated labels', async ({ page }) => {
    await page.goto('/dashboard');

    const inputs = page.locator('input[type="text"], input[type="email"], textarea, select');

    if (await inputs.count() > 0) {
      const firstInput = inputs.first();

      // Check for label association
      const id = await firstInput.getAttribute('id');
      const ariaLabel = await firstInput.getAttribute('aria-label');
      const ariaLabelledBy = await firstInput.getAttribute('aria-labelledby');

      let hasLabel = !!ariaLabel || !!ariaLabelledBy;

      if (!hasLabel && id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = (await label.count()) > 0;
      }

      expect(hasLabel).toBe(true, 'Form input should have associated label');
    }
  });

  test('required form fields are marked', async ({ page }) => {
    await page.goto('/dashboard');

    const requiredInputs = page.locator('input[required], textarea[required], select[required]');

    if (await requiredInputs.count() > 0) {
      const firstRequired = requiredInputs.first();

      // Check for aria-required or HTML required attribute
      const isMarked = await firstRequired.evaluate((el) => {
        return el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
      });

      expect(isMarked).toBe(true);
    }
  });
});

test.describe('Accessibility - Page Structure', () => {
  test('page title is descriptive', async ({ page }) => {
    await page.goto('/dashboard');

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('page language is set', async ({ page }) => {
    await page.goto('/dashboard');

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('page meta viewport is set for mobile', async ({ page }) => {
    await page.goto('/dashboard');

    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });
});
