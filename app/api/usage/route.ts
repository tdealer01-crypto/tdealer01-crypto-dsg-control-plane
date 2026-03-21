export async function GET() {
  return Response.json({
    plan: "pro",
    billing_period: "2026-03",
    executions: 1420,
    included_executions: 10000,
    overage_executions: 0,
    projected_amount_usd: 99
  });
}
