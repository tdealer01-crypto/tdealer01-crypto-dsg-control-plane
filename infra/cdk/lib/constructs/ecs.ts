import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface ECSConstructProps {
  config: DSGConfig;
  vpc: ec2.Vpc;
}

export class ECSConstruct extends Construct {
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: ECSConstructProps) {
    super(scope, id);
    const { config, vpc } = props;

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: `dsg-one-${config.environment}`,
    });
  }
}
