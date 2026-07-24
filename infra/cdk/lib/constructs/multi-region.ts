import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface MultiRegionConstructProps {
  config: DSGConfig;
}

/**
 * Multi-Region Construct
 *
 * Orchestrates multi-region deployments and failover strategies.
 * Cross-region replication for data, secrets, and configurations.
 * Global load balancing and traffic routing.
 * Disaster recovery and business continuity planning.
 */
export class MultiRegionConstruct extends Construct {
  public readonly multiRegionRole: iam.Role;
  public readonly secondaryRegion: string;
  public readonly replicationStrategy: string;

  constructor(scope: Construct, id: string, props: MultiRegionConstructProps) {
    super(scope, id);

    const { config } = props;

    // Determine secondary region for failover
    this.secondaryRegion =
      config.aws.secondaryRegion || this.getSecondaryRegion(config.aws.region);

    // Replication strategy based on environment
    this.replicationStrategy =
      config.environment === 'prod'
        ? 'active-active'
        : config.environment === 'staging'
          ? 'active-passive'
          : 'single-region';

    // IAM Role for multi-region operations
    this.multiRegionRole = new iam.Role(this, 'MultiRegionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for multi-region deployment and failover orchestration',
    });

    // Grant cross-region permissions
    this.multiRegionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          's3:GetReplicationConfiguration',
          's3:PutReplicationConfiguration',
          'dynamodb:CreateGlobalSecondaryIndex',
          'dynamodb:UpdateGlobalSecondaryIndex',
          'rds:ModifyDBCluster',
          'rds:ModifyDBClusterEndpoint',
        ],
        resources: ['*'],
      })
    );

    // Grant Route53 failover permissions
    this.multiRegionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'route53:ChangeResourceRecordSets',
          'route53:GetHealthCheck',
          'route53:ListHealthChecks',
        ],
        resources: ['*'],
      })
    );

    // Grant cross-region copy/replicate permissions
    this.multiRegionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:ReplicateObject',
          'secretsmanager:ReplicateSecretToRegions',
          'kms:ReplicateKey',
        ],
        resources: ['*'],
      })
    );

    // Log multi-region configuration
    console.log(`
      ========== Multi-Region Configuration ==========
      Primary Region:    ${config.aws.region}
      Secondary Region:  ${this.secondaryRegion}
      Replication Mode:  ${this.replicationStrategy}
      Environment:       ${config.environment}
      ===============================================
    `);

    cdk.Tags.of(this).add('Component', 'MultiRegion');
    cdk.Tags.of(this).add('Phase', '4-Operations');
    cdk.Tags.of(this).add('HA', this.replicationStrategy);
  }

  private getSecondaryRegion(primaryRegion: string): string {
    const regionPairs: { [key: string]: string } = {
      'us-east-1': 'us-west-2',
      'us-west-2': 'us-east-1',
      'eu-west-1': 'eu-central-1',
      'eu-central-1': 'eu-west-1',
      'ap-southeast-1': 'ap-northeast-1',
      'ap-northeast-1': 'ap-southeast-1',
    };
    return regionPairs[primaryRegion] || 'us-west-2';
  }
}
