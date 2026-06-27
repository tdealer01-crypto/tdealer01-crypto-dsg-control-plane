import { createStagehand, navigate, fillForm, closeStagehand } from "../src/client.js";

async function run() {
  const { stagehand, page, session } = await createStagehand();

  try {
    console.log(`📹 Session: https://browserbase.com/sessions/${session.id}`);

    await navigate(page, { url: "https://example.com/login" });

    await fillForm(page, {
      fields: {
        "input[name='email']": "test@example.com",
        "input[name='password']": "testpassword123",
      },
      submitSelector: "button[type='submit']",
      waitAfterSubmit: true,
    });

    console.log("✅ Form submitted successfully");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await closeStagehand(stagehand, session.id);
  }
}