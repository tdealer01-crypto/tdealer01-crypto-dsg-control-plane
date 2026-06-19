import { createStagehand, navigate, screenshot, scrape, closeStagehand } from "../src/client.js";

async function run() {
  const url = "https://tdealer01-crypto-dsg-control-plane.vercel.app";

  console.log(`🚀 Navigating to ${url}...`);

  const { stagehand, page, session } = await createStagehand();

  try {
    console.log(`📹 Session: https://browserbase.com/sessions/${session.id}`);

    await navigate(page, { url, waitUntil: "networkidle0" });
    console.log("✅ Navigation complete");

    console.log("📸 Taking screenshot...");
    await screenshot(page, { fullPage: true, path: "./dsg-homepage.png" });
    console.log("✅ Screenshot saved to dsg-homepage.png");

    console.log("🔍 Scraping page content...");
    const result = await scrape(page, {
      url,
      waitForSelector: "main",
    });
    console.log("✅ Scraped content length:", result.content?.length || 0);

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await closeStagehand(stagehand, session.id);
  }
}

run();