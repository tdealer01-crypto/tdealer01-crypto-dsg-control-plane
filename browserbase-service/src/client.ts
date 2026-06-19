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
  });

  await stagehand.init();

  return {
    stagehand,
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
