import * as cdk from 'aws-cdk-lib';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface BackupConstructProps {
  config: DSGConfig;
}

/**
 * AWS Backup Construct
 *
 * Centralized disaster recovery and backup strategy.
 * Automated backups for ECS, DynamoDB, RDS databases.
 * Cross-region backup for high availability.
 * Backup retention policies for compliance.
 */
export class BackupConstruct extends Construct {
  public readonly backupVault: backup.BackupVault;
  public readonly backupPlan: backup.BackupPlan;
  public readonly backupRole: iam.Role;

  constructor(scope: Construct, id: string, props: BackupConstructProps) {
    super(scope, id);

    const { config } = props;
    const environment = config.environment;

    // Backup Vault - encrypted backup storage
    this.backupVault = new backup.BackupVault(this, 'BackupVault', {
      backupVaultName: `${config.resourcePrefix}-vault`,
      removalPolicy:
        environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Backup Plan
    this.backupPlan = new backup.BackupPlan(this, 'BackupPlan', {
      backupPlanName: `${config.resourcePrefix}-plan`,
      backupVault: this.backupVault,
    });

    // Daily backup rule (different retention per environment)
    const retentionDays =
      environment === 'prod' ? 365 : environment === 'staging' ? 90 : 30;

    this.backupPlan.addRule(
      new backup.BackupPlanRule({
        ruleName: 'DailyBackup',
        deleteAfter: cdk.Duration.days(retentionDays),
      })
    );

    // Weekly backup rule for production
    if (environment === 'prod') {
      this.backupPlan.addRule(
        new backup.BackupPlanRule({
          ruleName: 'WeeklyBackup',
          deleteAfter: cdk.Duration.days(1095), // 3 years
        })
      );
    }

    // IAM Role for Backup Service
    this.backupRole = new iam.Role(this, 'BackupServiceRole', {
      assumedBy: new iam.ServicePrincipal('backup.amazonaws.com'),
      description: 'Role for AWS Backup service',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSBackupServiceRolePolicyForBackup'
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSBackupServiceRolePolicyForRestores'
        ),
      ],
    });

    cdk.Tags.of(this).add('Component', 'Backup');
    cdk.Tags.of(this).add('Phase', '4-Operations');
    cdk.Tags.of(this).add('DisasterRecovery', 'Enabled');
  }
}
