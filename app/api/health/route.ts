import { getDSGCoreHealth } from '../../../lib/dsg-core';

export async function GET() {
  const core = await getDSGCoreHealth();

  return Response.json({
    ok: core.ok,
    service: 'dsg-control-plane',
    timestamp: new Date().toISOString(),
    core_ok: core.ok,
    error: core.ok ? null : core.error ?? null,
    core,
  });
}
