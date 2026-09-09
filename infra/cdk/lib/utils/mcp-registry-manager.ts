export interface MCPServerConfig {
  name: string;
  description: string;
  version: string;
  inlineContent: Record<string, unknown>;
}

/**
 * Legacy compatibility surface.
 *
 * The previous implementation returned synthetic record IDs and success states
 * without calling AWS. That behavior is prohibited by the DSG no-mock/no-false-
 * data boundary. Keep this class exported so existing imports fail at runtime
 * with an explicit migration error instead of silently fabricating Registry
 * state.
 *
 * Use the real AWS Agent Registry Control API (`agent-registry-control`) for
 * Registry mutations and reads.
 */
export class MCPRegistryManager {
  private readonly registryId: string;
  private readonly region: string;

  constructor(registryId: string, region: string = 'us-east-1') {
    this.registryId = registryId;
    this.region = region;
  }

  private unsupported(operation: string): never {
    throw new Error(
      `MCPRegistryManager.${operation} is disabled: the legacy implementation was synthetic. ` +
        `Use the AWS Agent Registry Control API in ${this.region} for registry ${this.registryId}.`
    );
  }

  async createRecord(_serverConfig: MCPServerConfig): Promise<string> {
    return this.unsupported('createRecord');
  }

  async submitForApproval(_recordId: string): Promise<void> {
    return this.unsupported('submitForApproval');
  }

  async approveRecord(_recordId: string, _reason: string = 'Approved by operator'): Promise<void> {
    return this.unsupported('approveRecord');
  }

  async waitForRecord(_recordId: string, _maxAttempts: number = 60): Promise<boolean> {
    return this.unsupported('waitForRecord');
  }

  async publishRecord(_serverConfig: MCPServerConfig): Promise<string> {
    return this.unsupported('publishRecord');
  }

  async searchRecords(_query: string, _maxResults: number = 10): Promise<Record<string, unknown>[]> {
    return this.unsupported('searchRecords');
  }
}
