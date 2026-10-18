# ROM DOM Recording Guide

## Overview

This guide explains how to record new ROM DOM snapshots for the DSG Hybrid Agent.

## Prerequisites

```bash
# Install Playwright
npm install -D playwright
npx playwright install chromium
```

## Recording Script

Create `scripts/record-rom.ts`:

```typescript
import { chromium, Page } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

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
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for manual interaction if needed
  if (authRequired) {
    console.log('Please log in manually in the browser window...');
    console.log('Press Enter when logged in and on target page...');
    await new Promise(r => process.stdin.once('data', r));
  }

  // Extract semantic selectors
  const snapshot = await page.evaluate(() => {
    // Find all forms
    const forms = Array.from(document.forms).map(form => {
      const fields = Array.from(form.elements)
        .filter(el => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
        .map((input: Element) => ({
          name: input.getAttribute('name') || '',
          type: input.getAttribute('type') || 'text',
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

    document.querySelectorAll('button, a[href], input, select, textarea').forEach((el, i) => {
      if (el.id) {
        const semanticName = el.id.replace(/-/g, '_');
        selectors[semanticName] = `#${el.id}`;
      }
      if (el.tagName === 'BUTTON') {
        const name = el.id || `btn_${i}`;
        selectors[name] = `#${el.id}`;
        actions.push({
          name: `click_${name}`,
          type: 'click',
          target: name,
          description: `Click ${el.textContent?.trim() || name}`
        });
      }
    });

    return { forms, selectors, actions };
  });

  const fullSnapshot: DOMSnapshot = {
    url,
    html: await page.content(),
    selectors: snapshot.selectors,
    forms: snapshot.forms,
    actions: snapshot.actions,
    authRequired,
    simulationRules: [],
    browserActions: {}
  };

  // Save to file
  const outputPath = join(process.cwd(), 'src', 'rom-dom', `${pageKey}.json`);
  writeFileSync(outputPath, JSON.stringify(fullSnapshot, null, 2));
  console.log(`Saved to ${outputPath}`);

  await browser.close();
}

// Usage: npx tsx scripts/record-rom.ts login "https://.../password-login" true
const [pageKey, url, authRequired] = process.argv.slice(2);
if (!pageKey || !url) {
  console.error('Usage: npx tsx record-rom.ts <pageKey> <url> [authRequired]');
  process.exit(1);
}

recordPage(pageKey, url, authRequired === 'true').catch(console.error);
```

## Usage

```bash
# Record public page
npx tsx scripts/record-rom.ts landing "https://tdealer01-crypto-dsg-control-plane.vercel.app/"

# Record protected page (will pause for manual login)
npx tsx scripts/record-rom.ts hermes-dashboard "https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/hermes" true
```

## Post-Recording

1. Edit the generated JSON to add:
   - Semantic action names
   - Simulation rules
   - Browser action details
   - Form validation rules

2. Add imports to `src/rom-dom/registry.ts`

3. Test with hybrid API:
   ```bash
   curl -X POST /api/agent/hybrid -d '{"goal":"test","mode":"sim-only","steps":[{"type":"navigate","rom":"<pageKey>"}]}'
   ```