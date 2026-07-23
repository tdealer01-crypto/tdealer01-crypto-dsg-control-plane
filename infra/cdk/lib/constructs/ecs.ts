import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createResourceName, createLogGroupName } from '../utils';

export interface ECSConstructProps {
  config: DSGConfig;
  vpc: ec2.Vpc;
  ecsSecurityGroup: ec2.SecurityGroup;
  taskExecutionRole: iam.Role;
  taskRole: iam.Role;
  apiRepository: ecr.Repository;
  alb: elbv2.ApplicationLoadBalancer;
  targetGroup: elbv2.ApplicationTargetGroup;
}

export class ECSConstruct extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ECSConstructProps) {
    super(scope, id);

    const {
      config,
      vpc,
      ecsSecurityGroup,
      taskExecutionRole,
      taskRole,
      apiRepository,
      alb,
      targetGroup,
    } = props;

    // Create ECS Cluster
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: createResourceName(config.env, 'cluster'),
      containerInsights: config.compute.ecs.enableContainerInsights,
    });

    // CloudWatch Log Group for ECS
    const logGroup = new logs.LogGroup(this, 'ECSLogGroup', {
      logGroupName: createLogGroupName(config.env, 'ecs'),
      retention: config.observability.cloudWatchRetentionDays === 7
        ? logs.RetentionDays.ONE_WEEK
        : logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Fargate Task Definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: config.compute.taskMemory,
      cpu: config.compute.taskCpu,
      executionRole: taskExecutionRole,
      taskRole: taskRole,
      family: createResourceName(config.env, 'task'),
    });

    // Container
    const container = this.taskDefinition.addContainer('api', {
      image: ecs.ContainerImage.fromEcrRepository(apiRepository, 'latest'),
      logging: ecs.LogDriver.awsLogs({
        logGroup,
        streamPrefix: 'ecs',
      }),
      portMappings: [
        {
          containerPort: 3000,
          protocol: ecs.Protocol.TCP,
        },
      ],
      environment: {
        ENVIRONMENT: config.env,
        NODE_ENV: config.env === 'prod' ? 'production' : 'development',
        LOG_LEVEL: config.observability.logLevel,
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Enable ECS Exec for debugging (dev/staging only)
    if (config.compute.ecs.enableExecuteCommand) {
      // Enable logging for ECS Exec
      const ecsExecLogGroup = new logs.LogGroup(this, 'ECSExecLogGroup', {
        logGroupName: createLogGroupName(config.env, 'ecs-exec'),
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    }

    // Fargate Service
    this.service = new ecs.FargateService(this, 'Service', {
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: config.compute.desiredCount,
      serviceName: createResourceName(config.env, 'service'),
      securityGroups: [ecsSecurityGroup],
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      deploymentController: {
        type: config.compute.deploymentStrategy === 'BLUE_GREEN'
          ? ecs.DeploymentControllerType.CODE_DEPLOY
          : config.compute.deploymentStrategy === 'CANARY'
          ? ecs.DeploymentControllerType.EXTERNAL
          : ecs.DeploymentControllerType.ECS,
      },
      enableECSManagedTags: true,
      enableExecuteCommand: config.compute.ecs.enableExecuteCommand,
    });

    // Load Balancer Integration
    this.service.attachToApplicationTargetGroup(targetGroup);

    // Auto Scaling (if enabled)
    if (config.compute.enableAutoScaling) {
      const scaling = this.service.autoScaleTaskCount({
        minCapacity: config.compute.minCapacity,
        maxCapacity: config.compute.maxCapacity,
      });

      scaling.scaleOnCpuUtilization('CpuScaling', {
        targetUtilizationPercent: 70,
      });

      scaling.scaleOnMemoryUtilization('MemoryScaling', {
        targetUtilizationPercent: 80,
      });

      // Request count scaling is handled by AutoScalingConstruct with target group
    }

    // Outputs
    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster name',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'ECS Service name',
    });

    cdk.Tags.of(this).add('Component', 'ECS');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
