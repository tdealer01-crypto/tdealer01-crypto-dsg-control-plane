import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const identity = JSON.parse(readFileSync('config/azure-github-oidc-identity.json', 'utf8')) as {
  schemaVersion: string;
  clientId: string;
  tenantId: string;
  subscriptionId: string;
  resourceGroup: string;
  federatedSubject: string;
  audience: string;
};

const workflow = readFileSync('.github/workflows/promoted-production-deploy-v2.yml', 'utf8');
const broker = readFileSync('app/api/dsg/ops/runner-bootstrap/broker/route.ts', 'utf8');

describe('Azure GitHub OIDC identity contract', () => {
  it('pins the execution-verified non-secret identity and exact prod subject', () => {
    expect(identity).toMatchObject({
      schemaVersion: 'dsg.azure-github-oidc-identity.v1',
      clientId: 'bd54ab6e-5f92-48c8-8f8d-0c114ef938da',
      tenantId: 'cbc618d5-9aa3-46b5-ae64-d07794603a7a',
      subscriptionId: 'dcf13c0d-0d9f-4f81-aa89-c6b50aaef839',
      resourceGroup: 'rg-t.dealer01-0468',
      federatedSubject:
        'repo:tdealer01-crypto@260597462/tdealer01-crypto-dsg-control-plane@1186640068:environment:prod',
      audience: 'api://AzureADTokenExchange',
    });
  });

  it('keeps deploy and runner bootstrap on the same identity source', () => {
    expect(workflow).toContain("IDENTITY_FILE='config/azure-github-oidc-identity.json'");
    expect(workflow).toContain('AZURE_CLIENT_ID_CANDIDATE');
    expect(workflow).toContain('CONFIG_CLIENT_ID');
    expect(broker).toContain("import azureGitHubOidcIdentity from '@/config/azure-github-oidc-identity.json'");
    expect(broker).toContain('DSG_AZURE_GITHUB_OIDC_CLIENT_ID');
    expect(broker).not.toContain('process.env.AZURE_CLIENT_ID?.trim()');
  });
});
