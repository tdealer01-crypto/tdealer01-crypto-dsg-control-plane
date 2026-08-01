/**
 * End-to-end smoke test: spawns the built server exactly as a real MCP
 * client would, over stdio, and calls every tool with real arguments.
 * Run with `npm run smoke-test` (builds first).
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  // Passing the full parent env here (including any HTTPS_PROXY) so this
  // smoke test can reach the network from behind a proxy. Real MCP clients
  // only pass a safe default subset unless a config explicitly adds more —
  // see the README's "Behind a proxy" section.
  env: process.env,
});

const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("=== TOOLS ===");
for (const t of tools.tools) {
  console.log(`- ${t.name}: ${t.title}`);
}

console.log("\n=== colosseum_get_overview ===");
const overview = await client.callTool({ name: "colosseum_get_overview", arguments: {} });
console.log(overview.content[0].text);

console.log("\n=== colosseum_list_sponsors (tag=privacy) ===");
const sponsors = await client.callTool({
  name: "colosseum_list_sponsors",
  arguments: { tag: "privacy" },
});
console.log(sponsors.content[0].text);

console.log("\n=== colosseum_get_sponsor (slug=arcium) ===");
const sponsor = await client.callTool({
  name: "colosseum_get_sponsor",
  arguments: { slug: "arcium" },
});
console.log(sponsor.content[0].text.slice(0, 500) + "...[truncated for test output]");

console.log("\n=== colosseum_search_sponsors (query=treasury) ===");
const search = await client.callTool({
  name: "colosseum_search_sponsors",
  arguments: { query: "treasury" },
});
console.log(search.content[0].text);

console.log("\n=== colosseum_list_rpc_providers ===");
const rpc = await client.callTool({ name: "colosseum_list_rpc_providers", arguments: {} });
console.log(rpc.content[0].text.slice(0, 500) + "...[truncated for test output]");

console.log("\n=== colosseum_list_resources (path=build-paths) ===");
const resources = await client.callTool({
  name: "colosseum_list_resources",
  arguments: { path: "build-paths" },
});
console.log(resources.content[0].text);

console.log("\n=== colosseum_get_resource (id=defi-stablecoins) ===");
const resource = await client.callTool({
  name: "colosseum_get_resource",
  arguments: { id: "defi-stablecoins" },
});
console.log(resource.content[0].text.slice(0, 500) + "...[truncated for test output]");

console.log("\n=== Error handling: colosseum_get_sponsor (slug=nonexistent) ===");
const errTest = await client.callTool({
  name: "colosseum_get_sponsor",
  arguments: { slug: "nonexistent-sponsor-xyz" },
});
console.log(errTest.content[0].text);

await client.close();
console.log("\n=== DONE ===");
