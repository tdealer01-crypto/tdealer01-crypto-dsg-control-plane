/**
 * GET /api/dsg/hermes/credentials
 *
 * Redacted view of the credential/API authority used by the Hermes worker.
 * Sourced through credential-broker.ts (Nango is the intended authority).
 *
 * Security:
 *   - Operator auth required (org.view_reports).
 *   - Raw secret values are NEVER returned — only the secret name and a short
 *     redaction fingerprint (a hash prefix) from the broker's lease.
 *   - On broker/DB failure it fails closed (no fabricated leases).
 */

import { NextResponse } from "next/server";
import { requireOrgPermission } from "@/lib/auth/require-org-permission";
import { brokerCredentials } from "@/lib/dsg/brain/credential-broker";

export const dynamic = "force-dynamic";

// Credential names the Hermes worker may need, brokered through the authority.
const KNOWN_CREDENTIALS = [
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
  "TOGETHER_API_KEY",
  "NANGO_SECRET_KEY",
  "NANGO_CONNECTION_ID",
  "STRIPE_SECRET_KEY",
  "GITHUB_TOKEN",
];

export async function GET() {
  const auth = await requireOrgPermission("org.view_reports");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  // Authority: Nango when configured, otherwise the DSG broker (Supabase dsg_secrets).
  const authority = process.env.NANGO_SECRET_KEY ? "nango" : "dsg-broker";

  let leases: Array<{ secretName: string; fingerprint: string; expiresAt: number; ttlMs: number }> = [];
  let unavailable: string[] = [...KNOWN_CREDENTIALS];
  let error: string | null = null;

  try {
    const result = await brokerCredentials(KNOWN_CREDENTIALS);
    leases = result.leases.map((l) => ({
      secretName: l.secretName,
      fingerprint: String(l.fingerprint).slice(0, 12), // redacted: short hash prefix only
      expiresAt: l.expiresAt,
      ttlMs: l.ttlMs,
    }));
    unavailable = result.unavailable;
  } catch (e) {
    // dsg_secrets table / DB unavailable -> fail closed, no fabrication.
    error = e instanceof Error ? e.message : "credential broker unavailable";
  }

  return NextResponse.json({
    ok: true,
    authority,
    leases, // name + short fingerprint + ttl only; never raw secret values
    unavailable,
    error,
    note: "Redacted via credential-broker.ts. Raw secret values are never returned. Nango is the intended credential/API authority.",
  });
}
