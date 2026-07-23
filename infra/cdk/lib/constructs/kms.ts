import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createResourceName } from '../utils';

export interface KMSConstructProps {
  config: DSGConfig;
}

export class KMSConstruct extends Construct {
  public readonly masterKey: kms.Key;
  public readonly dataKey: kms.Key;
  public readonly auditKey: kms.Key;

  constructor(scope: Construct, id: string, props: KMSConstructProps) {
    super(scope, id);

    const { config } = props;

    // Master Key for general encryption
    this.masterKey = new kms.Key(this, 'MasterKey', {
      enableKeyRotation: config.security.kmsKeyRotation,
      description: `DSG ONE Master Key (${config.env})`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.masterKey.addAlias(createResourceName(config.env, 'master-key'));

    // Data Key for application data encryption
    this.dataKey = new kms.Key(this, 'DataKey', {
      enableKeyRotation: config.security.kmsKeyRotation,
      description: `DSG ONE Data Key (${config.env})`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.dataKey.addAlias(createResourceName(config.env, 'data-key'));

    // Audit Key for immutable audit trail encryption
    this.auditKey = new kms.Key(this, 'AuditKey', {
      enableKeyRotation: config.security.kmsKeyRotation,
      description: `DSG ONE Audit Key (${config.env})`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.auditKey.addAlias(createResourceName(config.env, 'audit-key'));

    // Key Policy: Allow CloudWatch Logs to use the key
    this.masterKey.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        principals: [
          new cdk.aws_iam.ServicePrincipal(`logs.${cdk.Stack.of(this).region}.amazonaws.com`),
        ],
        actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:CreateGrant', 'kms:DescribeKey'],
        resources: ['*'],
      })
    );

    cdk.Tags.of(this).add('Component', 'KMS');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
