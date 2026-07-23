import * as cdk from 'aws-cdk-lib';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createResourceName } from '../utils';

export interface ALBConstructProps {
  config: DSGConfig;
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
}

export class ALBConstruct extends Construct {
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly httpListener: elbv2.ApplicationListener;
  public readonly httpsListener?: elbv2.ApplicationListener;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: ALBConstructProps) {
    super(scope, id);

    const { config, vpc, securityGroup } = props;

    // Create ALB
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      loadBalancerName: createResourceName(config.env, 'alb'),
    });

    // Security group for ALB: allow HTTP/HTTPS from internet
    this.alb.addSecurityGroup(securityGroup);
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from internet'
    );
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from internet'
    );

    // Default target group (will be used by ECS service)
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc,
      targetType: elbv2.TargetType.IP,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetGroupName: createResourceName(config.env, 'tg'),
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // HTTP Listener (redirect to HTTPS in prod, allow direct in dev)
    this.httpListener = this.alb.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: config.env === 'prod'
        ? elbv2.ListenerAction.redirect({
            protocol: 'HTTPS',
            port: '443',
            permanent: true,
          })
        : elbv2.ListenerAction.forward([this.targetGroup]),
    });

    // HTTPS Listener (prod only)
    if (config.env === 'prod') {
      const certificate = acm.Certificate.fromCertificateArn(
        this,
        'Certificate',
        // This should be replaced with actual certificate ARN from environment
        process.env.ACM_CERTIFICATE_ARN || ''
      );

      this.httpsListener = this.alb.addListener('HttpsListener', {
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [certificate],
        defaultTargetGroups: [this.targetGroup],
      });

      // HTTP/2 support
      (this.httpsListener.node.defaultChild as any).alpnPolicy = ['HTTP2', 'HTTP1.1'];
    }

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.alb.loadBalancerDnsName,
      description: 'Load Balancer DNS name',
    });

    cdk.Tags.of(this).add('Component', 'ALB');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
