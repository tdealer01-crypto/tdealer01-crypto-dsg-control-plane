import * as cdk from 'aws-cdk-lib';
import * as ce from 'aws-cdk-lib/aws-ce';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface FinOpsConstructProps {
  config: DSGConfig;
  snsTopicArn?: string;
}

/**
 * FinOps (Financial Operations) Construct
 *
 * Cost tracking, budgets, anomaly detection.
 * Reserved capacity planning and savings recommendations.
 * Cost attribution and chargeback by workspace/project.
 */
export class FinOpsConstruct extends Construct {
  public readonly costBudget: budgets.CfnBudget;
  public readonly finopsRole: iam.Role;

  constructor(scope: Construct, id: string, props: FinOpsConstructProps) {
    super(scope, id);

    const { config, snsTopicArn } = props;
    const environment = config.environment;

    // IAM Role for FinOps operations
    this.finopsRole = new iam.Role(this, 'FinOpsRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for cost analysis and budget management',
    });

    // Grant Cost Explorer access
    this.finopsRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'ce:GetCostAndUsage',
          'ce:GetCostForecast',
          'ce:GetReservationPurchaseRecommendation',
          'ce:GetSavingsPlansPurchaseRecommendation',
          'ce:ListCostAllocationTags',
        ],
        resources: ['*'],
      })
    );

    // Define budget thresholds based on environment
    const monthlyBudgetAmount =
      environment === 'prod'
        ? 50000
        : environment === 'staging'
          ? 5000
          : 1000;

    // Monthly Budget
    this.costBudget = new budgets.CfnBudget(this, 'MonthlyCostBudget', {
      budget: {
        budgetName: `${config.resourcePrefix}-monthly`,
        budgetLimit: {
          amount: monthlyBudgetAmount,
          unit: 'USD',
        },
        timeUnit: 'MONTHLY',
        budgetType: 'COST',
      },
      notificationsWithSubscribers: snsTopicArn
        ? [
            {
              notification: {
                comparisonOperator: 'GREATER_THAN',
                notificationType: 'FORECASTED',
                threshold: 80,
              },
              subscribers: [
                {
                  subscriptionType: 'SNS',
                  address: snsTopicArn,
                },
              ],
            },
            {
              notification: {
                comparisonOperator: 'GREATER_THAN',
                notificationType: 'ACTUAL',
                threshold: 100,
              },
              subscribers: [
                {
                  subscriptionType: 'SNS',
                  address: snsTopicArn,
                },
              ],
            },
          ]
        : [],
    });

    // Cost Anomaly Detection (via Lambda in real implementation)
    this.finopsRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['ce:CreateAnomalyMonitor', 'ce:CreateAnomalySubscription'],
        resources: ['*'],
      })
    );

    cdk.Tags.of(this).add('Component', 'FinOps');
    cdk.Tags.of(this).add('Phase', '4-Operations');
    cdk.Tags.of(this).add('CostManagement', 'Enabled');
  }
}
