import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createResourceName } from '../utils';

export interface SecretsConstructProps {
  config: DSGConfig;
  encryptionKey: kms.Key;
}

export class SecretsConstruct extends Construct {
  public readonly apiSecrets: secretsmanager.Secret;
  public readonly databaseSecrets: secretsmanager.Secret;
  public readonly oauthSecrets: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: SecretsConstructProps) {
    super(scope, id);

    const { config, encryptionKey } = props;

    // API Secrets (keys, tokens, credentials)
    this.apiSecrets = new secretsmanager.Secret(this, 'APISecrets', {
      secretName: createResourceName(config.env, 'api-secrets-v2'),
      description: 'API keys and tokens for DSG ONE',
      encryptionKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          ANTHROPIC_API_KEY: 'placeholder',
          JWT_SECRET: 'placeholder',
          API_KEY: 'placeholder',
        }),
        generateStringKey: 'SECRET_KEY',
        excludeCharacters: '"\'\\',
      },
      removalPolicy: config.env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Database Secrets (connection strings, credentials)
    this.databaseSecrets = new secretsmanager.Secret(this, 'DatabaseSecrets', {
      secretName: createResourceName(config.env, 'database-secrets-v2'),
      description: 'Database credentials for DSG ONE',
      encryptionKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'dsg_admin',
          host: 'localhost',
          port: 5432,
          dbname: 'dsg_one',
        }),
        generateStringKey: 'password',
        excludeCharacters: '"\'@/\\',
      },
      removalPolicy: config.env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // OAuth Secrets (provider credentials)
    this.oauthSecrets = new secretsmanager.Secret(this, 'OAuthSecrets', {
      secretName: createResourceName(config.env, 'oauth-secrets-v2'),
      description: 'OAuth provider credentials',
      encryptionKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          GITHUB_CLIENT_ID: 'placeholder',
          GOOGLE_CLIENT_ID: 'placeholder',
        }),
        generateStringKey: 'OAUTH_STATE_KEY',
        excludeCharacters: '"\'\\',
      },
      removalPolicy: config.env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Note: Automatic rotation requires rotationLambda or hostedRotation configuration
    // Rotation can be configured via AWS Console or additional Lambda-based construct
    // if (config.security.kmsKeyRotation) {
    //   // Rotation schedule would be configured here with Lambda or hosted rotation
    // }

    cdk.Tags.of(this).add('Component', 'SecretsManager');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
