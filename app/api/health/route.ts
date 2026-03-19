export async function GET() {
  return Response.json({
    ok: true,
    service: "dsg-control-plane",
    timestamp: new Date().toISOString()
  });
}
