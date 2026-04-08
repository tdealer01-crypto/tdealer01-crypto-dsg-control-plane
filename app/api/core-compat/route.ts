import { NextResponse } from "next/server";
import { getDSGCoreCompatibility } from "../../../lib/core-compat";
import { handleApiError } from "../../../lib/security/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const compatibility = await getDSGCoreCompatibility();

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...compatibility,
    });
  } catch (error) {
    return handleApiError('api/core-compat', error);
  }
}
