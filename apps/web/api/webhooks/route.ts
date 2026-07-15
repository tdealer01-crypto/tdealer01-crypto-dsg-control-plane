import { Anthropic } from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DeliveryProofRequest {
  order_id: string;
  customer_email: string;
  product: string;
  amount: number;
  stripe_session_id: string;
  timestamp: string;
}

async function generateDeliveryProof(
  orderData: DeliveryProofRequest
): Promise<{ report_url: string; report_hash: string }> {
  const proofPrompt = `Generate a professional Delivery Proof Report.

Order: ${orderData.order_id}
Email: ${orderData.customer_email}
Product: ${orderData.product}
Amount: $${orderData.amount / 100}
Session: ${orderData.stripe_session_id}

Return JSON:
{
  "order_id": "${orderData.order_id}",
  "status": "complete",
  "certificate_id": "DSG-2026-XXXXX",
  "delivery_proof": {
    "sha256_hash": "hash...",
    "timestamp": "${new Date().toISOString()}",
    "audit_trail": ["order_received", "proof_generated"]
  }
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: proofPrompt }],
  });

  const reportText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const reportJSON = JSON.parse(reportText);

  const { error: insertError } = await supabase
    .from("orders")
    .update({
      status: "complete",
      report_data: reportJSON,
      report_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderData.order_id);

  if (insertError) throw insertError;

  return {
    report_url: `${process.env.NEXT_PUBLIC_APP_URL}/reports/${orderData.order_id}`,
    report_hash: reportJSON.delivery_proof.sha256_hash,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const orderData: DeliveryProofRequest = req.body;
    const { report_url, report_hash } = await generateDeliveryProof(orderData);

    return res.status(200).json({
      success: true,
      order_id: orderData.order_id,
      report_url: report_url,
      report_hash: report_hash,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to generate delivery proof",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
