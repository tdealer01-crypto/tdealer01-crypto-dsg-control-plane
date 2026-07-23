import * as iam from 'aws-cdk-lib/aws-iam';

export function createLeastPrivilegePolicy(
  actions: string[],
  resources: string[],
  conditions?: Record<string, any>
): iam.PolicyStatement {
  const statement = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions,
    resources,
  });

  if (conditions) {
    statement.addConditions(conditions);
  }

  return statement;
}

export const CommonPolicies = {
  ecsTaskExecution: [
    'ecr:GetAuthorizationToken',
    'ecr:BatchGetImage',
    'ecr:GetDownloadUrlForLayer',
    'logs:CreateLogStream',
    'logs:PutLogEvents',
    'secretsmanager:GetSecretValue',
    'kms:Decrypt',
  ],
  ecsTaskRuntime: [
    'ecr:GetAuthorizationToken',
    'ecr:GetDownloadUrlForLayer',
    'ecr:BatchGetImage',
    'logs:CreateLogStream',
    'logs:PutLogEvents',
    'cloudwatch:PutMetricData',
    'xray:PutTraceSegments',
    'xray:PutTelemetryRecords',
  ],
  governanceRuntime: [
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:Query',
    'dynamodb:Scan',
    's3:GetObject',
    's3:PutObject',
    'kms:Decrypt',
    'kms:Encrypt',
    'kms:GenerateDataKey',
    'secretsmanager:GetSecretValue',
  ],
  auditLogging: [
    'logs:CreateLogGroup',
    'logs:CreateLogStream',
    'logs:PutLogEvents',
    's3:PutObject',
    's3:GetObject',
    'kms:Encrypt',
    'kms:Decrypt',
  ],
};

export function createServiceRole(scope: any, servicePrincipal: string, roleName: string): iam.Role {
  return new iam.Role(scope, roleName, {
    assumedBy: new iam.ServicePrincipal(servicePrincipal),
    roleName,
  });
}
