import * as cdk from 'aws-cdk-lib';
import * as xray from 'aws-cdk-lib/aws-xray';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createResourceName } from '../utils';

export interface XRayConstructProps {
  config: DSGConfig;
  taskRole: iam.Role;
}

export class XRayConstruct extends Construct {
  constructor(scope: Construct, id: string, props: XRayConstructProps) {
    super(scope, id);

    const { config, taskRole } = props;

    // Grant X-Ray write access to task role
    taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
        ],
        resources: ['*'],
      })
    );

    // Note: X-Ray Sampling Rules and Groups have API limitations in CDK
    // Configure them via AWS Console after deployment for full customization
    // Basic X-Ray tracing is enabled via IAM permissions above

    cdk.Tags.of(this).add('Component', 'XRay');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
