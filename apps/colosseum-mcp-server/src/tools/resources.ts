import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildResourcePathIndex, getCorpus } from "../services/colosseum-client.js";
import { handleError } from "../services/format.js";

const ListResourcesInputSchema = z
  .object({
    path: z
      .string()
      .optional()
      .describe(
        "Filter to one top-level path: 'foundations' (start-here, learn, examples, infra) or 'build-paths' (project-type-specific docs like defi-stablecoins, mobile, games). Omit to list all sections."
      ),
  })
  .strict();

type ListResourcesInput = z.infer<typeof ListResourcesInputSchema>;

const GetResourceInputSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .describe(
        "The resource section id (e.g. 'start-here', 'defi-stablecoins', 'mobile'). Use colosseum_list_resources first to find valid ids."
      ),
  })
  .strict();

type GetResourceInput = z.infer<typeof GetResourceInputSchema>;

export function registerResourceTools(server: McpServer): void {
  server.registerTool(
    "colosseum_list_resources",
    {
      title: "List Colosseum Build-Path Resource Sections",
      description: `List the curated documentation sections available for Colosseum builders: foundational docs (start here, learn, examples, dev infra) and project-type build paths (DeFi/stablecoins, mobile, games, agents/tokenization, governance/DAOs, identity, payments, privacy, treasury/security, blinks/actions).

This is an index: it returns id, title, summary, and which top-level path each section belongs to, but not the full link list. Use colosseum_get_resource with an id from this list to get the actual links.

Args:
  - path (string, optional): 'foundations' or 'build-paths'. Omit to list all sections.

Returns JSON: { total: number, sections: [{ id, title, summary, path_id, path_title }] }

Examples:
  - Use when: "What build-path docs exist for a DeFi project?" -> path="build-paths", then look for a section with title/summary mentioning DeFi
  - Use when: "Where do I start as a first-time Solana builder?" -> path="foundations"`,
      inputSchema: ListResourcesInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListResourcesInput) => {
      try {
        const corpus = await getCorpus();
        const pathIndex = buildResourcePathIndex(corpus);

        let sections = corpus.resources.map((r) => {
          const path = pathIndex.get(r.id);
          return {
            id: r.id,
            title: r.title,
            summary: r.summary,
            path_id: path?.pathId ?? null,
            path_title: path?.pathTitle ?? null,
          };
        });

        if (params.path) {
          sections = sections.filter((s) => s.path_id === params.path);
        }

        if (sections.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No resource sections found${
                  params.path ? ` for path '${params.path}'` : ""
                }. Call colosseum_list_resources with no filters to see all paths.`,
              },
            ],
          };
        }

        const output = { total: sections.length, sections };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleError(error) }] };
      }
    }
  );

  server.registerTool(
    "colosseum_get_resource",
    {
      title: "Get Colosseum Resource Section Links",
      description: `Get the full documentation links for one Colosseum resource section, grouped into labeled subsections (e.g. "Core Docs", "Starter Pack").

Args:
  - id (string): The resource section id. Get valid ids from colosseum_list_resources.

Returns JSON: { id, title, summary, groups: [{ id, title, links: [{hyperlink, url, description}] }] }

Examples:
  - Use when: "Give me the DeFi/stablecoins build-path docs" -> id="defi-stablecoins"
  - Don't use when: you don't know which section id you need (call colosseum_list_resources first)

Error Handling:
  - Returns "Error: No resource section found with id '<id>'" if the id doesn't match.`,
      inputSchema: GetResourceInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetResourceInput) => {
      try {
        const corpus = await getCorpus();
        const section = corpus.resources.find((r) => r.id === params.id);

        if (!section) {
          const knownIds = corpus.resources.map((r) => r.id).join(", ");
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: No resource section found with id '${params.id}'. Known ids: ${knownIds}`,
              },
            ],
          };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(section, null, 2) }],
          structuredContent: section as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleError(error) }] };
      }
    }
  );
}
