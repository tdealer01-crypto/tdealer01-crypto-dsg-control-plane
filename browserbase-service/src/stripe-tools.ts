import { createHash } from "node:crypto";
import Stripe from "stripe";
import { z } from "zod";

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const StripeEnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
});

function getStripe() {
  const env = StripeEnvSchema.safeParse(process.env);
  if (!env.success) {
    throw new Error("Missing required env: STRIPE_SECRET_KEY");
  }
  return new Stripe(env.data.STRIPE_SECRET_KEY);
}

export const StripeCreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  mutationApproved: z.literal(true),
  approvalTicket: z.string().optional(),
});

export const StripeCreatePriceSchema = z.object({
  product: z.string().min(1),
  unit_amount: z.number().int().positive(),
  currency: z.string().min(3).max(3).default("usd"),
  recurring: z.object({
    interval: z.enum(["day", "week", "month", "year"]),
    interval_count: z.number().int().positive().optional(),
  }).optional(),
  mutationApproved: z.literal(true),
  approvalTicket: z.string().optional(),
});

export const StripeCreatePaymentLinkSchema = z.object({
  price: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  mutationApproved: z.literal(true),
  approvalTicket: z.string().optional(),
});

export async function stripeCreateProduct(input: z.infer<typeof StripeCreateProductSchema>) {
  const parsed = StripeCreateProductSchema.parse(input);
  const stripe = getStripe();

  const product = await stripe.products.create({
    name: parsed.name,
    description: parsed.description,
  });

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

export async function stripeCreatePrice(input: z.infer<typeof StripeCreatePriceSchema>) {
  const parsed = StripeCreatePriceSchema.parse(input);
  const stripe = getStripe();

  const price = await stripe.prices.create({
    product: parsed.product,
    unit_amount: parsed.unit_amount,
    currency: parsed.currency.toLowerCase(),
    recurring: parsed.recurring,
  });

  const evidence = {
    ok: true,
    tool: "stripe_create_price",
    price_id: price.id,
    product: price.product,
    unit_amount: price.unit_amount,
    currency: price.currency,
    recurring: price.recurring
      ? {
          interval: price.recurring.interval,
          interval_count: price.recurring.interval_count,
        }
      : null,
    active: price.active,
    mutationApproved: parsed.mutationApproved,
    approvalTicket: parsed.approvalTicket ?? null,
  };

  return { ...evidence, evidenceHash: sha256Json(evidence) };
}

export async function stripeCreatePaymentLink(input: z.infer<typeof StripeCreatePaymentLinkSchema>) {
  const parsed = StripeCreatePaymentLinkSchema.parse(input);
  const stripe = getStripe();

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price: parsed.price,
        quantity: parsed.quantity,
      },
    ],
  });

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
