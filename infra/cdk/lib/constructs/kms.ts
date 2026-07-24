import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface KMSConstructProps {
  config: DSGConfig;
}

export class KMSConstruct extends Construct {
  public readonly key: kms.Key;

  constructor(scope: Construct, id: string, props: KMSConstructProps) {
    super(scope, id);
    const { config } = props;

    this.key = new kms.Key(this, 'EncryptionKey', {
      description: `KMS key for ${config.environment} DSG ONE environment`,
      enableKeyRotation: true,
      removalPolicy: config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    this.key.addAlias(`dsg-one-${config.environment}`);
  }
}
