import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface CloudWatchConstructProps {
  config: DSGConfig;
}

export class CloudWatchConstruct extends Construct {
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: CloudWatchConstructProps) {
    super(scope, id);
    const { config } = props;

    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/dsg-one/${config.environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
