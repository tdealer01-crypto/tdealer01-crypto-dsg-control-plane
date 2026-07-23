import * as cdk from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createResourceName } from '../utils';

export interface AutoScalingConstructProps {
  config: DSGConfig;
  ecsService: ecs.FargateService;
  targetGroup: any; // ALB TargetGroup
}

export class AutoScalingConstruct extends Construct {
  public readonly scalableTarget: autoscaling.ScalableTarget;
  public readonly cpuScaling: autoscaling.TargetTrackingScalingPolicy;
  public readonly memoryScaling: autoscaling.TargetTrackingScalingPolicy;
  public readonly requestCountScaling: autoscaling.TargetTrackingScalingPolicy;

  constructor(scope: Construct, id: string, props: AutoScalingConstructProps) {
    super(scope, id);

    const { config, ecsService, targetGroup } = props;

    // Create scalable target for ECS service
    this.scalableTarget = ecsService.autoScaleTaskCount({
      minCapacity: config.compute.minCapacity || 2,
      maxCapacity: config.compute.maxCapacity || 10,
    });

    // CPU-based scaling (target 70% utilization)
    this.cpuScaling = this.scalableTarget.scaleOnCpuUtilization(
      'CpuScaling',
      {
        targetUtilizationPercent: 70,
        cooldown: cdk.Duration.minutes(5),
        canContainersScale: true,
      }
    );

    // Memory-based scaling (target 80% utilization)
    this.memoryScaling = this.scalableTarget.scaleOnMemoryUtilization(
      'MemoryScaling',
      {
        targetUtilizationPercent: 80,
        cooldown: cdk.Duration.minutes(5),
        canContainersScale: true,
      }
    );

    // Request count scaling (1000 requests per minute per task)
    this.requestCountScaling = this.scalableTarget.scaleOnRequestCount(
      'RequestCountScaling',
      {
        targetRequestsPerMinute: 1000,
        cooldown: cdk.Duration.minutes(3),
      }
    );

    // Environment-specific scaling thresholds
    if (config.env === 'prod') {
      // Production: more aggressive scaling
      this.scalableTarget.scaleOnCpuUtilization('ProdCpuScaling', {
        targetUtilizationPercent: 60,
        cooldown: cdk.Duration.minutes(2),
        canContainersScale: true,
      });

      this.scalableTarget.scaleOnMemoryUtilization('ProdMemoryScaling', {
        targetUtilizationPercent: 75,
        cooldown: cdk.Duration.minutes(2),
        canContainersScale: true,
      });
    } else if (config.env === 'dev') {
      // Development: less aggressive scaling
      this.scalableTarget.scaleOnCpuUtilization('DevCpuScaling', {
        targetUtilizationPercent: 80,
        cooldown: cdk.Duration.minutes(10),
        canContainersScale: true,
      });
    }

    // Create CloudWatch alarms for scaling events
    this.createScalingAlarms(config, ecsService);

    cdk.Tags.of(this).add('Component', 'AutoScaling');
    cdk.Tags.of(this).add('Environment', config.env);
  }

  private createScalingAlarms(config: DSGConfig, service: ecs.FargateService): void {
    // Alarm for scale-up events
    new cloudwatch.Alarm(this, 'ScaleUpAlarm', {
      metric: service.metricCpuUtilization(),
      threshold: config.env === 'prod' ? 60 : 70,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      alarmName: createResourceName(config.env, 'scale-up-cpu'),
      alarmDescription: 'Alarm when CPU is high and scale-up is triggered',
    });

    // Alarm for scale-down events
    new cloudwatch.Alarm(this, 'ScaleDownAlarm', {
      metric: service.metricCpuUtilization(),
      threshold: 30,
      evaluationPeriods: 5,
      datapointsToAlarm: 5,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmName: createResourceName(config.env, 'scale-down-cpu'),
      alarmDescription: 'Alarm when CPU is low and scale-down is triggered',
    });

    // Task count metric
    new cloudwatch.Alarm(this, 'DesiredTaskCountAlarm', {
      metric: service.metricDesiredTaskCount(),
      threshold: config.compute.maxCapacity || 10,
      evaluationPeriods: 2,
      alarmName: createResourceName(config.env, 'max-task-count'),
      alarmDescription: 'Alert when desired task count reaches maximum',
    });
  }
}
