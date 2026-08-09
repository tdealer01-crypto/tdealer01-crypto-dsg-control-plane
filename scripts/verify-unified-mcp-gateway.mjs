#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const route = readFileSync('app/api/mcp/route.ts', 'utf8');
const tools = readFileSync('lib/mcp/unified-tools.ts', 'utf8');
const auth = readFileSync('lib/mcp/unified-auth.ts', 'utf8');
const awsWorkflow = readFileSync('.github/workflows/cdk-deploy.yml', 'utf8');

const requiredTools = [
  'dsg.system.status',
  'dsg.aimo.status',
  'dsg.aimo.solve',
  'dsg.aws.contract',
  'dsg.aws.deploy',
];

let failed = false;
function pass(message) {
  console.log(`PASS: ${message}`);
}
function fail(message) {
  failed = true;
  console.error(`FAIL: ${message}`);
}

if (route.includes("serverInfo: { name: 'dsg-control-plane-unified-mcp'")) {
  pass('MCP initialize identifies the unified control-plane server');
} else {
  fail('MCP initialize does not identify the unified control-plane server');
}

for (const tool of requiredTools) {
  if (tools.includes(`'${tool}'`)) pass(`tool registered: ${tool}`);
  else fail(`missing unified tool: ${tool}`);
}

if (
  tools.includes('DSG_AIMO_ROOT_KEY') &&
  tools.includes(".update('dsg-aimo-v1:control-plane')") &&
  tools.includes("'X-DSG-Internal-Key': internalToken") &&
  !/DSG_AIMO_ROOT_KEY\s*=\s*['"][^'"]+['"]/.test(tools)
) {
  pass('one AIMO root key derives a control-plane token; raw root is not hard-coded or sent');
} else {
  fail('derived control-plane root-token contract is missing');
}

if (
  route.includes('validateStoredUnifiedMcpKey') &&
  auth.includes("'validate_mcp_api_key'") &&
  auth.includes("'record_mcp_usage'") &&
  auth.includes('hashMcpApiKey') &&
  !route.includes('isUnifiedMcpKeyAuthorized')
) {
  pass('unified client auth uses the issued MCP key store, quota validator, and usage meter');
} else {
  fail('unified client auth bypasses or does not fully use the issued MCP key registry');
}

if (
  auth.includes(".from('users')") &&
  auth.includes(".from('runtime_roles')") &&
  tools.includes("auth.roles.includes('operator')") &&
  tools.includes("auth.roles.includes('org_admin')")
) {
  pass('stored-key actor/org role is resolved before AWS mutation entitlement');
} else {
  fail('AWS mutation entitlement is not bound to the stored-key actor role');
}

const evidenceKeys = [
  'secret_bound',
  'dependency_resolved',
  'testable',
  'deploy_target_ready',
  'audit_hook_available',
];
for (const evidenceKey of evidenceKeys) {
  if (tools.includes(`${evidenceKey}: evidence.${evidenceKey}`)) {
    pass(`AWS deterministic gate evidence supplied: ${evidenceKey}`);
  } else {
    fail(`missing AWS deterministic gate evidence: ${evidenceKey}`);
  }
}

if (
  tools.includes('listRepoSecrets') &&
  tools.includes("GET /repos/{owner}/{repo}/environments/{environment_name}") &&
  tools.includes("path: '.github/workflows/cdk-deploy.yml'")
) {
  pass('AWS evidence is inspected from GitHub workflow, secret bindings, and target environment');
} else {
  fail('AWS evidence is not sourced from the live repository contract');
}

if (tools.includes("verdict: 'REVIEW'") && tools.includes('post-deploy verification evidence')) {
  pass('AWS dispatch cannot be reported as final PASS');
} else {
  fail('AWS dispatch truth boundary is missing');
}

if (tools.includes("callDsgTool('dsg.evaluate'") && tools.includes("riskLevel: environment === 'prod' ? 'critical' : 'high'")) {
  pass('AWS mutation is routed through the DSG deterministic gate');
} else {
  fail('AWS deploy does not show deterministic gate enforcement');
}

if (
  tools.includes('findExistingAwsDispatch') &&
  tools.includes('duplicateSuppressed: true') &&
  awsWorkflow.includes('idempotency_key:') &&
  awsWorkflow.includes('run-name: DSG CDK ${{ inputs.environment }} ${{ inputs.idempotency_key }}') &&
  awsWorkflow.includes('group: dsg-cdk-${{ inputs.environment }}') &&
  awsWorkflow.includes('cancel-in-progress: false')
) {
  pass('AWS workflow dispatch is retry-idempotent and serialized per environment');
} else {
  fail('AWS workflow idempotency/concurrency contract is incomplete');
}

if (awsWorkflow.includes('id-token: write') && awsWorkflow.includes('DSGOneStack-$ENVIRONMENT')) {
  pass('AWS workflow uses OIDC and the corrected CDK stack contract');
} else {
  fail('AWS workflow dependency is not the corrected Agent Toolkit deployment contract');
}

if (failed) process.exit(1);
console.log('Unified DSG Control Plane MCP verification complete.');
