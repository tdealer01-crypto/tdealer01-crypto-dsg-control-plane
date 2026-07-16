import { Anthropic } from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/security/api-error";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { order_id, customer_email, product, amount, stripe_session_id, timestamp } = await req.json();

    // Lazy-load Supabase client only at runtime, not at build time
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Generate Delivery Proof for order ${order_id}, customer ${customer_email}, product ${product}`,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      order_id,
      report_url: `${process.env.NEXT_PUBLIC_APP_URL}/reports/${order_id}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError("POST /api/webhooks", error);
  }
}
