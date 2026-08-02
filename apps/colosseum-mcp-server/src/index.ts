#!/usr/bin/env node
/**
 * MCP server exposing the Colosseum Solana hackathon resource corpus
 * (sponsor tools, RPC providers, build-path documentation) as tools.
 *
 * Data source is public JSON with no authentication, so this server needs
 * no API keys or setup — it works immediately over stdio.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerHackathonTools } from "./tools/hackathon.js";
import { registerSponsorTools } from "./tools/sponsors.js";
import { registerRpcProviderTools } from "./tools/rpc-providers.js";
import { registerResourceTools } from "./tools/resources.js";

const server = new McpServer({
  name: "colosseum-mcp-server",
  version: "1.0.0",
});

registerHackathonTools(server);
registerSponsorTools(server);
registerRpcProviderTools(server);
registerResourceTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("colosseum-mcp-server running via stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
