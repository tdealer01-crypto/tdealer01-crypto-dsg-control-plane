export async function GET() {
  return Response.json({
    requests_today: 1420,
    allow_rate: 0.93,
    block_rate: 0.03,
    stabilize_rate: 0.04,
    active_agents: 8,
    avg_latency_ms: 5
  });
}
