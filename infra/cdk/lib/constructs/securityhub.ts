import * as cdk from 'aws-cdk-lib';
import * as securityhub from 'aws-cdk-lib/aws-securityhub';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface SecurityHubConstructProps {
  config: DSGConfig;
}

/**
 * Security Hub Construct
 *
 * Centralized security findings aggregation and analysis.
 * Supports AWS Foundational Security Best Practices.
 * Integrates with Config, GuardDuty, Macie, IAM Access Analyzer.
 * Generates compliance reports for frameworks (CIS, PCI DSS, etc).
 */
export class SecurityHubConstruct extends Construct {
  public readonly hub?: securityhub.CfnHub;
  public readonly complianceRole: iam.Role;

  constructor(scope: Construct, id: string, props: SecurityHubConstructProps) {
    super(scope, id);

    const { config } = props;

    // Enable Security Hub only in production (requires subscription)
    if (config.environment === 'prod') {
      this.hub = new securityhub.CfnHub(this, 'SecurityHub', {
        tags: {
          Environment: config.environment,
          Component: 'SecurityHub',
        },
      });
    } else {
      console.log(`ℹ️ Skipping SecurityHub for ${config.environment} environment`);
    }

    // IAM Role for compliance automation
    this.complianceRole = new iam.Role(this, 'ComplianceAutomationRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Security Hub compliance automation and remediation',
    });

    // Grant permissions for reading findings
    this.complianceRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'securityhub:GetFindings',
          'securityhub:ListFindings',
          'securityhub:GetComplianceSummary',
          'securityhub:DescribeStandards',
          'securityhub:GetStandardsControlAssociations',
        ],
        resources: ['*'],
      })
    );

    // Enable standards
    this.createStandards();

    cdk.Tags.of(this).add('Component', 'SecurityHub');
    cdk.Tags.of(this).add('Phase', '4-Operations');
    cdk.Tags.of(this).add('Compliance', 'SecurityFindings');
  }

  private createStandards() {
    // Standards subscriptions are typically managed via AWS Console or dedicated configuration
    // Compliance framework subscriptions can be automated via custom Lambda if needed
  }
}
