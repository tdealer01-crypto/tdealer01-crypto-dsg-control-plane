import { createStagehand, closeStagehand, navigate, screenshot } from "../client.js";
import { ScreenshotSchema } from "../schemas.js";

export async function runScreenshot() {
  const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey, START_URL, OUTPUT } = process.env;
  if (!projectId || !apiKey || !START_URL) {
    console.error("Missing required env: BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, START_URL");
    process.exit(1);
  }

  const input = ScreenshotSchema.parse({
    url: START_URL,
    fullPage: true,
    output: OUTPUT || undefined
  });

  const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
  try {
    await navigate(page, { url: input.url });
    const result = await screenshot(page, { fullPage: input.fullPage, path: input.output });
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    process.exit(result.ok ? 0 : 1);
  } finally {
    await closeStagehand({ stagehand, page, sessionId });
  }
}

runScreenshot();
