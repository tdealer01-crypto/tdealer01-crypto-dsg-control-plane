import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCorpus } from "../services/colosseum-client.js";
import { handleError, truncatingJson } from "../services/format.js";
import type { Sponsor } from "../types.js";

const ListSponsorsInputSchema = z
  .object({
    tag: z
      .string()
      .optional()
      .describe(
        "Filter to sponsors whose tags array includes this value (case-insensitive), e.g. 'defi', 'wallet', 'privacy', 'agents'. Omit to list all sponsors."
      ),
    has_skill_only: z
      .boolean()
      .default(false)
      .describe(
        "If true, only return sponsors that publish an installable agent skill (hasSkill: true)."
      ),
  })
  .strict();

type ListSponsorsInput = z.infer<typeof ListSponsorsInputSchema>;

const GetSponsorInputSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .describe(
        "The sponsor's slug (e.g. 'phantom', 'arcium'). Use colosseum_list_sponsors first to find valid slugs."
      ),
  })
  .strict();

type GetSponsorInput = z.infer<typeof GetSponsorInputSchema>;

const SearchSponsorsInputSchema = z
  .object({
    query: z
      .string()
      .min(2, "Query must be at least 2 characters")
      .max(200, "Query must not exceed 200 characters")
      .describe(
        "Keyword to search for across sponsor name, tags, and full content (e.g. 'confidential computation', 'mobile wallet', 'treasury multisig')."
      ),
  })
  .strict();

type SearchSponsorsInput = z.infer<typeof SearchSponsorsInputSchema>;

function toListItem(sponsor: Sponsor) {
  return {
    name: sponsor.name,
    slug: sponsor.slug,
    tags: sponsor.tags,
    has_skill: sponsor.hasSkill,
    skill_install_command: sponsor.skillInstallCommand,
  };
}

export function registerSponsorTools(server: McpServer): void {
  server.registerTool(
    "colosseum_list_sponsors",
    {
      title: "List Colosseum Hackathon Sponsors",
      description: `List sponsor tools available to Colosseum hackathon builders (wallets, RPC/infra, privacy, treasury, identity, DeFi, etc.).

This is an index: it returns name, slug, tags, and skill-install info for each sponsor, but not the full description. Use colosseum_get_sponsor with a slug from this list to get full details, links, and integration docs.

Args:
  - tag (string, optional): Filter to sponsors whose tags include this value (case-insensitive). Common tags: wallet, payments, agents, treasury, security, identity, privacy, defi, tokens, trading, nfts, productivity.
  - has_skill_only (boolean, default false): Only return sponsors with an installable agent skill.

Returns JSON: { total: number, sponsors: [{ name, slug, tags, has_skill, skill_install_command }] }

Examples:
  - Use when: "What DeFi sponsors are there?" -> tag="defi"
  - Use when: "Which sponsors have an agent skill I can install?" -> has_skill_only=true
  - Don't use when: you already know the sponsor's slug and want full details (use colosseum_get_sponsor instead)`,
      inputSchema: ListSponsorsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListSponsorsInput) => {
      try {
        const corpus = await getCorpus();
        let sponsors = corpus.sponsors;

        if (params.tag) {
          const wanted = params.tag.toLowerCase();
          sponsors = sponsors.filter((s) =>
            s.tags.some((t) => t.toLowerCase() === wanted)
          );
        }
        if (params.has_skill_only) {
          sponsors = sponsors.filter((s) => s.hasSkill);
        }

        if (sponsors.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No sponsors found${
                  params.tag ? ` matching tag '${params.tag}'` : ""
                }. Call colosseum_list_sponsors with no filters to see all available tags.`,
              },
            ],
          };
        }

        const output = {
          total: sponsors.length,
          sponsors: sponsors.map(toListItem),
        };

        return {
          content: [
            { type: "text" as const, text: truncatingJson(output, "sponsors") },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleError(error) }] };
      }
    }
  );

  server.registerTool(
    "colosseum_get_sponsor",
    {
      title: "Get Colosseum Sponsor Details",
      description: `Get full details for one Colosseum hackathon sponsor: description content, all documentation/starter links, tags, and skill install command if available.

Args:
  - slug (string): The sponsor's slug. Get valid slugs from colosseum_list_sponsors.

Returns JSON: { name, slug, tags, accent_color, has_skill, skill_repository_url, skill_install_command, links: [{label, url}], content }

Examples:
  - Use when: "Tell me about integrating Arcium" -> slug="arcium"
  - Don't use when: you don't know which sponsor to look at yet (use colosseum_list_sponsors or colosseum_search_sponsors first)

Error Handling:
  - Returns "Error: No sponsor found with slug '<slug>'" if the slug doesn't match any sponsor.`,
      inputSchema: GetSponsorInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetSponsorInput) => {
      try {
        const corpus = await getCorpus();
        const sponsor = corpus.sponsors.find(
          (s) => s.slug.toLowerCase() === params.slug.toLowerCase()
        );

        if (!sponsor) {
          const knownSlugs = corpus.sponsors.map((s) => s.slug).join(", ");
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: No sponsor found with slug '${params.slug}'. Known slugs: ${knownSlugs}`,
              },
            ],
          };
        }

        const output = {
          name: sponsor.name,
          slug: sponsor.slug,
          tags: sponsor.tags,
          accent_color: sponsor.accentColor,
          has_skill: sponsor.hasSkill,
          skill_repository_url: sponsor.skillRepositoryUrl,
          skill_install_command: sponsor.skillInstallCommand,
          links: sponsor.links,
          content: sponsor.content,
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

  server.registerTool(
    "colosseum_search_sponsors",
    {
      title: "Search Colosseum Sponsors",
      description: `Search sponsor name, tags, and full content for a keyword. Use this when you don't know an exact sponsor name or slug and want to find the best fit for a project idea.

Args:
  - query (string, 2-200 chars): Keyword or short phrase to search for.

Returns JSON: { total: number, sponsors: [{ name, slug, tags, has_skill, skill_install_command, matched_snippet }] }
where matched_snippet is a short excerpt of the sponsor's content around the first match.

Examples:
  - Use when: "I need confidential computation on Solana" -> query="confidential computation"
  - Use when: "Is there a treasury multisig sponsor?" -> query="multisig treasury"
  - Don't use when: you already have a specific sponsor slug (use colosseum_get_sponsor instead)`,
      inputSchema: SearchSponsorsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: SearchSponsorsInput) => {
      try {
        const corpus = await getCorpus();
        const needle = params.query.toLowerCase();

        const matches = corpus.sponsors
          .map((sponsor) => {
            const haystack = [
              sponsor.name,
              ...sponsor.tags,
              sponsor.content,
            ]
              .join(" ")
              .toLowerCase();
            const idx = haystack.indexOf(needle);
            if (idx === -1) return null;

            const contentIdx = sponsor.content.toLowerCase().indexOf(needle);
            const snippetStart = Math.max(0, contentIdx - 60);
            const snippetEnd =
              contentIdx === -1
                ? Math.min(sponsor.content.length, 160)
                : Math.min(sponsor.content.length, contentIdx + needle.length + 60);
            const matched_snippet =
              contentIdx === -1
                ? sponsor.content.slice(0, 160)
                : `...${sponsor.content.slice(snippetStart, snippetEnd)}...`;

            return { ...toListItem(sponsor), matched_snippet };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);

        if (matches.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No sponsors matched '${params.query}'. Try a broader term or call colosseum_list_sponsors to browse all sponsors.`,
              },
            ],
          };
        }

        const output = { total: matches.length, sponsors: matches };
        return {
          content: [
            { type: "text" as const, text: truncatingJson(output, "sponsors") },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleError(error) }] };
      }
    }
  );
}
