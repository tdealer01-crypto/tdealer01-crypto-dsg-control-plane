import * as AWS from 'aws-sdk';

export interface MCPServerConfig {
  name: string;
  description: string;
  version: string;
  inlineContent: Record<string, unknown>;
}

export class MCPRegistryManager {
  private client: AWS.BedrockAgentCoreControl;
  private registryId: string;

  constructor(registryId: string, region: string = 'us-east-1') {
    this.client = new AWS.BedrockAgentCoreControl({ region });
    this.registryId = registryId;
  }

  async createRecord(serverConfig: MCPServerConfig): Promise<string> {
    console.log(`Creating MCP registry record: ${serverConfig.name}`);

    const response = await this.client
      .createRegistryRecord({
        registryId: this.registryId,
        name: serverConfig.name,
        descriptorType: 'MCP',
        descriptors: {
          mcp: {
            server: {
              inlineContent: JSON.stringify(serverConfig.inlineContent),
            },
          },
        },
      })
      .promise();

    const recordId = response.recordArn!.split('/').pop()!;
    console.log(`✅ Record created: ${recordId}`);
    return recordId;
  }

  async submitForApproval(recordId: string): Promise<void> {
    console.log(`Submitting record for approval: ${recordId}`);
    await this.client
      .submitRegistryRecordForApproval({
        registryId: this.registryId,
        recordId,
      })
      .promise();
    console.log('✅ Submitted for approval');
  }

  async approveRecord(recordId: string, reason: string = 'Approved by CDK'): Promise<void> {
    console.log(`Approving record: ${recordId}`);
    await this.client
      .updateRegistryRecordStatus({
        registryId: this.registryId,
        recordId,
        status: 'APPROVED',
        statusReason: reason,
      })
      .promise();
    console.log('✅ Record approved');
  }

  async waitForRecord(recordId: string, maxAttempts: number = 60): Promise<boolean> {
    console.log(`Waiting for record to be ready: ${recordId}`);
    for (let i = 0; i < maxAttempts; i++) {
      const response = await this.client
        .getRegistryRecord({
          registryId: this.registryId,
          recordId,
        })
        .promise();

      if (response.status !== 'CREATING') {
        console.log(`✅ Record status: ${response.status}`);
        return true;
      }

      console.log(`  Status: ${response.status}, waiting...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    console.error('❌ Timeout waiting for record');
    return false;
  }

  async publishRecord(serverConfig: MCPServerConfig): Promise<string> {
    const recordId = await this.createRecord(serverConfig);
    await this.waitForRecord(recordId);
    await this.submitForApproval(recordId);
    await this.approveRecord(recordId);
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait for index
    return recordId;
  }

  async searchRecords(query: string, maxResults: number = 10): Promise<Record<string, unknown>[]> {
    const response = await this.client
      .searchRegistryRecords({
        registryIds: [this.registryId],
        searchQuery: query,
        maxResults,
      })
      .promise();

    return response.registryRecords || [];
  }
}
