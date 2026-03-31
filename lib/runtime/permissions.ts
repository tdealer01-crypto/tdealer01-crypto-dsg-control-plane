import type { RuntimeRole } from '../authz';

export const RuntimeRouteRoles: Record<string, RuntimeRole[]> = {
  intent: ['operator', 'org_admin'],
  execute: ['operator', 'org_admin'],
  mcp_call: ['operator', 'org_admin'],
  effect_callback: ['operator', 'org_admin', 'reviewer'],
  checkpoint: ['runtime_auditor', 'org_admin'],
  runtime_summary: ['runtime_auditor', 'reviewer', 'org_admin'],
  policies_read: ['reviewer', 'org_admin', 'runtime_auditor'],
  policies_write: ['org_admin', 'reviewer'],
};
