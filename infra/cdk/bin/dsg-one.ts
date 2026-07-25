#!/usr/bin/env node

/**
 * DSG ONE CDK App Entry Point
 *
 * Deploy DSG ONE infrastructure to AWS
 */

import * as cdk from 'aws-cdk-lib';
import { DSGOneStack, BedrockAgentCoreStack } from '../lib';
import { getConfig } from '../lib/config/index';

const app = new cdk.App();

// Get environment from context or env var
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';

// Load configuration
const config = getConfig(environment);

// Create main stack
new DSGOneStack(app, `DSGOneStack-${environment}`, {
  config,
});

// Create Bedrock Agent Core stack (for MCP registry + AI governance)
const registryId = process.env.BEDROCK_REGISTRY_ID || 'cGcvetJOMzWh3xmj';
const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID || 'us-east-1_ZtxWdHzFJ';
const cognitoClientId = process.env.COGNITO_CLIENT_ID || '7njqeoh6bq64s6u44oo9vghfcg';

new BedrockAgentCoreStack(app, `BedrockAgentCoreStack-${environment}`, {
  environment: environment as 'dev' | 'staging' | 'prod',
  registryId,
  cognitoUserPoolId,
  cognitoClientId,
});

// Synthesize
app.synth();
