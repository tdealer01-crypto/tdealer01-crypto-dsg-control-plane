import { NextResponse } from 'next/server';
import { listAgentRuntimeServices } from '@/lib/dsg/agent-runtime/service-registry';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      services: listAgentRuntimeServices(),
      truthBoundary: 'Remote browser automation is connector_required until a real executor is wired. Existing server-side App Builder tool calls remain available through approved job flow.',
    },
  });
}
