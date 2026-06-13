#!/usr/bin/env npx tsx
// Record ROM DOM snapshot
// Usage: npx tsx scripts/record-rom.ts <pageKey> <url> [requiresAuth]

import { chromium, Page } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DOMSnapshot {
  url: string;
  html: string;
  selectors: Record<string, string>;
  forms: FormSpec[];
  actions: ActionSpec[];
  authRequired: boolean;
  simulationRules: SimRule[];
  browserActions: BrowserActions;
}

interface FormSpec {
  name: string;
  action: string;
  method: string;
  fields: FieldSpec[];
  submitSelector: string;
  successIndicators: string[];
  errorIndicators?: string[];
}

interface FieldSpec {
  name: string;
  type: string;
  required: boolean;
  selector: string;
  label?: string;
}

interface ActionSpec {
  name: string;
  type: 'click' | 'type' | 'extract' | 'wait' | 'navigate' | 'api-call';
  target: string;
  description: string;
  waitFor?: string;
  timeout?: number;
}

interface SimRule {
  trigger: string;
  condition?: string;
  conditions?: Record<string, any>;
  outcome: 'success' | 'redirect' | 'error';
  result?: any;
  redirectUrl?: string;
  nextSteps?: string[];
  errorMessage?: string;
}

interface BrowserActions {
  goto?: { url: string; waitUntil?: string; timeout?: number };
  fill?: Array<{ selector: string; value: string; delay?: number }>;
  click?: { selector: string; waitForNavigation?: boolean; waitForSelector?: string; timeout?: number };
  waitFor?: { selector: string; state?: 'visible' | 'hidden' | 'attached' | 'detached' | 'url'; timeout?: number };
  extract?: Record<string, string>;
  navigate?: Record<string, string>;
  api?: { method: string; url: string; headers?: Record<string, string>; body?: any; expectedStatus?: number | number[]; baseUrl?: string; endpoints?: Record<string, string> };
}

async function recordPage(pageKey: string, url: string, authRequired: boolean = false) {
  console.log(`📸 Recording ROM DOM: ${pageKey}`);
  console.log(`   URL: ${url}`);
  console.log(`   Auth required: ${authRequired}`);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    if (authRequired) {
      console.log(`\n🔐 Please log in manually in the browser window...`);
      console.log(`   Navigate to the target page after login.`);
      console.log(`   Press Enter in this terminal when ready...`);
      await new Promise(resolve => process.stdin.once('data', resolve));
      await page.waitForLoadState('networkidle');
    }

    // Extract semantic data
    const snapshot = await page.evaluate(() => {
      // Find all forms
      const forms = Array.from(document.forms).map(form => {
        const fields = Array.from(form.elements)
          .filter(el => (el as HTMLInputElement).tagName === 'INPUT' ||
                        (el as HTMLTextAreaElement).tagName === 'TEXTAREA' ||
                        (el as HTMLSelectElement).tagName === 'SELECT')
          .map((input: Element) => ({
            name: input.getAttribute('name') || '',
            type: (input as HTMLInputElement).type || 'text',
            required: input.hasAttribute('required'),
            selector: `#${input.id}` || `[name="${input.getAttribute('name')}"]`,
            label: input.getAttribute('placeholder') || input.getAttribute('aria-label') || ''
          }));

        return {
          name: form.name || form.id || 'unnamed',
          action: form.action || window.location.pathname,
          method: form.method || 'POST',
          fields,
          submitSelector: 'button[type="submit"]',
          successIndicators: [],
          errorIndicators: []
        };
      });

      // Find all interactive elements
      const selectors: Record<string, string> = {};
      const actions: ActionSpec[] = [];

      const clickable = document.querySelectorAll('button, a[href], [role="button"], [onclick]');
      clickable.forEach((el, i) => {
        const name = (el as HTMLElement).id || `element_${i}`;
        const semantic = name.replace(/-/g, '_');
        selectors[semantic] = `#${name}`;

        if ((el as HTMLElement).tagName === 'BUTTON' || (el as HTMLElement).tagName === 'A') {
          actions.push({
            name: `click_${semantic}`,
            type: 'click',
            target: semantic,
            description: `Click ${(el as HTMLElement).textContent?.trim() || name}`
          });
        }
      });

      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((el, i) => {
        const name = (el as HTMLElement).id || `input_${i}`;
        const semantic = name.replace(/-/g, '_');
        if (!selectors[semantic]) {
          selectors[semantic] = `#${name}`;
        }
        actions.push({
          name: `fill_${semantic}`,
          type: 'type',
          target: semantic,
          description: `Fill ${(el as HTMLInputElement).placeholder || semantic}`
        });
      });

      return { forms, selectors, actions };
    });

    const finalUrl = page.url();
    const html = await page.content();

    const fullSnapshot: DOMSnapshot = {
      url: finalUrl,
      html,
      selectors: snapshot.selectors,
      forms: snapshot.forms,
      actions: snapshot.actions,
      authRequired,
      simulationRules: [],
      browserActions: {}
    };

    // Save to file
    const outputDir = join(process.cwd(), 'src', 'rom-dom');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = join(outputDir, `${pageKey}.json`);
    writeFileSync(outputPath, JSON.stringify(fullSnapshot, null, 2));
    console.log(`\n✅ Saved to ${outputPath}`);
    console.log(`   Selectors: ${Object.keys(snapshot.selectors).length}`);
    console.log(`   Forms: ${snapshot.forms.length}`);
    console.log(`   Actions: ${snapshot.actions.length}`);

    // Print selector summary
    console.log('\n📋 Selectors found:');
    for (const [key, selector] of Object.entries(snapshot.selectors)) {
      console.log(`   ${key}: ${selector}`);
    }

    await browser.close();
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(`
Usage: npx tsx scripts/record-rom.ts <pageKey> <url> [requiresAuth]

Examples:
  npx tsx scripts/record-rom.ts landing "https://example.com/"
  npx tsx scripts/record-rom.ts login "https://example.com/login" true
  npx tsx scripts/record-rom.ts dashboard "https://example.com/dashboard" true
`);
  process.exit(1);
}

const [pageKey, url, authRequired] = args;
recordPage(pageKey, url, authRequired === 'true')
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Recording failed:', err);
    process.exit(1);
  });