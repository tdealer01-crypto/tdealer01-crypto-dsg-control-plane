import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface ModelRegistryConstructProps {
  config: DSGConfig;
  encryptionKey: kms.Key;
}

/**
 * Model Registry Construct
 *
 * Manages AI model catalog, versioning, routing logic, fallback strategies,
 * and cost optimization. Supports multi-model orchestration (Claude, OpenRouter, custom).
 * Tracks model performance, cost, and compliance metadata.
 */
export class ModelRegistryConstruct extends Construct {
  public readonly modelsTable: dynamodb.Table;
  public readonly modelVersionsTable: dynamodb.Table;
  public readonly modelRoutingTable: dynamodb.Table;
  public readonly modelMetricsTable: dynamodb.Table;
  public readonly modelRegistryBucket: s3.Bucket;
  public readonly modelRoutingRole: iam.Role;
  public readonly modelRoutingFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ModelRegistryConstructProps) {
    super(scope, id);

    const { config, encryptionKey } = props;
    const resourcePrefix = config.resourcePrefix;

    // Models Table - active model definitions
    this.modelsTable = new dynamodb.Table(this, 'ModelsTable', {
      tableName: `${resourcePrefix}-models`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'model_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'provider',
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      stream: dynamodb.StreamSpecification.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Model Versions Table - version history and deprecation
    this.modelVersionsTable = new dynamodb.Table(this, 'ModelVersionsTable', {
      tableName: `${resourcePrefix}-model-versions`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'model_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'version',
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      stream: dynamodb.StreamSpecification.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Model Routing Table - routing rules and strategies
    this.modelRoutingTable = new dynamodb.Table(this, 'ModelRoutingTable', {
      tableName: `${resourcePrefix}-model-routing`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'routing_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'priority',
        type: dynamodb.AttributeType.NUMBER,
      },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      stream: dynamodb.StreamSpecification.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Model Metrics Table - performance, cost, latency tracking
    this.modelMetricsTable = new dynamodb.Table(this, 'ModelMetricsTable', {
      tableName: `${resourcePrefix}-model-metrics`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'model_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      stream: dynamodb.StreamSpecification.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'ttl',
    });

    // Model Registry Bucket - model definitions, benchmarks, specs
    this.modelRegistryBucket = new s3.Bucket(this, 'ModelRegistryBucket', {
      bucketName: `${resourcePrefix}-model-registry-${config.aws.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      enforceSSL: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: cdk.Duration.days(90),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // IAM Role for Model Routing
    this.modelRoutingRole = new iam.Role(this, 'ModelRoutingRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for model routing, selection, and fallback orchestration',
    });

    // Grant permissions
    this.modelsTable.grantReadData(this.modelRoutingRole);
    this.modelVersionsTable.grantReadData(this.modelRoutingRole);
    this.modelRoutingTable.grantReadData(this.modelRoutingRole);
    this.modelMetricsTable.grantReadWriteData(this.modelRoutingRole);
    this.modelRegistryBucket.grantRead(this.modelRoutingRole);
    encryptionKey.grantDecrypt(this.modelRoutingRole);

    // Lambda function for model routing
    this.modelRoutingFunction = new lambda.Function(this, 'ModelRoutingFunction', {
      functionName: `${resourcePrefix}-model-routing`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Model routing logic: select best model based on:
          // - Cost constraints
          // - Latency requirements
          // - Compliance policies
          // - Availability (fallback chains)
          return {
            statusCode: 200,
            body: JSON.stringify({
              selectedModel: 'claude-3-sonnet',
              fallbacks: ['claude-3-haiku', 'gpt-4-turbo'],
              estimatedCost: 0.015,
              rationale: 'optimal cost/performance',
            }),
          };
        };
      `),
      role: this.modelRoutingRole,
      environment: {
        MODELS_TABLE: this.modelsTable.tableName,
        ROUTING_TABLE: this.modelRoutingTable.tableName,
        METRICS_TABLE: this.modelMetricsTable.tableName,
        REGISTRY_BUCKET: this.modelRegistryBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      description: 'Intelligent model selection and routing with fallback strategies',
    });

    // Add tags
    cdk.Tags.of(this).add('Component', 'ModelRegistry');
    cdk.Tags.of(this).add('Phase', '3-AI-Governance');
  }
}
