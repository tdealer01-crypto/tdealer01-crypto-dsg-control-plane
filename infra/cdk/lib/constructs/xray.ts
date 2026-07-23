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

    // X-Ray Sampling Rule (adaptive sampling based on traffic)
    this.samplingRule = new xray.CfnSamplingRule(this, 'SamplingRule', {
      ruleName: createResourceName(config.env, 'sampling'),
      priority: 1000,
      version: 1,
      fixedRate: config.env === 'prod' ? 0.05 : 0.5, // 5% in prod, 50% in dev
      reservoirSize: config.env === 'prod' ? 1 : 5,
      serviceName: '*',
      serviceType: '*',
      host: '*',
      urlPath: '*',
      resourceArn: '*',
    });

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

    // X-Ray Insights (anomaly detection)
    if (config.observability.enableDetailedMonitoring) {
      new xray.CfnResourcePolicy(this, 'ResourcePolicy', {
        byteRateLimitExceeded: {
          serviceName: 'dsg-one',
        },
      });
    }

    cdk.Tags.of(this).add('Component', 'XRay');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
