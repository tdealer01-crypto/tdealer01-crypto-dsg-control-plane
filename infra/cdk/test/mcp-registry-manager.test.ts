import { describe, expect, it } from 'vitest';
import { MCPRegistryManager } from '../lib/utils/mcp-registry-manager';

const server = {
  name: 'test-mcp',
  description: 'test',
  version: '1.0.0',
  inlineContent: {},
};

describe('MCPRegistryManager legacy compatibility surface', () => {
  it('fails closed instead of fabricating create success', async () => {
    const manager = new MCPRegistryManager('Bq1kJxIL0SrRPIpe');
    await expect(manager.createRecord(server)).rejects.toThrow(
      'legacy implementation was synthetic'
    );
  });

  it('fails closed instead of fabricating approval or ready state', async () => {
    const manager = new MCPRegistryManager('Bq1kJxIL0SrRPIpe');
    await expect(manager.submitForApproval('record')).rejects.toThrow(
      'Use the AWS Agent Registry Control API'
    );
    await expect(manager.approveRecord('record')).rejects.toThrow(
      'Use the AWS Agent Registry Control API'
    );
    await expect(manager.waitForRecord('record')).rejects.toThrow(
      'Use the AWS Agent Registry Control API'
    );
  });

  it('fails closed instead of returning empty synthetic search results', async () => {
    const manager = new MCPRegistryManager('Bq1kJxIL0SrRPIpe');
    await expect(manager.searchRecords('dsg')).rejects.toThrow(
      'Use the AWS Agent Registry Control API'
    );
  });
});
