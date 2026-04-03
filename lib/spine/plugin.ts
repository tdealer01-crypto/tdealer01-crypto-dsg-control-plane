import type { PluginInput, PluginOutput } from './types';

export interface DSGPlugin {
  readonly id: string;
  readonly name: string;
  readonly kind: 'gate' | 'arbiter' | 'observer';
  readonly verification: {
    verified: boolean;
    solver: string | null;
    properties: string[];
  };
  health(): Promise<{ ok: boolean; detail?: string }>;
  evaluate(input: PluginInput): Promise<PluginOutput>;
}

class PluginRegistry {
  private plugins = new Map<string, DSGPlugin>();

  registerIfAbsent(plugin: DSGPlugin): void {
    if (!this.plugins.has(plugin.id)) {
      this.plugins.set(plugin.id, plugin);
    }
  }

  get(id: string): DSGPlugin | undefined {
    return this.plugins.get(id);
  }

  getByKind(kind: DSGPlugin['kind']): DSGPlugin[] {
    return Array.from(this.plugins.values()).filter((plugin) => plugin.kind === kind);
  }

  all(): DSGPlugin[] {
    return Array.from(this.plugins.values());
  }

  manifest() {
    return this.all().map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      kind: plugin.kind,
      verified: plugin.verification.verified,
      solver: plugin.verification.solver,
      properties: plugin.verification.properties,
    }));
  }
}

export const registry = new PluginRegistry();
