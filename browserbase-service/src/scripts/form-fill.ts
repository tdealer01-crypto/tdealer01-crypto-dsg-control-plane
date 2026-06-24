import { createStagehand, closeStagehand, navigate, click } from "../client.js";
import { FormFillSchema } from "../schemas.js";

export async function runFormFill() {
  const { BROWSERBASE_PROJECT_ID: projectId, BROWSERBASE_API_KEY: apiKey, START_URL, FIELDS, SUBMIT_SELECTOR } = process.env;
  if (!projectId || !apiKey || !START_URL || !FIELDS) {
    console.error("Missing required env: BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, START_URL, FIELDS");
    process.exit(1);
  }

  const input = FormFillSchema.parse({
    url: START_URL,
    fields: JSON.parse(FIELDS),
    submitSelector: SUBMIT_SELECTOR || undefined
  });

  const { stagehand, page, sessionId } = await createStagehand(projectId, apiKey);
  try {
    await navigate(page, { url: input.url });
    const result = await click(page, { selector: input.submitSelector ?? input.fields[input.fields.length - 1].selector });
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n📹 Recording: https://browserbase.com/sessions/${sessionId}`);
    process.exit(result.url ? 0 : 1);
  } finally {
    await closeStagehand({ stagehand, page, sessionId });
  }
}

runFormFill();
