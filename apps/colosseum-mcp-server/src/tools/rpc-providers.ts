import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCorpus } from "../services/colosseum-client.js";
import { handleError } from "../services/format.js";

const ListRpcProvidersInputSchema = z.object({}).strict();
type ListRpcProvidersInput = z.infer<typeof ListRpcProvidersInputSchema>;

export function registerRpcProviderTools(server: McpServer): void {
  server.registerTool(
    "colosseum_list_rpc_providers",
    {
      title: "List Colosseum RPC/Infra Providers",
      description: `List Solana RPC and infrastructure providers offering hackathon deals (e.g. discounted plans), with their description and offer terms.

Args: none.

Returns JSON: { total: number, providers: [{ name, description, offer, links: [{label, url}] }] }

Examples:
  - Use when: "What RPC providers offer hackathon discounts?" -> call with no args
  - Use when: choosing an RPC provider for a project that needs reliable reads/writes or event streaming`,
      inputSchema: ListRpcProvidersInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (_params: ListRpcProvidersInput) => {
      try {
        const corpus = await getCorpus();
        const output = {
          total: corpus.rpcProviders.length,
          providers: corpus.rpcProviders,
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
