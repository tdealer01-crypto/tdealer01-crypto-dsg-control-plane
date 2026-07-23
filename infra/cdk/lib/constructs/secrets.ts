import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface SecretsConstructProps {
  config: DSGConfig;
}

export class SecretsConstruct extends Construct {
  public readonly dbSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: SecretsConstructProps) {
    super(scope, id);
    const { config } = props;

    this.dbSecret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: `dsg-one-${config.environment}-db-secret`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'dsg_admin' }),
        generateStringKey: 'password',
        passwordLength: 32,
      },
    });
  }
}
