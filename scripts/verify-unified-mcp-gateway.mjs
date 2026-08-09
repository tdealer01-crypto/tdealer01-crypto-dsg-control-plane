#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const route = readFileSync('app/api/mcp/route.ts', 'utf8');
const tools = readFileSync('lib/mcp/unified-tools.ts', 'utf8');
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

if (awsWorkflow.includes('id-token: write') && awsWorkflow.includes('DSGOneStack-$ENVIRONMENT')) {
  pass('AWS workflow uses OIDC and the corrected CDK stack contract');
} else {
  fail('AWS workflow dependency is not the corrected Agent Toolkit deployment contract');
}

if (route.includes('isUnifiedMcpKeyAuthorized') && route.includes("requireOrgRole(['operator', 'org_admin'])")) {
  pass('unified high-value tools require API-key or operator-session authorization');
} else {
  fail('unified tool authorization gate is missing');
}

if (failed) process.exit(1);
console.log('Unified DSG Control Plane MCP verification complete.');
