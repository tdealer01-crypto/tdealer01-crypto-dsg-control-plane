import { createStagehand, navigate, monitor, closeStagehand } from "../src/client.js";

async function run() {
  const { stagehand, page, session } = await createStagehand();

  try {
    console.log(`📹 Session: https://browserbase.com/sessions/${session.id}`);
    console.log("🔍 Monitoring Vercel deployment status...");

    await navigate(page, { url: "https://vercel.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/deployments" });

    const result = await monitor(page, {
      url: "https://vercel.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/deployments",
      checkSelector: "[data-testid='deployment-status']",
      intervalMs: 30000,
      maxChecks: 5,
      onChange: async (data) => {
        console.log(`🔄 Status changed!`, data);
      },
    });

    console.log("✅ Monitoring complete:", result);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await closeStagehand(stagehand, session.id);
  }
}