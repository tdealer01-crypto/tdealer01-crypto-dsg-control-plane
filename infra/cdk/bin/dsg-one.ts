#!/usr/bin/env node

/**
 * DSG ONE CDK App Entry Point
 *
 * Deploy DSG ONE infrastructure to AWS
 */

import * as cdk from 'aws-cdk-lib';
import { DSGOneStack } from '../lib/dsg-one-stack';
import { getConfig } from '../lib/config/index';

const app = new cdk.App();

// Get environment from context or env var
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';

// Load configuration
const config = getConfig(environment);

// Create stack
new DSGOneStack(app, `DSGOneStack-${environment}`, {
  config,
});

// Synthesize
app.synth();
