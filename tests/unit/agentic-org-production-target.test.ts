import { describe, expect, it } from 'vitest';
import productionTarget from '../../config/production-deployment-target.json';

describe('canonical production deployment target', () => {
  it('binds Azure App Service with distinct forward and rollback adapters', () => {
    expect(productionTarget.provider).toBe('AZURE_APP_SERVICE');
    expect(productionTarget.productionDeployEnabled).toBe(true);
    expect(productionTarget.deploymentAdapter).toBe(
      '.github/workflows/promoted-production-deploy.yml#azure-app-service',
    );
    expect(productionTarget.rollbackAdapter).toBe('AZURE');
    expect(productionTarget.rollbackAdapter).not.toBe(productionTarget.deploymentAdapter);
  });

  it('binds rollback to the signed HTTPS Control Plane endpoint', () => {
    const endpoint = new URL(productionTarget.rollbackAdapterEndpoint);
    expect(endpoint.protocol).toBe('https:');
    expect(endpoint.hostname).toBe('dsg-control-plane.azurewebsites.net');
    expect(endpoint.pathname).toBe('/api/dsg/agentic-org/rollback-adapters/azure');
  });
});
