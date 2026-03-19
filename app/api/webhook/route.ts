export async function POST(req: Request) {
  try {
    const body = await req.text();
    console.log("Webhook received:", body);
    return Response.json({ ok: true, received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ ok: true, service: "dsg-control-plane-webhook" }, { status: 200 });
}
