import type { CapabilityQuery, CapabilityMatch, Capability, CapabilityEngine } from './types';

class CapabilityEngineImpl implements CapabilityEngine {
  private capabilities = new Map<string, Capability>();

  query(q: CapabilityQuery): CapabilityMatch[] {
    const key = this.buildKey(q.capability, q.resource_type);
    const capability = this.capabilities.get(key);

    if (!capability) {
      return [];
    }

    // Sort by confidence descending
    return capability.providers.sort((a, b) => b.confidence - a.confidence);
  }

  getCapability(capability: string, resourceType?: string): Capability | undefined {
    const key = this.buildKey(capability, resourceType || '*');
    return this.capabilities.get(key);
  }

  all(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  register(capability: string, resourceType: string, providers: CapabilityMatch[]): void {
    const key = this.buildKey(capability, resourceType);

    this.capabilities.set(key, {
      capability,
      resource_type: resourceType,
      providers,
    });
  }

  private buildKey(capability: string, resourceType: string = '*'): string {
    return `${capability}:${resourceType}`;
  }
}

export const capabilityEngine = new CapabilityEngineImpl();
