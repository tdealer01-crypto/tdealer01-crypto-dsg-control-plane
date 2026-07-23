import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createResourceName, createTableName, createBucketName } from '../utils';

export interface GovernanceConstructProps {
  config: DSGConfig;
  encryptionKey: kms.Key;
}

export class GovernanceConstruct extends Construct {
  public readonly policyTable: dynamodb.Table;
  public readonly auditTable: dynamodb.Table;
  public readonly evidenceBucket: s3.Bucket;
  public readonly replayProofTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: GovernanceConstructProps) {
    super(scope, id);

    const { config, encryptionKey } = props;

    // Policy Table (policy versions, definitions, constraints)
    this.policyTable = new dynamodb.Table(this, 'PolicyTable', {
      tableName: createTableName(config.env, 'policies-v2'),
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      partitionKey: { name: 'policyId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'version', type: dynamodb.AttributeType.NUMBER },
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: config.env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Audit Table (immutable audit trail)
    this.auditTable = new dynamodb.Table(this, 'AuditTable', {
      tableName: createTableName(config.env, 'audit-trail-v2'),
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      partitionKey: { name: 'executionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      removalPolicy: config.env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    if (config.governance.immutableAuditEnabled) {
      new cdk.CfnOutput(this, 'AuditTableImmutable', {
        value: this.auditTable.tableName,
        description: 'Immutable audit trail table',
      });
    }

    // Replay Proof Table (deterministic proof storage)
    this.replayProofTable = new dynamodb.Table(this, 'ReplayProofTable', {
      tableName: createTableName(config.env, 'replay-proofs-v2'),
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      partitionKey: { name: 'proofId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      removalPolicy: config.env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Evidence Bucket (S3 for compliance evidence, audit logs export)
    this.evidenceBucket = new s3.Bucket(this, 'EvidenceBucket', {
      bucketName: createBucketName(config.env, 'evidence'),
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: config.env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          expiration: cdk.Duration.days(config.governance.evidenceRetentionDays),
        },
      ],
    });

    // Evidence bucket is configured with blockPublicAccess in constructor
    // No additional configuration needed for immutable audit

    cdk.Tags.of(this).add('Component', 'Governance');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
