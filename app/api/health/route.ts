import { getDSGCoreHealth } from '../../../lib/dsg-core';

export async function GET() {
  const core = await getDSGCoreHealth();

  return Response.json({
    ok: true,
    service: 'dsg-control-plane',
    timestamp: new Date().toISOString(),
    core_ok: core.ok,
    core,
  });
}
