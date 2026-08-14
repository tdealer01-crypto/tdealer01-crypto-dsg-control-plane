#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const EXPECTED_MCP_ENDPOINT = 'https://aws-mcp.us-east-1.api.aws/mcp';
const EXPECTED_PROXY = 'mcp-proxy-for-aws==1.6.3';
const EXPECTED_STACK_PREFIX = 'DSGOneStack-';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${path} is not valid JSON: ${error.message}`);
    return null;
  }
}

const mcp = loadJson('.mcp.json');
const awsMcp = mcp?.mcpServers?.['aws-mcp'];

if (!awsMcp) {
  fail('.mcp.json is missing mcpServers.aws-mcp');
} else {
  if (awsMcp.command === 'uvx') pass('AWS MCP uses uvx proxy transport');
  else fail('AWS MCP command must be uvx');

  if (Array.isArray(awsMcp.args) && awsMcp.args.includes(EXPECTED_PROXY)) {
    pass(`AWS MCP proxy is pinned to ${EXPECTED_PROXY}`);
  } else {
    fail(`AWS MCP proxy must be pinned to ${EXPECTED_PROXY}`);
  }

  if (Array.isArray(awsMcp.args) && awsMcp.args.includes(EXPECTED_MCP_ENDPOINT)) {
    pass('AWS MCP uses the managed AWS endpoint');
  } else {
    fail(`AWS MCP endpoint must be ${EXPECTED_MCP_ENDPOINT}`);
  }
}

const workflow = readFileSync('.github/workflows/cdk-deploy.yml', 'utf8');

if (/permissions:\s*\n\s+id-token:\s*write\s*\n\s+contents:\s*read/m.test(workflow)) {
  pass('CDK deploy workflow grants GitHub OIDC token permission');
} else {
  fail('CDK deploy workflow must grant id-token: write and contents: read');
}

if (workflow.includes(`npx cdk deploy \"${EXPECTED_STACK_PREFIX}$ENVIRONMENT\"`)) {
  pass('CDK deploy workflow targets the stack ID created by the CDK app');
} else {
  fail(`CDK deploy workflow must deploy ${EXPECTED_STACK_PREFIX}$ENVIRONMENT`);
}

if (/aws-actions\/configure-aws-credentials@v4/.test(workflow)) {
  pass('CDK deploy workflow authenticates to AWS with configure-aws-credentials');
} else {
  fail('CDK deploy workflow is missing AWS credential configuration');
}

if (process.env.DSG_VERIFY_AWS_LOCAL === '1') {
  const awsVersion = spawnSync('aws', ['--version'], { encoding: 'utf8' });
  if (awsVersion.status === 0) pass(`AWS CLI detected: ${(awsVersion.stdout || awsVersion.stderr).trim()}`);
  else fail('AWS CLI is not available locally');

  const uvxVersion = spawnSync('uvx', ['--version'], { encoding: 'utf8' });
  if (uvxVersion.status === 0) pass(`uvx detected: ${(uvxVersion.stdout || uvxVersion.stderr).trim()}`);
  else fail('uvx is not available locally');
}

if (!process.exitCode) {
  console.log('AWS Agent Toolkit integration verification complete.');
}
