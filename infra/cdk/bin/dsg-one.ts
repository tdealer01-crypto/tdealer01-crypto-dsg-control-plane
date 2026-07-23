#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DSGOneStack } from '../lib/dsg-one-stack';
import { getConfig, EnvironmentType } from '../lib/config';

const app = new cdk.App();

// Get environment from context or environment variable
const env = (app.node.tryGetContext('env') || process.env.ENVIRONMENT || 'dev') as EnvironmentType;

// Load configuration for the environment
const config = getConfig(env);

// Create the stack
new DSGOneStack(app, `DSGOneStack-${env}`, {
  config,
  stackName: `dsg-one-${env}-v2`,
  description: `DSG ONE Infrastructure - ${env} environment`,
});
