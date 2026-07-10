export interface CapabilityQuery {
  capability: string;
  resource_type?: string;
  scope?: string;
}

export interface CapabilityMatch {
  provider_id: string;
  provider_name: string;
  confidence: number;
  supported_modes?: string[];
  sandbox_supported: boolean;
}

export interface Capability {
  capability: string;
  resource_type: string;
  description?: string;
  providers: CapabilityMatch[];
}

export interface CapabilityEngine {
  query(q: CapabilityQuery): CapabilityMatch[];
  getCapability(capability: string, resourceType?: string): Capability | undefined;
  all(): Capability[];
  register(capability: string, resourceType: string, providers: CapabilityMatch[]): void;
}
