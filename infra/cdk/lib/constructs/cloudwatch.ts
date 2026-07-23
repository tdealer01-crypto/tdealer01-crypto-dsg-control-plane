import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createResourceName } from '../utils';

export interface CloudWatchConstructProps {
  config: DSGConfig;
  alb: elbv2.ApplicationLoadBalancer;
  service: ecs.FargateService;
  targetGroup: elbv2.ApplicationTargetGroup;
}

export class CloudWatchConstruct extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: CloudWatchConstructProps) {
    super(scope, id);

    const { config, alb, service, targetGroup } = props;

    // Create Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: createResourceName(config.env, 'dashboard'),
    });

    // ALB Metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ALB Request Count',
        left: [
          alb.metricRequestCount({
            statistic: 'Sum',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'ALB Target Response Time',
        left: [
          alb.metricTargetResponseTime({
            statistic: 'Average',
          }),
        ],
        width: 12,
      })
    );

    // ALB Error Rates
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ALB HTTP 4xx/5xx Errors',
        left: [
          alb.metricHttpCodeElb({
            code: cloudwatch.HttpCodeElb.ELB_4XX,
            statistic: 'Sum',
          }),
          alb.metricHttpCodeElb({
            code: cloudwatch.HttpCodeElb.ELB_5XX,
            statistic: 'Sum',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Target Health',
        left: [
          targetGroup.metricHealthyHostCount({
            statistic: 'Average',
          }),
          targetGroup.metricUnHealthyHostCount({
            statistic: 'Average',
          }),
        ],
        width: 12,
      })
    );

    // ECS Service Metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ECS Running Task Count',
        left: [
          service.metricRunningCount({
            statistic: 'Average',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'ECS Desired Task Count',
        left: [
          service.metricDesiredTaskCount({
            statistic: 'Average',
          }),
        ],
        width: 12,
      })
    );

    // ECS CPU and Memory Utilization
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ECS CPU Utilization',
        left: [
          service.metricCpuUtilization({
            statistic: 'Average',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'ECS Memory Utilization',
        left: [
          service.metricMemoryUtilization({
            statistic: 'Average',
          }),
        ],
        width: 12,
      })
    );

    // Create Alarms for critical metrics
    if (config.observability.enableDetailedMonitoring) {
      // ALB Unhealthy Host Alarm
      new cloudwatch.Alarm(this, 'UnhealthyHostsAlarm', {
        metric: targetGroup.metricUnHealthyHostCount(),
        threshold: 1,
        evaluationPeriods: 2,
        alarmName: createResourceName(config.env, 'unhealthy-hosts'),
        alarmDescription: 'Alert when any target becomes unhealthy',
      });

      // ECS CPU Alarm
      new cloudwatch.Alarm(this, 'HighCpuAlarm', {
        metric: service.metricCpuUtilization(),
        threshold: 80,
        evaluationPeriods: 2,
        alarmName: createResourceName(config.env, 'high-cpu'),
        alarmDescription: 'Alert when CPU exceeds 80%',
      });

      // ECS Memory Alarm
      new cloudwatch.Alarm(this, 'HighMemoryAlarm', {
        metric: service.metricMemoryUtilization(),
        threshold: 85,
        evaluationPeriods: 2,
        alarmName: createResourceName(config.env, 'high-memory'),
        alarmDescription: 'Alert when memory exceeds 85%',
      });

      // ALB Target Response Time Alarm
      new cloudwatch.Alarm(this, 'SlowResponseTimeAlarm', {
        metric: alb.metricTargetResponseTime(),
        threshold: 1,
        evaluationPeriods: 3,
        alarmName: createResourceName(config.env, 'slow-response'),
        alarmDescription: 'Alert when response time exceeds 1 second',
      });
    }

    cdk.Tags.of(this).add('Component', 'CloudWatch');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
