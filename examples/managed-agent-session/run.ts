/**
 * Minimal Anthropic Managed Agents client (beta Sessions API).
 *
 * Flow:
 *   1. Create a session against an EXISTING agent + environment.
 *      (model / system / tools live on the agent — never on the session;
 *       the agent is created once, out of band, and referenced by ID here.)
 *   2. Open the SSE event stream BEFORE sending the kickoff (stream-first,
 *      so no early events are missed).
 *   3. Send a user.message event.
 *   4. Print agent.message text as it streams.
 *   5. Finish on session.status_idle with a terminal stop_reason, or on
 *      session.status_terminated. Exit cleanly on session.error / API errors.
 *
 * Requirements:
 *   - ANTHROPIC_API_KEY in the environment.
 *   - A build of @anthropic-ai/sdk that exposes `client.beta.sessions.*`
 *     (Managed Agents beta, header managed-agents-2026-04-01). NOTE: the parent
 *     repo pins @anthropic-ai/sdk ^0.27.3, which predates this API — install a
 *     current SDK in this example's own context (see README.md). This file is
 *     outside the Next.js tsconfig `include`, so it does not affect the app build.
 *
 * Run:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx run.ts "your prompt here"
 */
import Anthropic from "@anthropic-ai/sdk";

const AGENT_ID = "agent_01GQMdFQNgMFzG9h3kJxqyWA";
const ENVIRONMENT_ID = "env_01CwCpLqUQhxb99xCVXHBQ7t";

async function main(): Promise<void> {
  // Reads ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) from the environment.
  const client = new Anthropic();

  const prompt =
    process.argv.slice(2).join(" ").trim() ||
    "Hello! Briefly introduce yourself and what you can do.";

  // 1. Create the session. `agent` as a bare string uses the agent's latest
  //    version; pass { type: "agent", id, version } to pin a version instead.
  const session = await client.beta.sessions.create({
    agent: AGENT_ID,
    environment_id: ENVIRONMENT_ID,
    title: "minimal-session",
  });

  // Diagnostics go to stderr so stdout stays clean for the agent's text.
  console.error(`session:  ${session.id}`);
  console.error(
    `watch:    https://platform.claude.com/workspaces/default/sessions/${session.id}`,
  );
  console.error(`prompt:   ${prompt}\n`);

  // 2. Stream-first: open the stream, THEN send the kickoff message.
  const stream = await client.beta.sessions.events.stream(session.id);

  // 3. Send the user message.
  await client.beta.sessions.events.send(session.id, {
    events: [{ type: "user.message", content: [{ type: "text", text: prompt }] }],
  });

  // 4. Consume the event stream.
  for await (const event of stream) {
    switch (event.type) {
      case "agent.message": {
        // Print only text blocks as they arrive.
        for (const block of event.content) {
          if (block.type === "text") process.stdout.write(block.text);
        }
        break;
      }

      case "session.error": {
        process.stdout.write("\n");
        console.error(`[session error] ${event.error?.message ?? "unknown error"}`);
        process.exitCode = 1;
        return; // exit cleanly
      }

      case "session.status_terminated": {
        process.stdout.write("\n");
        console.error("[session terminated]");
        return;
      }

      case "session.status_idle": {
        // The session also goes idle transiently — e.g. while it waits on a
        // tool confirmation or a custom-tool result. Only finish on a terminal
        // stop_reason; keep listening when the agent requires further action.
        if (event.stop_reason?.type === "requires_action") break;
        process.stdout.write("\n");
        console.error(`[done] stop_reason=${event.stop_reason?.type ?? "n/a"}`);
        return;
      }

      default:
        break;
    }
  }
}

main().catch((err: unknown) => {
  if (err instanceof Anthropic.APIError) {
    console.error(`\nAPI error ${err.status}: ${err.message}`);
  } else {
    console.error("\n", err);
  }
  process.exit(1);
});
