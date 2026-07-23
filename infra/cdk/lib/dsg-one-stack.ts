import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DSGConfig } from './config';
import {
  NetworkingConstruct,
  IAMConstruct,
  KMSConstruct,
  SecretsConstruct,
  ECRConstruct,
  GovernanceConstruct,
} from './constructs';
import { validateConfig } from './utils';

export interface DSGOneStackProps extends cdk.StackProps {
  config: DSGConfig;
}

export class DSGOneStack extends cdk.Stack {
  public readonly networking: NetworkingConstruct;
  public readonly iam: IAMConstruct;
  public readonly kms: KMSConstruct;
  public readonly secrets: SecretsConstruct;
  public readonly ecr: ECRConstruct;
  public readonly governance: GovernanceConstruct;

  constructor(scope: Construct, id: string, props: DSGOneStackProps) {
    super(scope, id, {
      ...props,
      env: {
        account: props.config.aws.account,
        region: props.config.aws.region,
      },
    });

    const { config } = props;

    // Validate configuration before proceeding
    validateConfig(config);

    // Apply tags to entire stack
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });

    // Initialize constructs in dependency order
    // 1. Encryption keys first (needed by other constructs)
    this.kms = new KMSConstruct(this, 'KMS', { config });

    // 2. IAM roles (needed for services)
    this.iam = new IAMConstruct(this, 'IAM', { config });

    // 3. Secrets (needs KMS key)
    this.secrets = new SecretsConstruct(this, 'Secrets', {
      config,
      encryptionKey: this.kms.masterKey,
    });

    // 4. Networking infrastructure
    this.networking = new NetworkingConstruct(this, 'Networking', { config });

    // 5. Container registry
    this.ecr = new ECRConstruct(this, 'ECR', { config });

    // 6. Governance systems (policy engine, audit trail, evidence)
    this.governance = new GovernanceConstruct(this, 'Governance', {
      config,
      encryptionKey: this.kms.auditKey,
    });

    // Outputs
    this.createOutputs(config);
  }

  private createOutputs(config: DSGConfig): void {
    new cdk.CfnOutput(this, 'EnvironmentOutput', {
      value: config.env,
      description: 'Deployment environment',
    });

    new cdk.CfnOutput(this, 'VPCIdOutput', {
      value: this.networking.vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'APIRepositoryURI', {
      value: this.ecr.apiRepository.repositoryUri,
      description: 'ECR API Repository URI',
    });

    new cdk.CfnOutput(this, 'EvidenceBucketName', {
      value: this.governance.evidenceBucket.bucketName,
      description: 'S3 bucket for compliance evidence',
    });

    new cdk.CfnOutput(this, 'AuditTableName', {
      value: this.governance.auditTable.tableName,
      description: 'DynamoDB table for audit trail',
    });
  }
}
