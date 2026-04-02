import type { GatePlugin } from './types';

const plugins = new Map<string, GatePlugin>();

export function registerGate(plugin: GatePlugin) {
  plugins.set(plugin.id, plugin);
}

export function resolveGate(id?: string): GatePlugin {
  const pluginId = id || process.env.DSG_GATE_PLUGIN || mapLegacyMode();
  const plugin = plugins.get(pluginId);
  if (!plugin) {
    throw new Error(`Gate plugin "${pluginId}" not found. Available: ${Array.from(plugins.keys()).join(', ')}`);
  }
  return plugin;
}

export function listGates(): GatePlugin[] {
  return Array.from(plugins.values());
}

function mapLegacyMode(): string {
  const mode = process.env.DSG_CORE_MODE;
  if (mode === 'remote') return 'remote-core';
  return 'risk-gate';
}
