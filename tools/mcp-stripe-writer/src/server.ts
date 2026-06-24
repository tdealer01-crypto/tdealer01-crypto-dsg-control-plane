#!/usr/bin/env node
import { createHash } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requireStripeSecret(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing required env: STRIPE_SECRET_KEY");
  }
  return secretKey;
}

function appendFormValue(params: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  params.append(key, String(value));
}

async function stripePost(path: string, params: URLSearchParams): Promise<Record<string, unknown>> {
  const res = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${requireStripeSecret()}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const error = body.error as { message?: string; type?: string } | undefined;
    throw new Error(error?.message ?? `Stripe request failed: ${res.status}`);
  }
  return body;
}

const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  mutationApproved: z.literal(true),
  approvalTicket: z.string().optional(),
});

const CreatePriceSchema = z.object({
  product: z.string().min(1),
  unit_amount: z.number().int().positive(),
  currency: z.string().min(3).max(3).default("usd"),
  recurring: z
    .object({
      interval: z.enum(["day", "week", "month", "year"]),
      interval_count: z.number().int().positive().optional(),
    })
    .optional(),
  mutationApproved: z.literal(true),
  approvalTicket: z.string().optional(),
});

const CreatePaymentLinkSchema = z.object({
  price: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  mutationApproved: z.literal(true),
  approvalTicket: z.string().optional(),
});

async function stripeCreateProduct(input: unknown): Promise<Record<string, unknown>> {
  const parsed = CreateProductSchema.parse(input);
  const params = new URLSearchParams();
  appendFormValue(params, "name", parsed.name);
  appendFormValue(params, "description", parsed.description);

  const product = await stripePost("/products", params);
  const evidence = {
    ok: true,
    tool: "stripe_create_product",
    product_id: product.id,
    name: product.name,
    active: product.active,
    mutationApproved: parsed.mutationApproved,
    approvalTicket: parsed.approvalTicket ?? null,
  };
  return { ...evidence, evidenceHash: sha256Json(evidence) };
}

async function stripeCreatePrice(input: unknown): Promise<Record<string, unknown>> {
  const parsed = CreatePriceSchema.parse(input);
  const params = new URLSearchParams();
  appendFormValue(params, "product", parsed.product);
  appendFormValue(params, "unit_amount", parsed.unit_amount);
  appendFormValue(params, "currency", parsed.currency.toLowerCase());
  if (parsed.recurring) {
    appendFormValue(params, "recurring[interval]", parsed.recurring.interval);
    appendFormValue(params, "recurring[interval_count]", parsed.recurring.interval_count);
  }

  const price = await stripePost("/prices", params);
  const recurring = price.recurring as Record<string, unknown> | null | undefined;
  const evidence = {
    ok: true,
    tool: "stripe_create_price",
    price_id: price.id,
    product: price.product,
    unit_amount: price.unit_amount,
    currency: price.currency,
    recurring: recurring
      ? {
          interval: recurring.interval,
          interval_count: recurring.interval_count,
        }
      : null,
    active: price.active,
    mutationApproved: parsed.mutationApproved,
    approvalTicket: parsed.approvalTicket ?? null,
  };
  return { ...evidence, evidenceHash: sha256Json(evidence) };
}

async function stripeCreatePaymentLink(input: unknown): Promise<Record<string, unknown>> {
  const parsed = CreatePaymentLinkSchema.parse(input);
  const params = new URLSearchParams();
  appendFormValue(params, "line_items[0][price]", parsed.price);
  appendFormValue(params, "line_items[0][quantity]", parsed.quantity);

  const paymentLink = await stripePost("/payment_links", params);
  const evidence = {
    ok: true,
    tool: "stripe_create_payment_link",
    payment_link_id: paymentLink.id,
    url: paymentLink.url,
    price: parsed.price,
    quantity: parsed.quantity,
    active: paymentLink.active,
    mutationApproved: parsed.mutationApproved,
    approvalTicket: parsed.approvalTicket ?? null,
  };
  return { ...evidence, evidenceHash: sha256Json(evidence) };
}

const server = new Server(
  {
    name: "dsg-stripe-writer",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "stripe_create_product",
      description: "Create a Stripe product after DSG approval.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          mutationApproved: { type: "boolean", const: true },
          approvalTicket: { type: "string" },
        },
        required: ["name", "mutationApproved"],
      },
    },
    {
      name: "stripe_create_price",
      description: "Create a Stripe recurring or one-time price after DSG approval.",
      inputSchema: {
        type: "object",
        properties: {
          product: { type: "string" },
          unit_amount: { type: "number" },
          currency: { type: "string" },
          recurring: {
            type: "object",
            properties: {
              interval: { type: "string", enum: ["day", "week", "month", "year"] },
              interval_count: { type: "number" },
            },
          },
          mutationApproved: { type: "boolean", const: true },
          approvalTicket: { type: "string" },
        },
        required: ["product", "unit_amount", "mutationApproved"],
      },
    },
    {
      name: "stripe_create_payment_link",
      description: "Create a Stripe Payment Link after DSG approval.",
      inputSchema: {
        type: "object",
        properties: {
          price: { type: "string" },
          quantity: { type: "number" },
          mutationApproved: { type: "boolean", const: true },
          approvalTicket: { type: "string" },
        },
        required: ["price", "mutationApproved"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let result: Record<string, unknown>;
    if (name === "stripe_create_product") {
      result = await stripeCreateProduct(args ?? {});
    } else if (name === "stripe_create_price") {
      result = await stripeCreatePrice(args ?? {});
    } else if (name === "stripe_create_payment_link") {
      result = await stripeCreatePaymentLink(args ?? {});
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: false, error: message }, null, 2) }],
      isError: true,
    };
  }
});

await server.connect(new StdioServerTransport());
