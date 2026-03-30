import { NextResponse } from "next/server";
import { getDSGCoreHealth } from "../../../lib/dsg-core";
import { getMCPToolRegistry } from "../../../lib/mcp-registry";
import {
  KNOWN_GAPS,
  SOURCE_OF_TRUTH_MAP,
  VERIFIED_FORMAL_CORE,
} from "../../../lib/integration-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const core = await getDSGCoreHealth();
  const mcpTools = getMCPToolRegistry();

  return NextResponse.json({
    ok: true,
    service: "dsg-control-plane",
    timestamp: new Date().toISOString(),
    verified_formal_core: VERIFIED_FORMAL_CORE,
    source_of_truth: SOURCE_OF_TRUTH_MAP,
    integration_status: {
      control_plane_ready: true,
      core_health_ok: core.ok,
      core,
      mcp_ready: mcpTools.length > 0,
      mcp_tool_count: mcpTools.length,
    },
    mcp_tools: mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      method: tool.method || "POST",
      timeout_ms: tool.timeout_ms,
    })),
    known_gaps: KNOWN_GAPS,
  });
}
