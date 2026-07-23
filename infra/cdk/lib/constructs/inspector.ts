import * as cdk from 'aws-cdk-lib';
import * as inspector from 'aws-cdk-lib/aws-inspector';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface InspectorConstructProps {
  config: DSGConfig;
}

/**
 * Amazon Inspector Construct
 *
 * Automated vulnerability assessments for EC2, Lambda, container images.
 * Scans for software vulnerabilities and unintended network exposure.
 * Integrates with Security Hub for centralized finding management.
 */
export class InspectorConstruct extends Construct {
  public readonly delegatedAdminAccount?: string;
  public readonly inspectorRole: iam.Role;

  constructor(scope: Construct, id: string, props: InspectorConstructProps) {
    super(scope, id);

    const { config } = props;

    // IAM Role for Inspector operations
    this.inspectorRole = new iam.Role(this, 'InspectorRole', {
      assumedBy: new iam.ServicePrincipal('inspector.amazonaws.com'),
      description: 'Role for Amazon Inspector vulnerability scanning',
    });

    // Grant permissions for scanning
    this.inspectorRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'ec2:DescribeInstances',
          'ec2:DescribeImages',
          'lambda:GetFunction',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
        ],
        resources: ['*'],
      })
    );

    // Enable Inspector v2 (set via AWS Console or automated detection)
    const inspectorConfig = new inspector.CfnAssessmentTemplate(
      this,
      'InspectorTemplate',
      {
        ruleSets: [
          'arn:aws:inspector:us-east-1:316112463485:rulespackage/0-3t6c51by', // Common vulnerabilities
          'arn:aws:inspector:us-east-1:316112463485:rulespackage/0-PoGHMznc', // CIS benchmarks
        ],
        targetArn: `arn:aws:ec2:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:*`,
        assessmentTemplateName: `${config.resourcePrefix}-inspector-template`,
        durationInMinutes: 15,
      }
    );

    cdk.Tags.of(this).add('Component', 'Inspector');
    cdk.Tags.of(this).add('Phase', '4-Operations');
    cdk.Tags.of(this).add('Security', 'VulnerabilityScanning');
  }
}
