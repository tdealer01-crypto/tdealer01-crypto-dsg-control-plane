import * as cdk from 'aws-cdk-lib';
import * as guardduty from 'aws-cdk-lib/aws-guardduty';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface GuardDutyConstructProps {
  config: DSGConfig;
  snsTopic?: sns.Topic;
}

/**
 * GuardDuty Construct
 *
 * Threat detection and intelligent monitoring for AWS infrastructure.
 * Detects malicious activity, compromised credentials, unusual patterns.
 * Integrates with SecurityHub and sends alerts via SNS.
 */
export class GuardDutyConstruct extends Construct {
  public readonly detector: guardduty.CfnDetector;
  public readonly threatResponse: iam.Role;

  constructor(scope: Construct, id: string, props: GuardDutyConstructProps) {
    super(scope, id);

    const { config, snsTopic } = props;

    // Enable GuardDuty
    this.detector = new guardduty.CfnDetector(this, 'GuardDutyDetector', {
      enable: true,
      findingPublishingFrequency:
        config.environment === 'prod' ? 'FIFTEEN_MINUTES' : 'ONE_HOUR',
    });

    // IAM Role for threat response automation
    this.threatResponse = new iam.Role(this, 'ThreatResponseRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for automated threat response from GuardDuty findings',
    });

    // Grant permissions for responding to findings
    this.threatResponse.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'guardduty:GetFindings',
          'guardduty:ListFindings',
          'guardduty:DescribeOrganizationConfiguration',
        ],
        resources: ['*'],
      })
    );

    // Publish to SNS topic if provided
    if (snsTopic) {
      snsTopic.grantPublish(this.threatResponse);
    }

    cdk.Tags.of(this).add('Component', 'GuardDuty');
    cdk.Tags.of(this).add('Phase', '4-Operations');
    cdk.Tags.of(this).add('Security', 'ThreatDetection');
  }
}
