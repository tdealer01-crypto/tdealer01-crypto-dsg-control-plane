const DSG_BASE = process.env.DSG_APP_URL || "https://dsg-one-v1.vercel.app";
const DSG_API_KEY = process.env.DSG_API_KEY;

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (DSG_API_KEY) headers["X-DSG-Api-Key"] = DSG_API_KEY;
  return headers;
}

export async function callDsgGate(
  skill: string,
  evidence: Record<string, unknown>,
): Promise<{ verdict: "ALLOW" | "REVIEW" | "BLOCK"; auditId: string }> {
  try {
    const res = await fetch(`${DSG_BASE}/api/dsg/marketplace/audit-packet`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        plugin: "mcp-bridge",
        skill,
        evidence,
        requestedAt: new Date().toISOString(),
      }),
    });
    if (!res.ok) return { verdict: "BLOCK", auditId: "gate-error" };
    const data = (await res.json()) as { finalVerdict?: string; auditId?: string };
    return {
      verdict: (data.finalVerdict as "ALLOW" | "REVIEW" | "BLOCK") ?? "BLOCK",
      auditId: data.auditId ?? "unknown",
    };
  } catch {
    return { verdict: "BLOCK", auditId: "gate-fetch-error" };
  }
}

export async function dsgRequest(endpoint: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(`${DSG_BASE}${endpoint}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`DSG API error: ${res.status} ${res.statusText}`);
  return res.json();
}
