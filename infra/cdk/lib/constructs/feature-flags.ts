import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as appconfig from 'aws-cdk-lib/aws-appconfig';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface FeatureFlagsConstructProps {
  config: DSGConfig;
  encryptionKey: kms.Key;
}

/**
 * Feature Flags Construct
 *
 * Runtime feature gating using AWS AppConfig.
 * Enables canary deployments, gradual rollouts, kill switches.
 * Per-workspace, per-user feature control with dynamic updates.
 */
export class FeatureFlagsConstruct extends Construct {
  public readonly featureFlagsTable: dynamodb.Table;
  public readonly featureRolloutsTable: dynamodb.Table;
  public readonly appConfigApp: appconfig.CfnApplication;
  public readonly appConfigEnv: appconfig.CfnEnvironment;
  public readonly featureFlagsRole: iam.Role;
  public readonly featureGateFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: FeatureFlagsConstructProps) {
    super(scope, id);

    const { config, encryptionKey } = props;
    const resourcePrefix = config.resourcePrefix;

    // Feature Flags Table - feature definitions and configurations
    this.featureFlagsTable = new dynamodb.Table(this, 'FeatureFlagsTable', {
      tableName: `${resourcePrefix}-feature-flags`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'feature_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'workspace_id',
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Feature Rollouts Table - gradual rollout and canary tracking
    this.featureRolloutsTable = new dynamodb.Table(this, 'FeatureRolloutsTable', {
      tableName: `${resourcePrefix}-feature-rollouts`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'rollout_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // AWS AppConfig Application for feature flags
    this.appConfigApp = new appconfig.CfnApplication(this, 'FeatureFlagApp', {
      name: `${resourcePrefix}-feature-flags`,
      description: 'Feature flag configuration for DSG ONE',
      tags: {
        Component: 'FeatureFlags',
        Phase: '3-AI-Governance',
      },
    });

    // AWS AppConfig Environment
    this.appConfigEnv = new appconfig.CfnEnvironment(this, 'FeatureFlagEnv', {
      applicationId: this.appConfigApp.ref,
      name: config.environment,
      description: `${config.environment} environment feature flags`,
      monitors: [
        {
          alarmArn: `arn:aws:cloudwatch:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:alarm:${resourcePrefix}-feature-flag-errors`,
          alarmRoleArn: new iam.Role(this, 'AppConfigMonitorRole', {
            assumedBy: new iam.ServicePrincipal('appconfig.amazonaws.com'),
          }).roleArn,
        },
      ],
      tags: {
        Component: 'FeatureFlags',
        Environment: config.environment,
      },
    });

    // IAM Role for Feature Flag Operations
    this.featureFlagsRole = new iam.Role(this, 'FeatureFlagsRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for feature flag gating and gradual rollouts',
    });

    // Grant permissions
    this.featureFlagsTable.grantReadWriteData(this.featureFlagsRole);
    this.featureRolloutsTable.grantReadWriteData(this.featureFlagsRole);
    encryptionKey.grantEncryptDecrypt(this.featureFlagsRole);

    // Grant AppConfig permissions
    this.featureFlagsRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'appconfig:GetLatestConfiguration',
          'appconfig:GetConfiguration',
          'appconfig:StartConfigurationSession',
        ],
        resources: [
          `arn:aws:appconfig:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:application/${this.appConfigApp.ref}`,
        ],
      })
    );

    // Lambda function for feature gating
    this.featureGateFunction = new lambda.Function(this, 'FeatureGateFunction', {
      functionName: `${resourcePrefix}-feature-gate`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Feature gating logic:
          // 1. Get feature flag from DynamoDB (cached via AppConfig)
          // 2. Check workspace/user eligibility
          // 3. Apply rollout percentage
          // 4. Return feature enabled/disabled status
          // 5. Log for analytics
          return {
            statusCode: 200,
            body: JSON.stringify({
              featureId: event.featureId,
              workspaceId: event.workspaceId,
              enabled: event.rolloutPercentage >= (Math.random() * 100),
              rolloutPercentage: event.rolloutPercentage,
              canaryMode: event.canaryMode || false,
            }),
          };
        };
      `),
      role: this.featureFlagsRole,
      environment: {
        FEATURE_FLAGS_TABLE: this.featureFlagsTable.tableName,
        ROLLOUTS_TABLE: this.featureRolloutsTable.tableName,
        APPCONFIG_APP: this.appConfigApp.ref,
        APPCONFIG_ENV: this.appConfigEnv.ref,
      },
      timeout: cdk.Duration.seconds(5),
      memorySize: 256,
      description: 'Runtime feature gating with canary and gradual rollout support',
    });

    // Add tags
    cdk.Tags.of(this).add('Component', 'FeatureFlags');
    cdk.Tags.of(this).add('Phase', '3-AI-Governance');
  }
}
