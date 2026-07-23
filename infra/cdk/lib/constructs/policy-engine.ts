import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface PolicyEngineConstructProps {
  config: DSGConfig;
  encryptionKey: kms.Key;
}

/**
 * Policy Engine Construct
 *
 * Manages deterministic policy evaluation, constraint satisfaction checking,
 * and formal verification using Z3 SMT solver. Stores policy versions,
 * evaluation results, and deterministic proofs for audit trail.
 */
export class PolicyEngineConstruct extends Construct {
  public readonly policiesTable: dynamodb.Table;
  public readonly policyVersionsTable: dynamodb.Table;
  public readonly constraintEvaluationTable: dynamodb.Table;
  public readonly policiesBucket: s3.Bucket;
  public readonly evaluationRole: iam.Role;
  public readonly policyEvaluationFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: PolicyEngineConstructProps) {
    super(scope, id);

    const { config, encryptionKey } = props;
    const environment = config.environment;

    // Policy Versions Table - immutable policy history
    this.policyVersionsTable = new dynamodb.Table(this, 'PolicyVersionsTable', {
      tableName: `${config.resourcePrefix}-policy-versions`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'policy_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'version',
        type: dynamodb.AttributeType.NUMBER,
      },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: environment === 'prod' ? undefined : 'ttl',
    });

    // Policies Table - current active policies
    this.policiesTable = new dynamodb.Table(this, 'PoliciesTable', {
      tableName: `${config.resourcePrefix}-policies`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'policy_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'scope',
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Constraint Evaluation Results Table - Z3 proof results
    this.constraintEvaluationTable = new dynamodb.Table(this, 'ConstraintEvaluationTable', {
      tableName: `${config.resourcePrefix}-constraint-evaluations`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'evaluation_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // Policies S3 Bucket - policy definitions and proofs
    this.policiesBucket = new s3.Bucket(this, 'PoliciesBucket', {
      bucketName: `${config.resourcePrefix}-policies-${config.aws.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      enforceSSL: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: cdk.Duration.days(90),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // IAM Role for Policy Evaluation
    this.evaluationRole = new iam.Role(this, 'PolicyEvaluationRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for policy evaluation and Z3 constraint checking',
    });

    // Grant permissions to DynamoDB tables
    this.policiesTable.grantReadWriteData(this.evaluationRole);
    this.policyVersionsTable.grantReadData(this.evaluationRole);
    this.constraintEvaluationTable.grantReadWriteData(this.evaluationRole);

    // Grant permissions to S3 bucket
    this.policiesBucket.grantReadWrite(this.evaluationRole);

    // Grant KMS permissions
    encryptionKey.grantEncryptDecrypt(this.evaluationRole);

    // Lambda function for policy evaluation
    this.policyEvaluationFunction = new lambda.Function(this, 'PolicyEvaluationFunction', {
      functionName: `${config.resourcePrefix}-policy-evaluation`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Policy evaluation logic will be implemented by DSG team
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Policy evaluation endpoint',
              policyId: event.policyId,
              constraints: event.constraints,
            }),
          };
        };
      `),
      role: this.evaluationRole,
      environment: {
        POLICIES_TABLE: this.policiesTable.tableName,
        POLICY_VERSIONS_TABLE: this.policyVersionsTable.tableName,
        CONSTRAINT_EVALUATION_TABLE: this.constraintEvaluationTable.tableName,
        POLICIES_BUCKET: this.policiesBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      description: 'Deterministic policy evaluation with Z3 constraint checking',
    });

    // Add tags
    cdk.Tags.of(this).add('Component', 'PolicyEngine');
    cdk.Tags.of(this).add('Phase', '3-AI-Governance');
  }
}
