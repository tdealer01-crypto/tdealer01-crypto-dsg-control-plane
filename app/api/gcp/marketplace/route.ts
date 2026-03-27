type MarketplaceAck = {
  ok: boolean;
  service: string;
  endpoint: string;
  method: string;
  timestamp: string;
  message: string;
  requestId: string | null;
};

function buildAck(method: string, requestId: string | null, message: string): MarketplaceAck {
  return {
    ok: true,
    service: "dsg-control-plane",
    endpoint: "/api/gcp/marketplace",
    method,
    timestamp: new Date().toISOString(),
    message,
    requestId,
  };
}

function getRequestId(request: Request) {
  return (
    request.headers.get("x-request-id") ||
    request.headers.get("x-cloud-trace-context") ||
    null
  );
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  return Response.json(
    buildAck(
      "GET",
      requestId,
      "DSG Google Cloud Marketplace integration endpoint is reachable."
    ),
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const body = await request.json().catch(() => null);

  return Response.json(
    {
      ...buildAck(
        "POST",
        requestId,
        "DSG Google Cloud Marketplace integration payload received."
      ),
      received: body,
    },
    { status: 200 }
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
    },
  });
}
