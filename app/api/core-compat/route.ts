import { NextResponse } from "next/server";
import { getDSGCoreCompatibility } from "../../../lib/core-compat";

export const dynamic = "force-dynamic";

export async function GET() {
  const compatibility = await getDSGCoreCompatibility();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...compatibility,
  });
}
