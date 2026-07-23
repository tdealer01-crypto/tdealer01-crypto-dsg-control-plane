/**
 * DSG Infrastructure Deployer Skill
 *
 * Handles CDK deployment, verification, troubleshooting, and documentation
 * for DSG ONE / ProofGate control plane on AWS.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface DeploymentOptions {
  environment: "dev" | "staging" | "prod";
  action:
    | "deploy"
    | "synth"
    | "verify"
    | "document"
    | "troubleshoot"
    | "rollback";
  skipApproval?: boolean;
  dryRun?: boolean;
  stackVersion?: number;
}

interface DeploymentResult {
  success: boolean;
  action: string;
  environment: string;
  timestamp: string;
  stackName: string;
  message: string;
  details?: Record<string, unknown>;
  resources?: {
    created: number;
    updated: number;
    deleted: number;
  };
  outputs?: Record<string, string>;
  errors?: string[];
  nextSteps?: string[];
}

/**
 * Execute CDK synth to generate CloudFormation template
 */
export async function synthStack(
  environment: DeploymentOptions["environment"],
  options?: { dryRun?: boolean }
): Promise<DeploymentResult> {
  const cdkDir = path.join(process.cwd(), "infra/cdk");

  try {
    console.log(`Synthesizing CDK stack for ${environment}...`);

    const command = `cd ${cdkDir} && npx cdk synth --require-approval=never`;
    const output = execSync(command, { encoding: "utf-8" });

    const stackFile = path.join(
      cdkDir,
      "cdk.out",
      `DSGOneStack-${environment}.template.json`
    );
    const templateSize = fs.existsSync(stackFile)
      ? fs.statSync(stackFile).size
      : 0;

    return {
      success: true,
      action: "synth",
      environment,
      timestamp: new Date().toISOString(),
      stackName: `dsg-one-${environment}`,
      message: `Synthesized CloudFormation template (${(templateSize / 1024).toFixed(1)}KB)`,
      details: {
        templatePath: stackFile,
        templateSize,
        output: output.slice(0, 500),
      },
      nextSteps: [
        "Review generated template in cdk.out/",
        "Run 'deploy' action to create AWS resources",
        "Or use '--dry-run' to preview changes",
      ],
    };
  } catch (error) {
    return {
      success: false,
      action: "synth",
      environment,
      timestamp: new Date().toISOString(),
      stackName: `dsg-one-${environment}`,
      message: `Synth failed: ${error instanceof Error ? error.message : String(error)}`,
      errors: [
        error instanceof Error ? error.message : String(error),
        "Check Node.js version and npm dependencies",
      ],
      nextSteps: [
        "Run: npm run typecheck",
        "Run: cd infra/cdk && npm install",
        "Check CLAUDE.md for CDK setup requirements",
      ],
    };
  }
}

/**
 * Execute CDK deploy to create/update CloudFormation stack
 */
export async function deployStack(
  environment: DeploymentOptions["environment"],
  options?: { skipApproval?: boolean; dryRun?: boolean }
): Promise<DeploymentResult> {
  const cdkDir = path.join(process.cwd(), "infra/cdk");
  const stackName = `dsg-one-${environment}-v2`;

  try {
    console.log(`Deploying CDK stack: ${stackName}...`);
    console.log("This may take 15-45 minutes for initial deployment.");

    // First synth
    const synthResult = await synthStack(environment);
    if (!synthResult.success) {
      return {
        ...synthResult,
        action: "deploy",
        message: "Deployment failed at synth stage",
      };
    }

    // Then deploy
    const approvalFlag = options?.skipApproval ? "--require-approval=never" : "";
    const command = `cd ${cdkDir} && npx cdk deploy ${approvalFlag}`;

    console.log(`Running: ${command}`);
    const output = execSync(command, { encoding: "utf-8", stdio: "inherit" });

    return {
      success: true,
      action: "deploy",
      environment,
      timestamp: new Date().toISOString(),
      stackName,
      message: `Deployment to ${environment} initiated successfully`,
      details: { output: output.slice(0, 500) },
      nextSteps: [
        "Monitor CloudFormation in AWS Console",
        "Wait for stack status: CREATE_COMPLETE",
        "Run 'verify' action to check health",
        "Run 'document' action to capture outputs",
      ],
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);

    return {
      success: false,
      action: "deploy",
      environment,
      timestamp: new Date().toISOString(),
      stackName,
      message: `Deployment failed: ${errorMsg}`,
      errors: [errorMsg],
      nextSteps: [
        `Check CloudFormation stack: aws cloudformation describe-stacks --stack-name ${stackName}`,
        "For DELETE_FAILED: increment version (dsg-one-dev-v3) and redeploy",
        "Check CLAUDE.md section 'Troubleshooting' for known issues",
      ],
    };
  }
}

/**
 * Verify infrastructure health and resource status
 */
export async function verifyStack(
  environment: DeploymentOptions["environment"]
): Promise<DeploymentResult> {
  const stackName = `dsg-one-${environment}-v2`;
  const errors: string[] = [];
  const details: Record<string, unknown> = {};

  try {
    console.log(`Verifying stack: ${stackName}...`);

    // Check CloudFormation status
    try {
      const cfnCheck = execSync(
        `aws cloudformation describe-stacks --stack-name ${stackName} --region us-east-1 --query 'Stacks[0].StackStatus' --output text`,
        { encoding: "utf-8" }
      ).trim();

      details.stackStatus = cfnCheck;

      if (!["CREATE_COMPLETE", "UPDATE_COMPLETE"].includes(cfnCheck)) {
        errors.push(`CloudFormation status: ${cfnCheck} (not ready)`);
      }
    } catch (e) {
      errors.push(`CloudFormation check failed: ${e}`);
    }

    // Check ECS cluster
    try {
      const ecsCheck = execSync(
        `aws ecs describe-clusters --clusters ${stackName} --region us-east-1 --query 'clusters[0].status' --output text`,
        { encoding: "utf-8" }
      ).trim();

      details.ecsStatus = ecsCheck;

      if (ecsCheck !== "ACTIVE") {
        errors.push(`ECS cluster status: ${ecsCheck} (not active)`);
      }
    } catch (e) {
      errors.push(`ECS check failed: ${e}`);
    }

    return {
      success: errors.length === 0,
      action: "verify",
      environment,
      timestamp: new Date().toISOString(),
      stackName,
      message:
        errors.length === 0
          ? `Infrastructure verification passed`
          : `Verification found ${errors.length} issue(s)`,
      details,
      errors: errors.length > 0 ? errors : undefined,
      nextSteps: [
        "If errors: run 'troubleshoot' action",
        "Run 'document' action to capture outputs",
        "Check CloudWatch logs for application errors",
      ],
    };
  } catch (error) {
    return {
      success: false,
      action: "verify",
      environment,
      timestamp: new Date().toISOString(),
      stackName,
      message: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
      errors: [error instanceof Error ? error.message : String(error)],
      nextSteps: [
        "Ensure AWS credentials are configured",
        "Check AWS_REGION and AWS_ACCOUNT_ID environment variables",
      ],
    };
  }
}

/**
 * Capture and document infrastructure outputs
 */
export async function documentStack(
  environment: DeploymentOptions["environment"]
): Promise<DeploymentResult> {
  const stackName = `dsg-one-${environment}-v2`;
  const docsDir = path.join(process.cwd(), "docs", "infrastructure");

  try {
    console.log(`Documenting stack: ${stackName}...`);

    // Ensure docs directory exists
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Try to run capture script if it exists
    const captureScript = path.join(
      process.cwd(),
      "scripts",
      "capture-aws-outputs.sh"
    );

    if (fs.existsSync(captureScript)) {
      try {
        const output = execSync(
          `bash ${captureScript} --stack-name ${stackName} --region us-east-1 --environment ${environment}`,
          { encoding: "utf-8" }
        );

        return {
          success: true,
          action: "document",
          environment,
          timestamp: new Date().toISOString(),
          stackName,
          message: `Infrastructure documentation generated`,
          details: {
            outputDirectory: docsDir,
            files: [
              "DSG_AWS_Infrastructure_Outputs.md",
              "dsg-aws-outputs.json",
              "dsg-aws-outputs.env (reference only)",
            ],
            scriptOutput: output.slice(0, 200),
          },
          nextSteps: [
            `Review outputs in ${docsDir}`,
            "Commit .md and .json files to git",
            "Never commit .env file",
            "Use outputs in runbooks and documentation",
          ],
        };
      } catch (e) {
        return {
          success: false,
          action: "document",
          environment,
          timestamp: new Date().toISOString(),
          stackName,
          message: `Capture script failed`,
          errors: [`Script error: ${e}`],
          nextSteps: [
            "Check if capture-aws-outputs.sh exists and is executable",
            "Manually query AWS resources using aws cli",
          ],
        };
      }
    } else {
      return {
        success: false,
        action: "document",
        environment,
        timestamp: new Date().toISOString(),
        stackName,
        message: `Documentation script not found`,
        errors: ["scripts/capture-aws-outputs.sh not found"],
        nextSteps: [
          "Run: infrastructure-template task to generate script",
          "Or manually document resources using AWS Console",
        ],
      };
    }
  } catch (error) {
    return {
      success: false,
      action: "document",
      environment,
      timestamp: new Date().toISOString(),
      stackName,
      message: `Documentation failed: ${error instanceof Error ? error.message : String(error)}`,
      errors: [error instanceof Error ? error.message : String(error)],
      nextSteps: ["Check documentation script", "Verify AWS CLI access"],
    };
  }
}

/**
 * Troubleshoot deployment issues
 */
export async function troubleshootStack(
  environment: DeploymentOptions["environment"]
): Promise<DeploymentResult> {
  const stackName = `dsg-one-${environment}-v2`;
  const details: Record<string, unknown> = {};
  const issues: string[] = [];

  try {
    console.log(`Troubleshooting stack: ${stackName}...`);

    // Check for stuck stacks
    try {
      const events = execSync(
        `aws cloudformation describe-stack-events --stack-name ${stackName} --region us-east-1 --query 'StackEvents[0:5].[Timestamp,ResourceStatus,ResourceType,LogicalResourceId]' --output table`,
        { encoding: "utf-8" }
      );

      details.recentEvents = events.slice(0, 500);

      if (events.includes("DELETE_FAILED")) {
        issues.push(
          "Stack stuck in DELETE_FAILED - consider incrementing version (v3)"
        );
      }

      if (events.includes("CREATE_FAILED")) {
        issues.push("Stack has CREATE_FAILED resources");
      }

      if (events.includes("UPDATE_IN_PROGRESS")) {
        issues.push("Stack currently updating - wait for completion");
      }
    } catch (e) {
      issues.push(`Could not retrieve stack events: ${e}`);
    }

    return {
      success: issues.length === 0,
      action: "troubleshoot",
      environment,
      timestamp: new Date().toISOString(),
      stackName,
      message:
        issues.length === 0
          ? "No critical issues detected"
          : `Found ${issues.length} issue(s)`,
      details,
      errors: issues.length > 0 ? issues : undefined,
      nextSteps: [
        "Review AWS CloudFormation events in console",
        "Check CloudWatch logs for application errors",
        "See CLAUDE.md 'Troubleshooting' section for solutions",
      ],
    };
  } catch (error) {
    return {
      success: false,
      action: "troubleshoot",
      environment,
      timestamp: new Date().toISOString(),
      stackName,
      message: `Troubleshooting error: ${error instanceof Error ? error.message : String(error)}`,
      errors: [error instanceof Error ? error.message : String(error)],
      nextSteps: ["Ensure AWS CLI is installed and configured"],
    };
  }
}

/**
 * Main handler for skill invocation
 */
export async function deploymentHandler(
  options: DeploymentOptions
): Promise<DeploymentResult> {
  console.log(`DSG Infrastructure Deployer: ${options.action} ${options.environment}`);

  switch (options.action) {
    case "synth":
      return await synthStack(options.environment, {
        dryRun: options.dryRun,
      });

    case "deploy":
      return await deployStack(options.environment, {
        skipApproval: options.skipApproval ?? true,
        dryRun: options.dryRun,
      });

    case "verify":
      return await verifyStack(options.environment);

    case "document":
      return await documentStack(options.environment);

    case "troubleshoot":
      return await troubleshootStack(options.environment);

    case "rollback":
      return {
        success: false,
        action: "rollback",
        environment: options.environment,
        timestamp: new Date().toISOString(),
        stackName: `dsg-one-${options.environment}-v2`,
        message:
          "Rollback not yet implemented - use CloudFormation Console for manual rollback",
        errors: ["Rollback action requires manual AWS Console intervention"],
        nextSteps: [
          "Go to AWS CloudFormation Console",
          `Find stack: dsg-one-${options.environment}-v2`,
          "Click Stack Actions → Rollback Stack",
          "Or delete stack and deploy previous version",
        ],
      };

    default:
      return {
        success: false,
        action: options.action,
        environment: options.environment,
        timestamp: new Date().toISOString(),
        stackName: `dsg-one-${options.environment}`,
        message: `Unknown action: ${options.action}`,
        errors: [
          `Valid actions: deploy, synth, verify, document, troubleshoot, rollback`,
        ],
        nextSteps: ["Check skill documentation for valid actions"],
      };
  }
}

// Export for external use
export default deploymentHandler;
