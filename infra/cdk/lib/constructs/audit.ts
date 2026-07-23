import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface AuditConstructProps {
  config: DSGConfig;
  encryptionKey: kms.Key;
}

/**
 * Advanced Audit Construct
 *
 * Immutable, tamper-proof audit trail using hash chains (Merkle tree).
 * Tracks all governance decisions, policy changes, execution events.
 * Cryptographically verifiable audit log for compliance and forensics.
 */
export class AuditConstruct extends Construct {
  public readonly auditTable: dynamodb.Table;
  public readonly hashChainTable: dynamodb.Table;
  public readonly auditBucket: s3.Bucket;
  public readonly auditLogGroup: logs.LogGroup;
  public readonly auditRole: iam.Role;

  constructor(scope: Construct, id: string, props: AuditConstructProps) {
    super(scope, id);

    const { config, encryptionKey } = props;
    const resourcePrefix = config.resourcePrefix;

    // Audit Events Table - immutable event log
    this.auditTable = new dynamodb.Table(this, 'AuditTable', {
      tableName: `${resourcePrefix}-audit-events`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'organization_id',
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
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for event type queries
    this.auditTable.addGlobalSecondaryIndex({
      indexName: 'EventTypeIndex',
      partitionKey: {
        name: 'event_type',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Hash Chain Table - Merkle tree for tamper detection
    this.hashChainTable = new dynamodb.Table(this, 'HashChainTable', {
      tableName: `${resourcePrefix}-hash-chain`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'chain_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'block_height',
        type: dynamodb.AttributeType.NUMBER,
      },
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Audit Bucket - long-term audit exports, compliance reports
    this.auditBucket = new s3.Bucket(this, 'AuditBucket', {
      bucketName: `${resourcePrefix}-audit-${config.aws.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      enforceSSL: true,
      objectLockEnabled: true,
      objectLockDefaultRetention: {
        mode: s3.ObjectLockMode.GOVERNANCE,
        duration: cdk.Duration.days(2555), // 7 years for compliance
      },
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(365),
            },
          ],
        },
      ],
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Audit Log Group - CloudWatch Logs (KMS encryption only for production)
    const auditLogProps: logs.LogGroupProps =
      config.environment === 'prod'
        ? {
            logGroupName: `/dsg-one/${config.environment}/audit`,
            retention: logs.RetentionDays.FIVE_YEARS,
            encryptionKey: encryptionKey,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
          }
        : {
            logGroupName: `/dsg-one/${config.environment}/audit`,
            retention: logs.RetentionDays.FIVE_YEARS,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          };

    this.auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', auditLogProps);

    // IAM Role for Audit Operations
    this.auditRole = new iam.Role(this, 'AuditRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for immutable audit trail operations',
    });

    // Grant permissions
    this.auditTable.grantReadWriteData(this.auditRole);
    this.hashChainTable.grantReadWriteData(this.auditRole);
    this.auditBucket.grantReadWrite(this.auditRole);
    this.auditLogGroup.grantWrite(this.auditRole);
    encryptionKey.grantEncryptDecrypt(this.auditRole);

    // Deny deletion from audit table and bucket
    this.auditRole.attachInlinePolicy(
      new iam.Policy(this, 'AuditDeletionDenyPolicy', {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ['dynamodb:DeleteItem', 'dynamodb:UpdateItem'],
            resources: [this.auditTable.tableArn],
            conditions: {
              StringEquals: {
                'dynamodb:LeadingKeys': ['*'],
              },
            },
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ['s3:DeleteObject', 's3:DeleteObjectVersion'],
            resources: [this.auditBucket.arnForObjects('*')],
          }),
        ],
      })
    );

    // Add tags
    cdk.Tags.of(this).add('Component', 'Audit');
    cdk.Tags.of(this).add('Phase', '3-AI-Governance');
    cdk.Tags.of(this).add('Compliance', 'ImmutableTrail');
  }
}
