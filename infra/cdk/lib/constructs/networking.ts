import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createResourceName, createLogGroupName } from '../utils';

export interface NetworkingConstructProps {
  config: DSGConfig;
}

export class NetworkingConstruct extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkingConstructProps) {
    super(scope, id);

    const { config } = props;

    // Create VPC
    this.vpc = new ec2.Vpc(this, 'VPC', {
      cidr: config.networking.vpcCidr,
      maxAzs: config.networking.maxAzs,
      natGateways: config.networking.natGateways,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Store subnet references
    this.privateSubnets = this.vpc.privateSubnets;
    this.publicSubnets = this.vpc.publicSubnets;

    // Security Groups
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for ALB',
      allowAllOutbound: true,
    });

    this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'ECSSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for ECS tasks',
      allowAllOutbound: true,
    });

    // ECS can only receive traffic from ALB
    this.ecsSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(this.albSecurityGroup.securityGroupId),
      ec2.Port.allTcp(),
      'Allow traffic from ALB'
    );

    // Enable VPC Flow Logs
    if (config.networking.enableFlowLogs) {
      new ec2.FlowLog(this, 'VPCFlowLog', {
        resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
        trafficType: ec2.FlowLogTrafficType.ALL,
        destination: ec2.FlowLogDestination.toCloudWatchLogs(
          new logs.LogGroup(this, 'VPCFlowLogGroup', {
            logGroupName: createLogGroupName(config.env, 'vpc-flow-logs'),
            retention: config.networking.flowLogsRetentionDays === 7 ? logs.RetentionDays.ONE_WEEK : logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          })
        ),
      });
    }

    // Tags
    cdk.Tags.of(this).add('Component', 'Networking');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
