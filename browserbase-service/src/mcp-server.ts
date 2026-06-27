import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  createStagehand,
  closeStagehand,
  navigate,
  screenshot,
  click,
  scrape,
  fillForm,
  leadGen,
  monitor,
} from "./client.js";
import { UrlSchema, ScreenshotSchema } from "./schemas.js";

const EnvSchema = z.object({
  BROWSERBASE_PROJECT_ID: z.string().min(1),
  BROWSERBASE_API_KEY: z.string().min(1),
});

function requireEnv() {
  const env = EnvSchema.safeParse(process.env);
  if (!env.success) {
    throw new Error(
      "Missing required env: BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY"
    );
  }
  return env.data;
}

const server = new Server(
  {
    name: "browserbase-automation",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "browser_navigate",
      description: "Open a URL in Browserbase and resolve navigation.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Target URL" },
          waitUntil: {
            type: "string",
            enum: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
          },
        },
        required: ["url"],
      },
    },
    {
      name: "browser_screenshot",
      description: "Take a screenshot in Browserbase.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Target URL" },
          fullPage: { type: "boolean" },
          output: { type: "string" },
          waitMs: { type: "number" },
        },
        required: ["url"],
      },
    },
    {
      name: "browser_click",
      description: "Click a CSS selector in Browserbase.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Target URL" },
          selector: { type: "string", description: "CSS selector" },
          waitNav: { type: "boolean" },
        },
        required: ["url", "selector"],
      },
    },
    {
      name: "browser_scrape",
      description: "Extract text from a page by selector in Browserbase.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Target URL" },
          selector: { type: "string" },
          waitForSelector: { type: "string" },
          extractLinks: { type: "boolean" },
          maxLinks: { type: "number" },
        },
        required: ["url"],
      },
    },
    {
      name: "browser_lead_gen",
      description: "Collect lead rows from a listing page in Browserbase.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Listing page URL" },
          listSelector: { type: "string" },
          itemSelectors: { type: "object" },
          maxItems: { type: "number" },
          followNext: { type: "boolean" },
        },
        required: ["url"],
      },
    },
    {
      name: "browser_monitor",
      description: "Sample page health/readiness in Browserbase.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Target URL" },
          checkString: { type: "string" },
        },
        required: ["url"],
      },
    },
    {
      name: "browser_form_fill",
      description: "Fill and optionally submit a form in Browserbase.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Form page URL" },
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                selector: { type: "string" },
                value: { type: "string" },
                clearFirst: { type: "boolean" },
              },
              required: ["selector", "value"],
            },
          },
          submitSelector: { type: "string" },
        },
        required: ["url", "fields"],
      },
    },
  ],
}));

type MaybePromise<T> = T | Promise<T>;
type Nullable<T> = T | null;

type ClientResult = MaybePromise<
  | {
      url: string;
      title: string;
      ok?: boolean;
      output?: string;
      items?: Array<Record<string, unknown>>;
    }
  | {
      items: Array<Record<string, unknown>>;
      ok: boolean;
      url: string;
      count: number;
      followedNext: boolean;
    }
  | {
      fields: Array<{ selector: string; ok: boolean; error?: string }>;
    }
>;

type ClientMethod = (page: any, input: Record<string, unknown>) => MaybePromise<ClientResult>;

const toolHandlers: Record<string, ClientMethod> = {
  browser_navigate: navigate as ClientMethod,
  browser_screenshot: screenshot as ClientMethod,
  browser_click: click as ClientMethod,
  browser_scrape: scrape as ClientMethod,
  browser_lead_gen: leadGen as ClientMethod,
  browser_monitor: monitor as ClientMethod,
  browser_form_fill: fillForm as ClientMethod,
};

const skipAuthTools = new Set(["browser_navigate", "browser_screenshot"]);

function extractFields(
  schema: z.ZodSchema<any>,
  args: Record<string, unknown>
): Record<string, unknown> {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const message = first
      ? `${first.path.join(".")}: ${first.message}`
      : "invalid arguments";
    const error = new Error(message);
    throw error;
  }
  return parsed.data as Record<string, unknown>;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = toolHandlers[name];

  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const env = requireEnv();
  let stagehandCtx: { stagehand: any; page: any; sessionId: string } | null = null;

  try {
    const normalized = args && typeof args === "object" ? args : {};

    let input: Record<string, unknown> = {};

    if (name === "browser_screenshot") {
      input = extractFields(ScreenshotSchema.parse.bind(ScreenshotSchema), normalized) as Record<string, unknown>;
    } else {
      input = extractFields(UrlSchema.parse.bind(UrlSchema), normalized) as Record<string, unknown>;
    }

    const needsBrowser =
      name !== "browser_navigate" &&
      name !== "browser_screenshot" &&
      name !== "browser_lead_gen" &&
      name !== "browser_monitor";

    if (needsBrowser) {
      stagehandCtx = await createStagehand(env.BROWSERBASE_PROJECT_ID, env.BROWSERBASE_API_KEY);
    }

    if (name === "browser_navigate" || name === "browser_screenshot") {
      stagehandCtx = await createStagehand(env.BROWSERBASE_PROJECT_ID, env.BROWSERBASE_API_KEY);
    }

    const page = stagehandCtx ? stagehandCtx.page : (null as any);

    const result = await handler(page, input);

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: any) {
    const message = error?.message ?? String(error);
    const status = message.includes("Missing required env") ? 400 : 500;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: false, error: message }, null, 2),
        },
      ],
      isError: true,
    };
  } finally {
    if (stagehandCtx) {
      await closeStagehand(stagehandCtx).catch(() => {});
    }
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
