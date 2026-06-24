import { createStagehand, navigate, screenshot, leadGen, closeStagehand } from "../src/client.js";

async function run() {
  const urls = [
    "https://github.com/trending",
    "https://news.ycombinator.com",
  ];

  const { stagehand, page, session } = await createStagehand();

  try {
    console.log(`📹 Session: https://browserbase.com/sessions/${session.id}`);

    const result = await leadGen(page, {
      urls,
      extractFields: [
        "h1",
        "h2",
        "h3",
        ".post-title",
        ".story-title",
        "article h2",
      ],
      pagination: {
        nextSelector: "a[rel='next']",
        maxPages: 2,
      },
    });

    console.log("📋 Extracted leads:", JSON.stringify(result.leads, null, 2));
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await closeStagehand(stagehand, session.id);
  }
}