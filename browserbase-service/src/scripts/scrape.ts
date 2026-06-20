import { createStagehand, closeStagehand, navigate, scrape } from "../client.js";
import { ScrapeSchema } from "../schemas.js";

export async function runScrape() {
  const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey, START_URL, SELECTOR, WAIT_SELECTOR } = process.env;
  if (!projectId || !apiKey || !START_URL) {
    console.error("Missing required env: BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, START_URL");
    process.exit(1);
  }

  const input = ScrapeSchema.parse({
    url: START_URL,
    selector: SELECTOR,
    waitForSelector: WAIT_SELECTOR
  });

  const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
  try {
    await navigate(page, { url: input.url });
    const result = await scrape(page, input);
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    process.exit(result.length ? 0 : 1);
  } finally {
    await closeStagehand({ stagehand, page, sessionId });
  }
}

runScrape();
