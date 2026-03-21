const agents = [
  {
    agent_id: "agt_demo",
    name: "demo-agent",
    policy_id: "policy_default",
    status: "active",
    monthly_limit: 10000,
    usage_this_month: 12,
    api_key_preview: "dsg_live_demo...",
  },
];

export async function GET() {
  return Response.json({ items: agents });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const name = body?.name || "demo-agent";
  const policy_id = body?.policy_id || "policy_default";
  const monthly_limit = Number(body?.monthly_limit || 10000);

  return Response.json({
    agent_id: `agt_${crypto.randomUUID().slice(0, 8)}`,
    name,
    policy_id,
    api_key: `dsg_live_${crypto.randomUUID().replace(/-/g, "")}`,
    monthly_limit,
    status: "active",
  });
}
