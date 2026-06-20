<<<<<<< HEAD
export { createStagehand, closeStagehand, navigate, screenshot, click, scrape, fillForm, leadGen, monitor } from "./client.js";
export type { ServiceContext } from "./client.js";
=======
import { program } from "commander";
import { createStagehand, closeStagehand, navigate, click, screenshot, scrape, fillForm, monitor, leadGen } from "./client.js";

program
  .name("browserbase-automation")
  .description("Browserbase automation CLI for lead gen, scraping, testing, monitoring")
  .version("1.0.0");

program
  .command("navigate")
  .description("Navigate to a URL")
  .requiredOption("-u, --url <url>", "URL to navigate to")
  .option("--wait-until <state>", "Wait until state", "networkidle0")
  .action(async (options) => {
    const { stagehand, page, session } = await createStagehand();
    try {
      const result = await navigate(page, { url: options.url, waitUntil: options.waitUntil as any });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${session.id}`);
    } finally {
      await closeStagehand(stagehand, session.id);
    }
  });

program
  .command("screenshot")
  .description("Take a screenshot of current page")
  .requiredOption("-u, --url <url>", "URL to screenshot")
  .option("--full-page", "Full page screenshot", true)
  .option("--output <path>", "Output file path")
  .action(async (options) => {
    const { stagehand, page, session } = await createStagehand();
    try {
      await navigate(page, { url: options.url });
      const result = await screenshot(page, { fullPage: options.fullPage, path: options.output });
      console.log(JSON.stringify({ ok: result.ok, output: options.output || "buffer" }, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${session.id}`);
    } finally {
      await closeStagehand(stagehand, session.id);
    }
  });

program
  .command("click")
  .description("Click an element")
  .requiredOption("-u, --url <url>", "URL to navigate to")
  .requiredOption("-s, --selector <selector>", "CSS selector to click")
  .option("--wait-nav", "Wait for navigation after click", false)
  .action(async (options) => {
    const { stagehand, page, session } = await createStagehand();
    try {
      await navigate(page, { url: options.url });
      const result = await click(page, { selector: options.selector, waitForNavigation: options.waitNav });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${session.id}`);
    } finally {
      await closeStagehand(stagehand, session.id);
    }
  });

program
  .command("scrape")
  .description("Scrape content from a URL")
  .requiredOption("-u, --url <url>", "URL to scrape")
  .option("-s, --selector <selector>", "CSS selector to extract")
  .option("-w, --wait-selector <selector>", "Wait for selector before extracting")
  .action(async (options) => {
    const { stagehand, page, session } = await createStagehand();
    try {
      const result = await scrape(page, {
        url: options.url,
        selector: options.selector,
        waitForSelector: options.waitSelector,
      });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${session.id}`);
    } finally {
      await closeStagehand(stagehand, session.id);
    }
  });

program
  .command("fill-form")
  .description("Fill and submit a form")
  .requiredOption("-u, --url <url>", "URL with form")
  .requiredOption("-f, --fields <json>", "JSON object of field selectors and values")
  .option("--submit <selector>", "Submit button selector")
  .option("--wait-nav", "Wait for navigation after submit", false)
  .action(async (options) => {
    const { stagehand, page, session } = await createStagehand();
    try {
      const fields = JSON.parse(options.fields);
      const result = await fillForm(page, {
        url: options.url,
        fields,
        submitSelector: options.submit,
        waitAfterSubmit: options.waitNav,
      });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${session.id}`);
    } finally {
      await closeStagehand(stagehand, session.id);
    }
  });

program
  .command("monitor")
  .description("Monitor a page for changes")
  .requiredOption("-u, --url <url>", "URL to monitor")
  .option("-s, --selector <selector>", "CSS selector to check for changes")
  .option("-t, --text <text>", "Text to watch for in selector")
  .option("-i, --interval <ms>", "Check interval in ms", "60000")
  .option("-m, --max-checks <number>", "Maximum number of checks", "10")
  .action(async (options) => {
    const { stagehand, page, session } = await createStagehand();
    try {
      await navigate(page, { url: options.url });
      console.log(`🔍 Monitoring ${options.url} every ${options.interval}ms (max ${options.maxChecks} checks)`);
      const result = await monitor(page, {
        url: options.url,
        checkSelector: options.selector,
        checkText: options.checkText,
        intervalMs: parseInt(options.interval),
        maxChecks: parseInt(options.maxChecks),
        onChange: async (data) => {
          console.log(`🔄 Change detected!`, data);
        },
      });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${session.id}`);
    } finally {
      await closeStagehand(stagehand, session.id);
    }
  });

program
  .command("lead-gen")
  .description("Extract leads from URLs")
  .requiredOption("-u, --urls <urls>", "Comma-separated URLs")
  .requiredOption("-f, --fields <json>", "JSON array of field selectors to extract")
  .option("--next-selector <selector>", "Next page button selector for pagination")
  .option("--max-pages <number>", "Maximum pages per URL", "3")
  .action(async (options) => {
    const { stagehand, page, session } = await createStagehand();
    try {
      const urls = options.urls.split(",").map(u => u.trim());
      const fields = JSON.parse(options.fields);
      const result = await leadGen(page, {
        urls,
        extractFields: fields,
        pagination: options.nextSelector ? { nextSelector: options.nextSelector, maxPages: parseInt(options.maxPages) } : undefined,
      });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${session.id}`);
    } finally {
      await closeStagehand(stagehand, session.id);
    }
  });

program.parse();
>>>>>>> origin/main
