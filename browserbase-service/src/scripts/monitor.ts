import { createStagehand, closeStagehand, navigate, monitor } from "../client.js";
import { MonitorSchema } from "../schemas.js";

export async function runMonitor() {
  const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey, START_URL, CHECK_STRING } = process.env;
  if (!projectId || !apiKey || !START_URL) {
    console.error("Missing required env: BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, START_URL");
    process.exit(1);
  }

  const input = MonitorSchema.parse({
    url: START_URL,
    checkString: CHECK_STRING || undefined
  });

  const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
  try {
    await navigate(page, { url: input.url });
    const result = await monitor(page, input);
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    process.exit(result.status === "ok" ? 0 : 1);
  } finally {
    await closeStagehand({ stagehand, page, sessionId });
  }
}

runMonitor();
