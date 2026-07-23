import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface ShieldConstructProps {
  config: DSGConfig;
}

/**
 * AWS Shield Construct
 *
 * DDoS protection (Shield Standard + Advanced for production).
 * Network and application layer DDoS mitigation.
 * Real-time attack diagnostics and DDoS cost protection.
 */
export class ShieldConstruct extends Construct {
  public readonly shieldRole: iam.Role;
  public readonly enableShieldAdvanced: boolean;

  constructor(scope: Construct, id: string, props: ShieldConstructProps) {
    super(scope, id);

    const { config } = props;

    // Shield Advanced for production environments
    this.enableShieldAdvanced = config.environment === 'prod';

    // IAM Role for Shield operations
    this.shieldRole = new iam.Role(this, 'ShieldManagementRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Shield Advanced management and DDoS response',
    });

    // Grant Shield permissions
    if (this.enableShieldAdvanced) {
      this.shieldRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: [
            'shield:GetSubscriptionState',
            'shield:DescribeAttack',
            'shield:ListAttacks',
            'shield:GetAttackStatistics',
          ],
          resources: ['*'],
        })
      );

      // Create Shield Advanced subscription (CLI/manual in production)
      console.log('Shield Advanced should be enabled via AWS Shield console or CLI');
    }

    cdk.Tags.of(this).add('Component', 'Shield');
    cdk.Tags.of(this).add('Phase', '4-Operations');
    cdk.Tags.of(this).add('Security', 'DDoSProtection');
  }
}
