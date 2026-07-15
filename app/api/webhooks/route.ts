import { Anthropic } from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { order_id } = req.body;
    const msg = await anthropic.messages.create({ model: "claude-sonnet-4-6", max_tokens: 1024, messages: [{ role: "user", content: `Generate proof for ${order_id}` }] });
    return res.status(200).json({ success: true, order_id, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ error: "Failed", message: error instanceof Error ? error.message : "Unknown" });
  }
}
