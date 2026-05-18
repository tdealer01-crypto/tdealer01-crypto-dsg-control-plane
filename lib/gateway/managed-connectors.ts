import { getSupabaseAdmin } from '../supabase-server';
import type { GatewayToolRegistryEntry } from './types';

export async function findManagedGatewayTool(orgId: string, toolName: string): Promise<GatewayToolRegistryEntry | null> {
  if (!orgId || !toolName) {
    return null;
  }

  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from('gateway_tools')
    .select('name, provider, action, risk, execution_mode, requires_approval, description, connector_id, gateway_connectors!inner(endpoint_url, status)')
    .eq('org_id', orgId)
    .eq('name', toolName)
    .eq('enabled', true)
    .maybeSingle();

  if (error) {
    if (String(error.message || '').toLowerCase().includes('relation')) {
      return null;
    }
    throw new Error(`failed_to_read_gateway_tool:${error.message}`);
  }

  if (!data) {
    return null;
  }

  const connector = Array.isArray(data.gateway_connectors) ? data.gateway_connectors[0] : data.gateway_connectors;

  if (!connector || connector.status !== 'connected') {
    return null;
  }

  return {
    name: data.name,
    provider: data.provider,
    action: data.action,
    risk: data.risk,
    executionMode: data.execution_mode,
    requiresApproval: Boolean(data.requires_approval),
    description: data.description ?? 'Managed gateway tool',
    connectorId: data.connector_id,
    endpointUrl: connector.endpoint_url,
  };
}
