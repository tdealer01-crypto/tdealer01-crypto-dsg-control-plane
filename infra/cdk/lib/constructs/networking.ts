import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface NetworkingConstructProps {
  config: DSGConfig;
}

export class NetworkingConstruct extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: NetworkingConstructProps) {
    super(scope, id);
    const { config } = props;

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      cidr: config.networking.vpcCidr,
      maxAzs: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });
  }
}
