#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const ROOT = process.cwd();
const read = (path) => readFileSync(`${ROOT}/${path}`, 'utf8');
const json = (path) => JSON.parse(read(path));

const packageContract = json('config/aws-marketplace-mcp-server.json');
const productionTarget = json('config/production-deployment-target.json');
const mcpRoute = read('app/api/mcp/governance/route.ts');
const openApiRoute = read('app/api/dsg/governance/openapi/route.ts');
const governancePlugin = read('lib/dsg/governance-plugin.ts');

let failures = 0;

function pass(message) {
  console.log(`PASS  ${message}`);
}

function fail(message) {
  failures += 1;
  console.error(`FAIL  ${message}`);
}

function check(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

function contains(source, value) {
  return source.includes(value);
}

function sameOrigin(left, right) {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

console.log('AWS Marketplace MCP package — static verification');

check(
  packageContract.product?.deliveryMethod === 'API-Based Agents & Tools' &&
    packageContract.product?.integrationProtocol === 'MCP' &&
    packageContract.product?.type === 'MCP server',
  'Package declares API-Based Agents & Tools / MCP / MCP server',
);
check(
  packageContract.product?.title === 'DSG Spacetime — Governed MCP Execution Gateway',
  'Product positioning is locked to the governed execution gateway',
);
check(
  productionTarget.provider === 'AZURE_APP_SERVICE',
  'Current production authority is Azure App Service',
);
check(
  packageContract.runtime?.provider === productionTarget.provider,
  'Marketplace package provider matches production authority',
);
check(
  packageContract.runtime?.endpointType === 'static' &&
    packageContract.runtime?.endpointPath === '/api/mcp/governance',
  'Package uses the dedicated static governance MCP endpoint',
);
check(
  sameOrigin(
    packageContract.runtime?.candidateEndpointUrl,
    productionTarget.rollbackAdapterEndpoint,
  ),
  'Candidate Marketplace endpoint uses the same Azure App Service origin recorded by production authority',
);

check(contains(mcpRoute, "const TOOL_NAME = 'dsg.governance.preflight'"), 'Dedicated MCP exports dsg.governance.preflight');
check(contains(mcpRoute, "rpc.method === 'initialize'"), 'Dedicated MCP implements initialize');
check(contains(mcpRoute, "rpc.method === 'tools/list'"), 'Dedicated MCP implements tools/list');
check(contains(mcpRoute, "rpc.method === 'tools/call'"), 'Dedicated MCP implements tools/call');
check(contains(mcpRoute, 'validateStoredUnifiedMcpKey'), 'Dedicated MCP validates stored DSG MCP API keys');
check(contains(mcpRoute, "transport: 'MCP JSON-RPC over HTTP'"), 'Dedicated endpoint declares MCP JSON-RPC over HTTP');
check(
  contains(mcpRoute, "protocolVersion: '2024-11-05'") &&
    packageContract.mcpCompatibility?.currentInitializeProtocolVersion === '2024-11-05',
  'Package records the exact MCP initialize protocol version implemented by the route',
);
check(
  packageContract.mcpCompatibility?.awsMarketplaceClientCompatibility === 'PENDING_REAL_CLIENT_VALIDATION',
  'AWS Marketplace client compatibility remains explicitly pending real-client validation',
);

check(contains(openApiRoute, "openapi: '3.1.0'"), 'Governance OpenAPI surface is present');
check(contains(openApiRoute, "'/api/dsg/governance/preflight'"), 'OpenAPI exposes governance preflight');
check(contains(openApiRoute, "name: 'x-dsg-api-key'"), 'OpenAPI declares the DSG API-key header');

check(contains(governancePlugin, 'lookupPlanContract'), 'Governance runtime resolves an approved plan contract');
check(contains(governancePlugin, 'evaluatePlanAlignment'), 'Governance runtime evaluates plan alignment');
check(contains(governancePlugin, "status = 'BLOCKED'"), 'Governance runtime has an explicit BLOCKED decision');
check(contains(governancePlugin, "status = 'WAITING_PERMISSION'"), 'Governance runtime has an explicit WAITING_PERMISSION decision');
check(contains(governancePlugin, "status = 'PASS'"), 'Governance runtime has an explicit PASS decision');
check(contains(governancePlugin, ".from('dsg_audit_events').insert"), 'Governance runtime persists execution audit records');
check(contains(governancePlugin, "'DO_NOT_EXECUTE'"), 'Blocked decisions emit DO_NOT_EXECUTE');
check(contains(governancePlugin, "'CONTINUE_TO_TARGET'"), 'Plan-authorized decisions can emit CONTINUE_TO_TARGET');

check(
  packageContract.fulfillment?.selectedMethodForFirstProduct === 'REDIRECT_TO_WEBSITE' &&
    packageContract.fulfillment?.selectionStatus === 'RECOMMENDED_NOT_PUBLISHED',
  'First-product fulfillment choice is Redirect to Website and is not falsely claimed published',
);
check(
  packageContract.fulfillment?.postPublishMutable === false &&
    packageContract.fulfillment?.quickLaunchStatus === 'NOT_SELECTED_FOR_THIS_PRODUCT' &&
    packageContract.fulfillment?.deploymentApiStatus === 'NOT_REQUIRED_FOR_REDIRECT_TO_WEBSITE',
  'Fulfillment contract prevents the false claim that Quick Launch can be enabled later on the same published product',
);

check(
  packageContract.marketplaceCommercialIntegration?.sellerEligibility === 'UNVERIFIED_EXTERNAL_ACCOUNT_STATE',
  'Seller eligibility remains explicitly unverified',
);
check(
  packageContract.marketplaceCommercialIntegration?.resolveCustomer === 'NOT_IMPLEMENTED',
  'ResolveCustomer is not falsely claimed as implemented',
);
check(
  packageContract.marketplaceCommercialIntegration?.entitlementOrSubscriptionState === 'NOT_IMPLEMENTED',
  'Marketplace entitlement/subscription integration is not falsely claimed as implemented',
);
check(
  packageContract.truthBoundary?.staticPackagePassIsMarketplaceEligibility === false &&
    packageContract.truthBoundary?.staticPackagePassIsLiveEndpointProof === false &&
    packageContract.truthBoundary?.declaredLiveBlockIsLiveEndpointPass === false &&
    packageContract.truthBoundary?.mcpDiscoveryPassIsAwsClientCompatibilityProof === false &&
    packageContract.truthBoundary?.privateOfferReady === false,
  'Truth boundary prevents static/live-state packaging from being reported as Marketplace, client-compatibility, or private-offer readiness',
);

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyLive(baseUrl) {
  const base = baseUrl.replace(/\/$/, '');
  const mcpUrl = `${base}/api/mcp/governance`;
  const openApiUrl = `${base}/api/dsg/governance/openapi`;

  console.log(`\nAWS Marketplace MCP package — live discovery verification: ${base}`);

  const discovery = await fetchJson(mcpUrl);
  check(discovery.response.ok, `GET ${mcpUrl} returns HTTP success`);
  check(discovery.body?.server === 'dsg-governance-plugin', 'Live discovery identifies dsg-governance-plugin');
  check(
    discovery.body?.tools?.some?.((tool) => tool?.name === 'dsg.governance.preflight'),
    'Live discovery exposes dsg.governance.preflight',
  );

  const initialize = await fetchJson(mcpUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'aws-marketplace-init', method: 'initialize', params: {} }),
  });
  check(initialize.response.ok, 'Live MCP initialize returns HTTP success');
  check(
    initialize.body?.result?.serverInfo?.name === 'dsg-governance-plugin',
    'Live MCP initialize returns expected server identity',
  );
  check(
    initialize.body?.result?.protocolVersion === packageContract.mcpCompatibility?.currentInitializeProtocolVersion,
    'Live MCP initialize protocol version matches the package contract',
  );

  const toolList = await fetchJson(mcpUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'aws-marketplace-list', method: 'tools/list', params: {} }),
  });
  check(toolList.response.ok, 'Live MCP tools/list returns HTTP success');
  check(
    Array.isArray(toolList.body?.result?.tools) &&
      toolList.body.result.tools.some((tool) => tool?.name === 'dsg.governance.preflight'),
    'Live MCP tools/list includes dsg.governance.preflight',
  );

  const openApi = await fetchJson(openApiUrl);
  check(openApi.response.ok, `GET ${openApiUrl} returns HTTP success`);
  check(openApi.body?.openapi === '3.1.0', 'Live OpenAPI document is version 3.1.0');
  check(
    Boolean(openApi.body?.paths?.['/api/dsg/governance/preflight']?.post),
    'Live OpenAPI exposes governance preflight POST',
  );
}

function parseCase(envName) {
  const raw = process.env[envName];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`${envName} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function callGovernanceCase(baseUrl, apiKey, id, args) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/mcp/governance`;
  return fetchJson(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-dsg-api-key': apiKey,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name: 'dsg.governance.preflight', arguments: args },
    }),
  });
}

async function verifyAuthenticatedAllowBlock(baseUrl) {
  const apiKey = process.env.DSG_MARKETPLACE_MCP_API_KEY;
  const allowCase = parseCase('DSG_MARKETPLACE_ALLOW_CASE_JSON');
  const blockCase = parseCase('DSG_MARKETPLACE_BLOCK_CASE_JSON');

  if (!apiKey || !allowCase || !blockCase) {
    console.log('\nSKIP  Authenticated ALLOW/BLOCK E2E: provide DSG_MARKETPLACE_MCP_API_KEY, DSG_MARKETPLACE_ALLOW_CASE_JSON and DSG_MARKETPLACE_BLOCK_CASE_JSON');
    return;
  }

  console.log('\nAWS Marketplace MCP package — authenticated ALLOW/BLOCK verification');

  const allowed = await callGovernanceCase(baseUrl, apiKey, 'aws-marketplace-allow', allowCase);
  const allowedResult = allowed.body?.result?.structuredContent;
  check(allowed.response.ok, 'Approved-plan E2E call returns HTTP success');
  check(allowedResult?.policyAllowsAction === true, 'Approved-plan E2E is policy-authorized');
  check(allowedResult?.shouldBlock === false, 'Approved-plan E2E is allowed to continue');
  check(allowedResult?.panels?.executionAudit?.persisted === true, 'Approved-plan E2E persists audit evidence');

  const blocked = await callGovernanceCase(baseUrl, apiKey, 'aws-marketplace-block', blockCase);
  const blockedResult = blocked.body?.result?.structuredContent;
  check(blocked.response.ok, 'Outside-plan E2E call returns MCP tool response');
  check(blockedResult?.status === 'BLOCKED', 'Outside-plan E2E returns BLOCKED');
  check(blockedResult?.shouldBlock === true, 'Outside-plan E2E emits an enforce-mode block');
  check(blockedResult?.panels?.executionAudit?.persisted === true, 'Outside-plan E2E persists audit evidence');
}

const liveBase = process.env.AWS_MARKETPLACE_MCP_BASE_URL;
if (liveBase) {
  try {
    await verifyLive(liveBase);
    await verifyAuthenticatedAllowBlock(liveBase);
  } catch (error) {
    fail(`Live verification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
} else {
  console.log('\nSKIP  Live discovery: set AWS_MARKETPLACE_MCP_BASE_URL to the exact production origin');
  console.log('SKIP  Authenticated ALLOW/BLOCK E2E until live origin + real API key + real plan fixtures are supplied');
}

if (failures > 0) {
  console.error(`\nAWS_MARKETPLACE_MCP_PACKAGE=FAIL failures=${failures}`);
  process.exit(1);
}

console.log('\nAWS_MARKETPLACE_MCP_PACKAGE=STATIC_PASS_LIVE_AND_COMMERCIAL_VALIDATION_PENDING');
