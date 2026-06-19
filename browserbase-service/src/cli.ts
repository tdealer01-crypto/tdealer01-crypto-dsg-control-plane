import { program } from "commander";
import { createStagehand, closeStagehand, navigate, screenshot, click, scrape, fillForm, leadGen, monitor } from "./client.js";

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
    const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey } = process.env;
    if (!projectId || !apiKey) {
      console.error("Missing BROWSERBASE_PROJECT_ID or BROWSERBASE_API_KEY");
      process.exit(1);
    }

    const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
    try {
      const result = await navigate(page, { url: options.url, waitUntil: options.waitUntil });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    } finally {
      await closeStagehand({ stagehand, page, sessionId });
    }
  });

program
  .command("screenshot")
  .description("Take a screenshot of current page")
  .requiredOption("-u, --url <url>", "URL to screenshot")
  .option("--full-page", "Full page screenshot", true)
  .option("--output <path>", "Output file path")
  .action(async (options) => {
    const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey } = process.env;
    if (!projectId || !apiKey) {
      console.error("Missing BROWSERBASE_PROJECT_ID or BROWSERBASE_API_KEY");
      process.exit(1);
    }

    const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
    try {
      await navigate(page, { url: options.url });
      const result = await screenshot(page, { fullPage: options.fullPage, path: options.output });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    } finally {
      await closeStagehand({ stagehand, page, sessionId });
    }
  });

program
  .command("click")
  .description("Click an element")
  .requiredOption("-u, --url <url>", "URL to navigate to")
  .requiredOption("-s, --selector <selector>", "CSS selector to click")
  .option("--wait-nav", "Wait for navigation after click", false)
  .action(async (options) => {
    const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey } = process.env;
    if (!projectId || !apiKey) {
      console.error("Missing BROWSERBASE_PROJECT_ID or BROWSERBASE_API_KEY");
      process.exit(1);
    }

    const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
    try {
      await navigate(page, { url: options.url });
      const result = await click(page, { selector: options.selector, waitForNavigation: options.waitNav });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    } finally {
      await closeStagehand({ stagehand, page, sessionId });
    }
  });

program
  .command("scrape")
  .description("Scrape content from a URL")
  .requiredOption("-u, --url <url>", "URL to scrape")
  .option("-s, --selector <selector>", "CSS selector to extract")
  .option("-w, --wait-selector <selector>", "Wait for selector before extracting")
  .action(async (options) => {
    const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey } = process.env;
    if (!projectId || !apiKey) {
      console.error("Missing BROWSERBASE_PROJECT_ID or BROWSERBASE_API_KEY");
      process.exit(1);
    }

    const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
    try {
      const result = await scrape(page, {
        url: options.url,
        selector: options.selector,
        waitForSelector: options.waitSelector
      });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    } finally {
      await closeStagehand({ stagehand, page, sessionId });
    }
  });

program
  .command("lead-gen")
  .description("Lead generation from a listing page")
  .requiredOption("-u, --url <url>", "Starting URL")
  .option("-l, --list-selector <selector>", "Selector for repeating item container")
  .option("--item-selectors <json>", "JSON map of field name -> selector inside item", "{}")
  .option("--max-items <number>", "Max items to collect", "20")
  .option("--follow-next", "Auto-click next page if present", false)
  .action(async (options) => {
    const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey } = process.env;
    if (!projectId || !apiKey) {
      console.error("Missing BROWSERBASE_PROJECT_ID or BROWSERBASE_API_KEY");
      process.exit(1);
    }

    const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
    try {
      await navigate(page, { url: options.url });
      const result = await leadGen(page, {
        listSelector: options.listSelector,
        itemSelectors: JSON.parse(options.itemSelectors),
        maxItems: Number(options.maxItems),
        followNext: options.followNext
      });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    } finally {
      await closeStagehand({ stagehand, page, sessionId });
    }
  });

program
  .command("monitor")
  .description("Monitor page health/readiness")
  .requiredOption("-u, --url <url>", "URL to monitor")
  .option("--check-string <text>", "Substring expected on page")
  .option("--fail-on-http-error", "Fail on HTTP errors", false)
  .action(async (options) => {
    const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey } = process.env;
    if (!projectId || !apiKey) {
      console.error("Missing BROWSERBASE_PROJECT_ID or BROWSERBASE_API_KEY");
      process.exit(1);
    }

    const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
    try {
      await navigate(page, { url: options.url });
      const result = await monitor(page, {
        checkString: options.checkString,
        failOnHttpError: options.failOnHttpError
      });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    } finally {
      await closeStagehand({ stagehand, page, sessionId });
    }
  });

program
  .command("form-fill")
  .description("Fill a form on a page")
  .requiredOption("-u, --url <url>", "URL with form")
  .requiredOption("--fields <json>", 'JSON array of {selector,value,clearFirst?}')
  .option("--submit-selector <selector>", "Submit button selector")
  .option("--wait-after-submit <state>", "Wait state after submit", "networkidle0")
  .action(async (options) => {
    const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey } = process.env;
    if (!projectId || !apiKey) {
      console.error("Missing BROWSERBASE_PROJECT_ID or BROWSERBASE_API_KEY");
      process.exit(1);
    }

    const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
    try {
      await navigate(page, { url: options.url });
      const result = await fillForm(page, {
        fields: JSON.parse(options.fields),
        submitSelector: options.submitSelector,
        waitAfterSubmit: options.waitAfterSubmit
      });
      console.log(JSON.stringify(result, null, 2));
      console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    } finally {
      await closeStagehand({ stagehand, page, sessionId });
    }
  });

program.parseAsync();
