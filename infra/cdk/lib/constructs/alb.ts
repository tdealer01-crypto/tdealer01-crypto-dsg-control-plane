import * as cdk from 'aws-cdk-lib';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface ALBConstructProps {
  config: DSGConfig;
  vpc: ec2.Vpc;
}

export class ALBConstruct extends Construct {
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: ALBConstructProps) {
    super(scope, id);
    const { vpc } = props;

    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
    });
  }
}
