import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createRoleName, createPolicyName, CommonPolicies } from '../utils';

export interface IAMConstructProps {
  config: DSGConfig;
}

export class IAMConstruct extends Construct {
  public readonly ecsTaskExecutionRole: iam.Role;
  public readonly ecsTaskRole: iam.Role;
  public readonly governanceRuntimeRole: iam.Role;
  public readonly auditLoggingRole: iam.Role;

  constructor(scope: Construct, id: string, props: IAMConstructProps) {
    super(scope, id);

    const { config } = props;

    // ECS Task Execution Role (pull images, logs, secrets)
    this.ecsTaskExecutionRole = new iam.Role(this, 'ECSTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      roleName: createRoleName(config.env, 'ecs-task-execution'),
      description: 'Role for ECS task execution (pulling images, logging)',
    });

    CommonPolicies.ecsTaskExecution.forEach((action) => {
      this.ecsTaskExecutionRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [action],
          resources: ['*'],
        })
      );
    });

    // ECS Task Role (runtime permissions for the application)
    this.ecsTaskRole = new iam.Role(this, 'ECSTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      roleName: createRoleName(config.env, 'ecs-task'),
      description: 'Role for ECS task runtime',
    });

    CommonPolicies.ecsTaskRuntime.forEach((action) => {
      this.ecsTaskRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [action],
          resources: ['*'],
        })
      );
    });

    // Governance Runtime Role
    this.governanceRuntimeRole = new iam.Role(this, 'GovernanceRuntimeRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      roleName: createRoleName(config.env, 'governance-runtime'),
      description: 'Role for governance engine runtime',
    });

    CommonPolicies.governanceRuntime.forEach((action) => {
      this.governanceRuntimeRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [action],
          resources: ['*'],
        })
      );
    });

    // Audit Logging Role
    this.auditLoggingRole = new iam.Role(this, 'AuditLoggingRole', {
      assumedBy: new iam.ServicePrincipal('logs.amazonaws.com'),
      roleName: createRoleName(config.env, 'audit-logging'),
      description: 'Role for audit trail logging',
    });

    CommonPolicies.auditLogging.forEach((action) => {
      this.auditLoggingRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [action],
          resources: ['*'],
        })
      );
    });

    // Enforce least-privilege principle
    if (config.security.mfaRequired) {
      [this.ecsTaskExecutionRole, this.ecsTaskRole].forEach((role) => {
        role.addToPrincipalPolicy(
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ['*'],
            resources: ['*'],
            conditions: {
              'aws:MultiFactorAuthPresent': ['false'],
            },
          })
        );
      });
    }

    cdk.Tags.of(this).add('Component', 'IAM');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
