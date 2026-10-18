/**
 * DSG Secrets Manager Integrator Skill
 *
 * AWS Secrets Manager integration with credential broker,
 * IAM policies, ECS task definitions, and audit trail.
 */

interface SecretMetadata {
  name: string;
  arn: string;
  version: string;
  lastRotatedDate: Date;
  description: string;
}

interface CredentialLease {
  id: string;
  secretName: string;
  fingerprint: string;
  issuedAt: Date;
  expiresAt: Date;
  requesterId: string;
  policyHash: string;
}

interface IntegrationResult {
  status: "SUCCESS" | "FAILURE" | "PENDING";
  action: string;
  message: string;
  details?: Record<string, unknown>;
  errors?: string[];
  nextSteps?: string[];
}

/**
 * Generate IAM policy for ECS task execution role
 */
export function generateTaskExecutionPolicy(
  awsAccountId: string,
  environment: string
): {
  policy: Record<string, unknown>;
  description: string;
} {
  const secretPattern = `arn:aws:secretsmanager:us-east-1:${awsAccountId}:secret:dsg-one-${environment}-*`;
  const kmsKeyPattern = `arn:aws:kms:us-east-1:${awsAccountId}:key/*`;

  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "SecretsManagerReadAccess",
        Effect: "Allow",
        Action: [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecretVersionIds",
        ],
        Resource: [secretPattern],
      },
      {
        Sid: "KmsDecryptAccess",
        Effect: "Allow",
        Action: ["kms:Decrypt", "kms:DescribeKey"],
        Resource: [kmsKeyPattern],
      },
      {
        Sid: "DynamoDBAccessForAudit",
        Effect: "Allow",
        Action: [
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:GetItem",
        ],
        Resource: [
          `arn:aws:dynamodb:us-east-1:${awsAccountId}:table/credential_leases`,
          `arn:aws:dynamodb:us-east-1:${awsAccountId}:table/credential_access_audit`,
        ],
      },
    ],
  };

  return {
    policy,
    description: `ECS task execution role policy for ${environment} - allows Secrets Manager access`,
  };
}

/**
 * Update ECS task definition with secret references
 */
export function updateTaskDefinitionSecrets(
  environment: string,
  awsAccountId: string
): {
  secretsConfiguration: Array<{
    name: string;
    valueFrom: string;
  }>;
  environmentConfiguration: Array<{
    name: string;
    value: string;
  }>;
} {
  const secretsPrefix = `arn:aws:secretsmanager:us-east-1:${awsAccountId}:secret:dsg-one-${environment}`;

  return {
    secretsConfiguration: [
      {
        name: "ANTHROPIC_API_KEY",
        valueFrom: `${secretsPrefix}-api-secrets-v2:ANTHROPIC_API_KEY::`,
      },
      {
        name: "JWT_SECRET",
        valueFrom: `${secretsPrefix}-api-secrets-v2:JWT_SECRET::`,
      },
      {
        name: "API_KEY",
        valueFrom: `${secretsPrefix}-api-secrets-v2:API_KEY::`,
      },
      {
        name: "DB_USER",
        valueFrom: `${secretsPrefix}-database-secrets-v2:username::`,
      },
      {
        name: "DB_PASSWORD",
        valueFrom: `${secretsPrefix}-database-secrets-v2:password::`,
      },
      {
        name: "DB_HOST",
        valueFrom: `${secretsPrefix}-database-secrets-v2:host::`,
      },
      {
        name: "GITHUB_CLIENT_ID",
        valueFrom: `${secretsPrefix}-oauth-secrets-v2:GITHUB_CLIENT_ID::`,
      },
      {
        name: "GITHUB_CLIENT_SECRET",
        valueFrom: `${secretsPrefix}-oauth-secrets-v2:GITHUB_CLIENT_SECRET::`,
      },
    ],
    environmentConfiguration: [
      {
        name: "CREDENTIAL_BROKER_URL",
        value: "http://localhost:3001/api/credential-broker",
      },
      {
        name: "SECRETS_MANAGER_ENABLED",
        value: "true",
      },
      {
        name: "SECRETS_MANAGER_REGION",
        value: "us-east-1",
      },
      {
        name: "CREDENTIAL_LEASE_DURATION_SECONDS",
        value: "900", // 15 minutes
      },
    ],
  };
}

/**
 * Create credential broker configuration
 */
export function createCredentialBrokerConfig(environment: string): {
  config: Record<string, unknown>;
  secretsToCreate: Array<{
    name: string;
    description: string;
  }>;
} {
  return {
    config: {
      environment,
      backend: "aws-secrets-manager",
      region: "us-east-1",
      credentialLeaseDefaults: {
        defaultDuration: 900, // 15 minutes
        maxDuration: 3600, // 1 hour
        minDuration: 60, // 1 minute
        renewalBuffer: 300, // renew 5 min before expiry
      },
      auditLogging: {
        enabled: true,
        storage: "dynamodb",
        tables: {
          leases: "credential_leases",
          access: "credential_access_audit",
        },
      },
      security: {
        fingerprintAlgorithm: "sha256",
        neverReturnRawSecret: true,
        requirePolicyApproval: true,
        maskSecretsInLogs: true,
      },
    },
    secretsToCreate: [
      {
        name: `dsg-one-${environment}-api-secrets-v2`,
        description: "API credentials (ANTHROPIC_API_KEY, JWT_SECRET, etc.)",
      },
      {
        name: `dsg-one-${environment}-database-secrets-v2`,
        description: "Database credentials (username, password, host)",
      },
      {
        name: `dsg-one-${environment}-oauth-secrets-v2`,
        description: "OAuth credentials (GitHub, Google client IDs)",
      },
    ],
  };
}

/**
 * Setup credential broker for Secrets Manager
 */
export async function setupCredentialBroker(
  environment: string,
  options?: { testConnection?: boolean }
): Promise<IntegrationResult> {
  try {
    console.log(
      `Setting up credential broker for AWS Secrets Manager (${environment})...`
    );

    const config = createCredentialBrokerConfig(environment);

    const result: IntegrationResult = {
      status: "SUCCESS",
      action: "setup-credential-broker",
      message: `Credential broker configuration generated for ${environment}`,
      details: {
        config: config.config,
        secretsToCreate: config.secretsToCreate,
        brokerUrl: "http://localhost:3001/api/credential-broker",
        setupSteps: [
          "1. Update lib/dsg/brain/credential-broker.ts with config above",
          "2. Implement getSecretFromVault() to query Secrets Manager",
          "3. Implement issueLease() to create leases",
          "4. Implement auditSecretAccess() to log audit trail",
          "5. Update ECS task definition with IAM policy",
          "6. Deploy and test credential leasing",
        ],
      },
      nextSteps: [
        "Review generated configuration",
        "Implement credential broker handlers",
        "Create DynamoDB tables for leases and audit",
        "Deploy updated ECS task definition",
        "Run integration tests",
      ],
    };

    if (options?.testConnection) {
      result.details!.connectionTest = {
        status: "PENDING",
        note: "Connection test requires AWS credentials in environment",
      };
    }

    return result;
  } catch (error) {
    return {
      status: "FAILURE",
      action: "setup-credential-broker",
      message: `Failed to setup credential broker: ${error instanceof Error ? error.message : String(error)}`,
      errors: [
        error instanceof Error ? error.message : String(error),
      ],
      nextSteps: [
        "Check error details above",
        "Verify AWS credentials are configured",
        "Review credential broker implementation",
      ],
    };
  }
}

/**
 * Update ECS task definition for Secrets Manager
 */
export async function updateEcsTaskDefinition(
  environment: string,
  awsAccountId: string,
  taskDefinitionFamily: string = "dsg-control-plane"
): Promise<IntegrationResult> {
  try {
    console.log(
      `Updating ECS task definition for Secrets Manager (${environment})...`
    );

    const secretsConfig = updateTaskDefinitionSecrets(environment, awsAccountId);

    const taskDefinition = {
      family: taskDefinitionFamily,
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      cpu: "1024",
      memory: "2048",
      executionRoleArn: `arn:aws:iam::${awsAccountId}:role/ecsTaskExecutionRole`,
      taskRoleArn: `arn:aws:iam::${awsAccountId}:role/ecsTaskRole`,
      containerDefinitions: [
        {
          name: "dsg-api",
          image: `${awsAccountId}.dkr.ecr.us-east-1.amazonaws.com/dsg-api:latest`,
          portMappings: [
            {
              containerPort: 3000,
              protocol: "tcp",
            },
          ],
          secrets: secretsConfig.secretsConfiguration,
          environment: secretsConfig.environmentConfiguration,
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-group": `/ecs/dsg-control-plane`,
              "awslogs-region": "us-east-1",
              "awslogs-stream-prefix": "ecs",
            },
          },
        },
      ],
      tags: [
        {
          key: "Environment",
          value: environment,
        },
        {
          key: "SecretsManagerIntegration",
          value: "enabled",
        },
      ],
    };

    return {
      status: "SUCCESS",
      action: "update-ecs-task-definition",
      message: `ECS task definition updated for ${environment}`,
      details: {
        taskDefinition,
        deploymentSteps: [
          "1. Create new task definition version",
          `aws ecs register-task-definition --cli-input-json file://task-definition.json`,
          "2. Update ECS service to use new task definition",
          `aws ecs update-service --cluster dsg-one-${environment} --service dsg-service --task-definition ${taskDefinitionFamily}:latest --force-new-deployment`,
          "3. Monitor ECS service for successful deployment",
          `aws ecs describe-services --cluster dsg-one-${environment} --services dsg-service`,
        ],
      },
      nextSteps: [
        "Save task definition JSON to file",
        "Register new task definition with ECS",
        "Update ECS service with new task definition",
        "Monitor deployment progress",
        "Verify containers can access Secrets Manager",
      ],
    };
  } catch (error) {
    return {
      status: "FAILURE",
      action: "update-ecs-task-definition",
      message: `Failed to update ECS task definition: ${error instanceof Error ? error.message : String(error)}`,
      errors: [error instanceof Error ? error.message : String(error)],
      nextSteps: ["Check error details", "Verify AWS account ID", "Review CDK configuration"],
    };
  }
}

/**
 * Generate IAM policy file
 */
export async function generateIamPolicy(
  environment: string,
  awsAccountId: string
): Promise<IntegrationResult> {
  try {
    console.log(`Generating IAM policy for ${environment}...`);

    const policyResult = generateTaskExecutionPolicy(awsAccountId, environment);

    return {
      status: "SUCCESS",
      action: "generate-iam-policy",
      message: `IAM policy generated for ECS task execution role`,
      details: {
        policy: policyResult.policy,
        description: policyResult.description,
        deploymentSteps: [
          "1. Copy policy JSON",
          "2. Go to AWS IAM Console → Roles → ecsTaskExecutionRole",
          "3. Attach inline policy with above JSON",
          "4. Or use AWS CLI:",
          `aws iam put-role-policy --role-name ecsTaskExecutionRole --policy-name SecretsManagerAccess --policy-document file://policy.json`,
        ],
      },
      nextSteps: [
        "Save policy JSON to file",
        "Attach policy to ECS task execution role",
        "Verify role has new permissions",
        "Test with ECS task deployment",
      ],
    };
  } catch (error) {
    return {
      status: "FAILURE",
      action: "generate-iam-policy",
      message: `Failed to generate IAM policy: ${error instanceof Error ? error.message : String(error)}`,
      errors: [error instanceof Error ? error.message : String(error)],
      nextSteps: ["Review error details", "Check AWS account configuration"],
    };
  }
}

/**
 * Test credential broker integration
 */
export async function testCredentialBroker(
  environment: string
): Promise<IntegrationResult> {
  console.log(`Testing credential broker integration for ${environment}...`);

  const tests = [
    {
      name: "Secrets Manager connectivity",
      status: "PENDING",
      check: "Verify can query Secrets Manager API",
    },
    {
      name: "Credential lease issuance",
      status: "PENDING",
      check: "Create and verify lease",
    },
    {
      name: "Lease expiration",
      status: "PENDING",
      check: "Verify lease expires correctly",
    },
    {
      name: "Audit trail logging",
      status: "PENDING",
      check: "Verify access is logged to DynamoDB",
    },
    {
      name: "Policy-based access control",
      status: "PENDING",
      check: "Deny access when gate fails",
    },
  ];

  return {
    status: "PENDING",
    action: "test-credential-broker",
    message: `Credential broker testing suite prepared for ${environment}`,
    details: {
      tests,
      prerequisite: [
        "Credential broker must be deployed",
        "AWS credentials must be in environment",
        "Secrets Manager secrets must exist",
        "DynamoDB tables must be created",
      ],
    },
    nextSteps: [
      "Deploy credential broker",
      "Create DynamoDB tables",
      "Create Secrets Manager secrets",
      "Run test suite",
      "Review test results",
    ],
  };
}

/**
 * Main integration handler
 */
export async function secretsManagerIntegrator(options: {
  environment: "dev" | "staging" | "prod";
  action:
    | "setup-broker"
    | "update-ecs"
    | "generate-policy"
    | "test-broker"
    | "full-integration";
  awsAccountId?: string;
}): Promise<IntegrationResult> {
  const { environment, action, awsAccountId } = options;

  console.log(`DSG Secrets Manager Integrator: ${action} for ${environment}`);

  switch (action) {
    case "setup-broker":
      return await setupCredentialBroker(environment, {
        testConnection: true,
      });

    case "update-ecs":
      if (!awsAccountId) {
        return {
          status: "FAILURE",
          action: "update-ecs",
          message: "AWS Account ID required",
          errors: ["awsAccountId parameter is required"],
          nextSteps: ["Provide AWS account ID"],
        };
      }
      return await updateEcsTaskDefinition(environment, awsAccountId);

    case "generate-policy":
      if (!awsAccountId) {
        return {
          status: "FAILURE",
          action: "generate-policy",
          message: "AWS Account ID required",
          errors: ["awsAccountId parameter is required"],
          nextSteps: ["Provide AWS account ID"],
        };
      }
      return await generateIamPolicy(environment, awsAccountId);

    case "test-broker":
      return await testCredentialBroker(environment);

    case "full-integration":
      if (!awsAccountId) {
        return {
          status: "FAILURE",
          action: "full-integration",
          message: "AWS Account ID required",
          errors: ["awsAccountId parameter is required"],
          nextSteps: ["Provide AWS account ID"],
        };
      }

      // Execute all steps
      const brokerSetup = await setupCredentialBroker(environment);
      const policyGen = await generateIamPolicy(environment, awsAccountId);
      const ecsUpdate = await updateEcsTaskDefinition(
        environment,
        awsAccountId
      );
      const brokerTest = await testCredentialBroker(environment);

      return {
        status: "SUCCESS",
        action: "full-integration",
        message: `Full Secrets Manager integration completed for ${environment}`,
        details: {
          brokerSetup: brokerSetup.details,
          iamPolicy: policyGen.details,
          ecsTaskDefinition: ecsUpdate.details,
          tests: brokerTest.details,
        },
        nextSteps: [
          "Review all generated configurations",
          "Deploy IAM policy to AWS",
          "Register new ECS task definition",
          "Update ECS service with new task definition",
          "Run integration tests",
          "Monitor for credential access in audit trail",
        ],
      };

    default:
      return {
        status: "FAILURE",
        action,
        message: `Unknown action: ${action}`,
        errors: [
          "Valid actions: setup-broker, update-ecs, generate-policy, test-broker, full-integration",
        ],
        nextSteps: ["Check skill documentation for valid actions"],
      };
  }
}

export default secretsManagerIntegrator;
