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
  public readonly samplingRule: xray.CfnSamplingRule;

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

    // X-Ray Sampling Rule - minimal configuration
    // Full configuration can be done via AWS Console
    const samplingRuleProps: any = {
      ruleName: createResourceName(config.env, 'sampling'),
      resourceArn: '*',
      serviceName: '*',
      serviceType: '*',
      host: '*',
      urlPath: '*',
      httpMethod: '*',
    };

    this.samplingRule = new xray.CfnSamplingRule(this, 'SamplingRule', samplingRuleProps);

    // X-Ray Group for API errors
    new xray.CfnGroup(this, 'ErrorGroup', {
      groupName: createResourceName(config.env, 'errors'),
      filterExpression: 'http.status >= 400',
    });

    // X-Ray Group for slow requests
    new xray.CfnGroup(this, 'SlowRequestGroup', {
      groupName: createResourceName(config.env, 'slow-requests'),
      filterExpression: 'http.response_time >= 1',
    });

    // X-Ray insights and anomaly detection are enabled by default
    // Resource policies can be configured via AWS Console as needed

    cdk.Tags.of(this).add('Component', 'XRay');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
