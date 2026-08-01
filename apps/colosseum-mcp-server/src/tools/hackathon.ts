import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCorpus } from "../services/colosseum-client.js";
import { handleError } from "../services/format.js";

const GetOverviewInputSchema = z.object({}).strict();
type GetOverviewInput = z.infer<typeof GetOverviewInputSchema>;

export function registerHackathonTools(server: McpServer): void {
  server.registerTool(
    "colosseum_get_overview",
    {
      title: "Get Colosseum Hackathon Overview",
      description: `Get the current Colosseum hackathon's name plus counts of available sponsors, RPC providers, and documentation sections. Call this first to orient yourself before using the other colosseum_* tools.

Args: none.

Returns JSON: { hackathon: { name, slug }, sponsor_count, rpc_provider_count, resource_section_count }`,
      inputSchema: GetOverviewInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (_params: GetOverviewInput) => {
      try {
        const corpus = await getCorpus();
        const output = {
          hackathon: corpus.hackathon,
          sponsor_count: corpus.sponsors.length,
          rpc_provider_count: corpus.rpcProviders.length,
          resource_section_count: corpus.resources.length,
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleError(error) }] };
      }
    }
  );
}
