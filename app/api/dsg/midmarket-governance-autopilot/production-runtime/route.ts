import { NextRequest, NextResponse } from "next/server";
import {
  evaluateMidMarketProductionRuntimeBinding,
  type ProductionRuntimeBindingRequest,
} from "@/lib/dsg/midmarket-production-runtime";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProductionRuntimeBindingRequest;
    const result = evaluateMidMarketProductionRuntimeBinding(body);
    const status = result.canExecuteProductionRuntime ? 200 : 409;

    return NextResponse.json(
      {
        ok: result.canExecuteProductionRuntime,
        result,
      },
      { status },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "MIDMARKET_PRODUCTION_RUNTIME_BINDING_FAILED",
        message: error instanceof Error ? error.message : "Unknown production runtime binding error",
      },
      { status: 400 },
    );
  }
}
