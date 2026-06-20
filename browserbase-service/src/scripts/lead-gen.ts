import { createStagehand, closeStagehand, navigate, leadGen, scrape, monitor } from "../client.js";
import { LeadGenSchema } from "../schemas.js";

export async function runLeadGen() {
  const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey, START_URL, LIST_SELECTOR, ITEM_SELECTORS, MAX_ITEMS } = process.env;
  if (!projectId || !apiKey || !START_URL) {
    console.error("Missing required env: BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, START_URL");
    process.exit(1);
  }

  const input = LeadGenSchema.parse({
    startUrl: START_URL,
    listSelector: LIST_SELECTOR,
    itemSelectors: ITEM_SELECTORS ? JSON.parse(ITEM_SELECTORS) : undefined,
    maxItems: MAX_ITEMS ? Number(MAX_ITEMS) : undefined
  });

  const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
  try {
    await navigate(page, { url: input.startUrl });
    const result = await leadGen(page, input);
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    process.exit(result.ok ? 0 : 1);
  } finally {
    await closeStagehand({ stagehand, page, sessionId });
  }
}

runLeadGen();
