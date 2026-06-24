<<<<<<< HEAD
import { Stagehand } from "@browserbasehq/stagehand";
import type { Page } from "@playwright/test";

export type ServiceContext = {
  stagehand: Stagehand;
  page: Page;
  sessionId: string;
};

export async function createStagehand(projectId?: string, apiKey?: string, sessionId?: string): Promise<ServiceContext> {
  if (!projectId || !apiKey) {
    throw new Error("BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY are required");
  }

  const stagehand = new Stagehand({
    projectId,
    apiKey,
    sessionId
=======
import { Browserbase } from "@browserbasehq/sdk";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY || "";
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID || "";

if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
  console.warn("⚠️  BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID not set in environment");
}

export const browserbase = new Browserbase({
  apiKey: BROWSERBASE_API_KEY,
});

export interface BrowserbaseSessionConfig {
  projectId?: string;
  browserSettings?: {
    context?: { id?: string; persist?: boolean };
    viewport?: { width: number; height: number };
  };
  proxies?: boolean;
}

export async function createSession(config: BrowserbaseSessionConfig = {}) {
  return browserbase.sessions.create({
    projectId: config.projectId || BROWSERBASE_PROJECT_ID,
    browserSettings: {
      context: config.browserSettings?.context || { persist: false },
      viewport: config.browserSettings?.viewport || { width: 1280, height: 720 },
    },
    ...(config.proxies && { proxies: true }),
  });
}

export interface StagehandConfig extends BrowserbaseSessionConfig {
  model?: string;
  systemPrompt?: string;
}

export async function createStagehand(config: StagehandConfig = {}) {
  const session = await createSession(config);

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    browserbaseSessionCreateParams: {
      browserSettings: config.browserSettings,
      proxies: config.proxies,
    },
    model: config.model || "anthropic/claude-sonnet-4-6",
    modelClientOptions: {
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    },
>>>>>>> origin/main
  });

  await stagehand.init();

  return {
    stagehand,
<<<<<<< HEAD
    page: stagehand.page,
    sessionId: stagehand.session.id
  };
}

export async function closeStagehand(ctx: ServiceContext): Promise<void> {
  await ctx.stagehand.close().catch(() => {});
}

export async function navigate(page: Page, input: { url: string; waitUntil?: string }) {
  const resolved = input.waitUntil ?? "networkidle0";
  await page.goto(input.url, {
    waitUntil: resolved as any,
    timeout: 45000
  });

  return {
    url: page.url(),
    title: await page.title().catch(() => "")
  };
}

export async function screenshot(page: Page, input: { fullPage?: boolean; path?: string }) {
  const fullPage = input.fullPage ?? true;
  const path = input.path ?? `/tmp/dsg-browserbase-${Date.now()}.png`;
  await page.screenshot({ path, fullPage });
  return { ok: true, output: path };
}

export async function click(page: Page, input: { selector: string; waitForNavigation?: boolean }) {
  await page.waitForSelector(input.selector, { timeout: 20000 });
  await page.click(input.selector);

  if (input.waitForNavigation) {
    await page.waitForLoadState("networkidle0").catch(() => {});
  }

  return {
    url: page.url(),
    title: await page.title().catch(() => "")
  };
}

export async function scrape(page: Page, input: { selector?: string; waitForSelector?: string }) {
  if (input.waitForSelector) {
    await page.waitForSelector(input.waitForSelector, { timeout: 20000 }).catch(() => {});
  }

  const target =
    input.selector && (await page.waitForSelector(input.selector, { timeout: 20000 }).catch(() => null)) ||
    page.locator("body").first();

  const text = await target
    .locator("*")
    .evaluateAll((els: Element[]) => els.map((el) => el.textContent?.trim() ?? "").join("\n"))
    .catch(() => "");

  return {
    url: page.url(),
    length: text.length,
    text: text.slice(0, 8000)
  };
}

export async function fillForm(page: Page, input: { fields: { selector: string; value: string; clearFirst?: boolean }[]; submitSelector?: string; waitAfterSubmit?: string }) {
  const results: Array<{ selector: string; ok: boolean; error?: string }> = [];

  for (const field of input.fields) {
    try {
      await page.waitForSelector(field.selector, { timeout: 15000 });
      const el = page.locator(field.selector).first();

      if (field.clearFirst) {
        await el.fill("");
      }

      await el.fill(field.value);
      results.push({ selector: field.selector, ok: true });
    } catch (error: any) {
      results.push({ selector: field.selector, ok: false, error: error?.message ?? "unknown" });
    }
  }

  if (input.submitSelector) {
    await click(page, { selector: input.submitSelector, waitForNavigation: Boolean(input.waitAfterSubmit) });
  } else if (input.waitAfterSubmit) {
    await page.waitForLoadState(input.waitAfterSubmit as any).catch(() => {});
  }

  return { fields: results };
}

export async function leadGen(page: Page, input: { listSelector?: string; itemSelectors?: Record<string, string>; maxItems?: number; followNext?: boolean }) {
  const maxItems = input.maxItems ?? 20;
  const items: Record<string, unknown>[] = [];

  if (!input.listSelector) {
    return { ok: false, error: "listSelector is required", items };
  }

  await page.waitForSelector(input.listSelector, { timeout: 20000 }).catch(() => {});

  const rows = page.locator(input.listSelector);
  const count = Math.min(await rows.count(), maxItems);

  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    const entry: Record<string, string> = {};

    if (input.itemSelectors) {
      for (const [key, selector] of Object.entries(input.itemSelectors)) {
        const raw = await row.locator(selector).first().textContent().catch(() => "");
        entry[key] = (raw ?? "").trim();
      }
    }

    items.push(entry);
  }

  let followed = false;
  if (input.followNext) {
    const next = page.locator('a:has-text("Next"), a:has-text("›"), [rel="next"], button:has-text("Next")').first();
    if ((await next.count()) > 0) {
      followed = true;
      await next.click().catch(() => {});
    }
  }

  return { ok: items.length > 0, url: page.url(), items, count: items.length, followedNext: followed };
}

export async function monitor(page: Page, input: { checkString?: string; failOnHttpError?: boolean }) {
  const result = await page.evaluate(() => {
    const ready = document.readyState;
    const title = document.title;
    const bodyLength = document.body.textContent?.length ?? 0;
    return { ready, title, bodyLength };
  });

  const status = !input.failOnHttpError ? "ok" : "ok";
  const matched = typeof input.checkString === "string" && result.title.includes(input.checkString);

  return {
    url: page.url(),
    status,
    matched,
    ...result
  };
}
=======
    session,
    page: stagehand.context.pages()[0],
  };
}

export async function closeStagehand(stagehand: Stagehand, sessionId: string) {
  try {
    await stagehand.close();
  } catch (e) {
    console.error("Error closing Stagehand:", e);
  }
}

export async function getSessionRecordingUrl(sessionId: string) {
  return `https://browserbase.com/sessions/${sessionId}`;
}

export interface NavigateOptions {
  url: string;
  waitUntil?: "networkidle0" | "domcontentloaded" | "load" | "networkidle2";
  timeout?: number;
}

export async function navigate(page: any, options: NavigateOptions) {
  await page.goto(options.url, {
    waitUntil: options.waitUntil || "networkidle0",
    timeout: options.timeout || 30000,
  });
  return { ok: true, url: page.url() };
}

export interface ClickOptions {
  selector: string;
  waitForNavigation?: boolean;
  timeout?: number;
}

export async function click(page: any, options: ClickOptions) {
  await page.waitForSelector(options.selector, { timeout: options.timeout || 10000 });

  if (options.waitForNavigation) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click(options.selector),
    ]);
  } else {
    await page.click(options.selector);
  }
  return { ok: true };
}

export interface TypeOptions {
  selector: string;
  text: string;
  delay?: number;
  clearFirst?: boolean;
}

export async function typeText(page: any, options: TypeOptions) {
  await page.waitForSelector(options.selector, { timeout: 10000 });

  if (options.clearFirst) {
    await page.locator(options.selector).fill("");
  }

  await page.type(options.selector, options.text, { delay: options.delay || 50 });
  return { ok: true };
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  type?: "png" | "jpeg";
  quality?: number;
  path?: string;
}

export async function screenshot(page: any, options: ScreenshotOptions = {}) {
  const buffer = await page.screenshot({
    fullPage: options.fullPage || true,
    type: options.type || "png",
    quality: options.quality,
    path: options.path,
  });
  return { ok: true, buffer, base64: buffer.toString("base64") };
}

export interface ScrapeOptions {
  url: string;
  selector?: string;
  waitForSelector?: string;
  extract?: (page: any) => Promise<any>; // custom extraction function
}

export async function scrape(page: any, options: ScrapeOptions) {
  await navigate({ page, url: options.url });

  if (options.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
  }

  if (options.selector) {
    const element = await page.locator(options.selector);
    const html = await element.innerHTML();
    return { ok: true, html };
  } else if (options.extract) {
    return { ok: true, data: await options.extract(page) };
  } else {
    const content = await page.content();
    return { ok: true, content };
  }
}

export interface FormFillOptions {
  fields: Record<string, string>;
  submitSelector?: string;
  waitAfterSubmit?: boolean;
}

export async function fillForm(page: any, options: FormFillOptions) {
  for (const [selector, value] of Object.entries(options.fields)) {
    await typeText(page, { selector, text: value, clearFirst: true });
  }

  if (options.submitSelector) {
    await click(page, { selector: options.submitSelector, waitForNavigation: options.waitAfterSubmit });
  }
  return { ok: true };
}

export interface MonitorOptions {
  url: string;
  checkSelector?: string;
  checkText?: string;
  intervalMs?: number;
  maxChecks?: number;
  onChange?: (data: any) => Promise<void>;
}

export async function monitor(page: any, options: MonitorOptions) {
  const interval = options.intervalMs || 60000;
  const maxChecks = options.maxChecks || Infinity;
  let checkCount = 0;
  let lastData: any = null;

  console.log(`🔍 Starting monitor for ${options.url} (interval: ${interval}ms)`);

  while (checkCount < maxChecks) {
    checkCount++;
    await navigate({ page, url: options.url });

    let currentData: any;

    if (options.checkSelector) {
      const element = await page.locator(options.checkSelector).first();
      currentData = await element.innerText();
    } else {
      const content = await page.content();
      currentData = content;
    }

    if (options.checkText && options.checkSelector) {
      currentData = currentData.includes(options.checkText);
    }

    if (lastData !== null && currentData !== lastData) {
      console.log(`🔄 Change detected at check #${checkCount}`);
      if (options.onChange) {
        await options.onChange({ previous: lastData, current: currentData, checkCount });
      }
      lastData = currentData;
    }

    if (checkCount >= maxChecks) break;
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return { ok: true, checks: checkCount };
}

export interface LeadGenOptions {
  urls: string[];
  extractFields: string[];
  pagination?: { nextSelector: string; maxPages?: number };
}

export async function leadGen(page: any, options: LeadGenOptions) {
  const results: any[] = [];

  for (const url of options.urls) {
    await navigate({ page, url: options.url });

    const data = await page.evaluate((fields) => {
      const result: Record<string, string> = {};
      fields.forEach(field => {
        const element = document.querySelector(field) || document.querySelector(`[data-${field}]`);
        if (element) result[field] = element.textContent?.trim() || "";
      });
      return result;
    }, options.extractFields);

    results.push({ url, data });

    if (options.pagination?.nextSelector && options.pagination.maxPages && options.pagination.maxPages > 1) {
      const maxPages = options.pagination.maxPages;
      for (let i = 1; i < maxPages; i++) {
        const nextBtn = await page.locator(options.pagination.nextSelector).first();
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForLoadState("networkidle");
          const pageData = await page.evaluate((fields) => {
            const result: Record<string, string> = {};
            fields.forEach(field => {
              const element = document.querySelector(field) || document.querySelector(`[data-${field}]`);
              if (element) result[field] = element.textContent?.trim() || "";
            });
            return result;
          }, options.extractFields);
          results.push({ url: page.url(), data: pageData });
        } else {
          break;
        }
      }
    }
  }

  return { ok: true, leads: results };
}
>>>>>>> origin/main
