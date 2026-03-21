import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agent_id") || "";
  const apiKey = url.searchParams.get("api_key") || "";
  const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");

  const supabase = getSupabaseAdmin();

  const byId = await supabase
    .from("agents")
    .select("id, org_id, name, status, api_key_hash")
    .eq("id", agentId)
    .maybeSingle();

  const byIdAndHash = await supabase
    .from("agents")
    .select("id, org_id, name, status")
    .eq("id", agentId)
    .eq("api_key_hash", apiKeyHash)
    .maybeSingle();

  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    agent_id: agentId,
    computed_hash: apiKeyHash,
    by_id: byId.data ?? null,
    by_id_error: byId.error?.message ?? null,
    by_id_and_hash: byIdAndHash.data ?? null,
    by_id_and_hash_error: byIdAndHash.error?.message ?? null,
  });
}
