import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface BedrockAgentCoreStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
  registryId: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
}

export class BedrockAgentCoreStack extends cdk.Stack {
  public readonly bedrockRoleArn: string;
  public readonly cognitoUserPoolArn: string;
  public readonly registryId: string;

  constructor(scope: Construct, id: string, props: BedrockAgentCoreStackProps) {
    super(scope, id, props);

    const { environment, registryId, cognitoUserPoolId, cognitoClientId } = props;

    // Keep AgentCore compatibility while Agent Registry moves to its dedicated namespace.
    const bedrockRole = new iam.Role(this, 'BedrockAgentCoreRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
        new iam.ServicePrincipal('agent-registry.amazonaws.com')
      ),
      description: 'Role for Bedrock Agent Core and AWS Agent Registry operations',
      roleName: `bedrock-agentcore-${environment}`,
    });

    // Existing AgentCore / preview Registry permissions retained during the migration window.
    bedrockRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock-agentcore-control:CreateRegistryRecord',
          'bedrock-agentcore-control:GetRegistryRecord',
          'bedrock-agentcore-control:UpdateRegistryRecord',
          'bedrock-agentcore-control:ListRegistryRecords',
          'bedrock-agentcore-control:SubmitRegistryRecordForApproval',
          'bedrock-agentcore-control:UpdateRegistryRecordStatus',
          'bedrock-agentcore:SearchRegistryRecords',
          'bedrock-agentcore:InvokeAgent',
        ],
        resources: ['*'],
      })
    );

    // AWS Agent Registry permissions in the new agent-registry namespace.
    bedrockRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'agent-registry:CreateRegistryRecord',
          'agent-registry:GetRegistryRecord',
          'agent-registry:UpdateRegistryRecord',
          'agent-registry:ListRegistryRecords',
          'agent-registry:DeleteRegistryRecord',
          'agent-registry:SubmitRegistryRecordForApproval',
          'agent-registry:UpdateRegistryRecordStatus',
          'agent-registry:SearchDiscoverableRegistryRecords',
          'agent-registry:ListDiscoverableRegistryRecords',
          'agent-registry:GetDiscoverableRegistryRecord',
        ],
        resources: [`arn:aws:agent-registry:${this.region}:${this.account}:*`],
      })
    );

    // Cognito Permissions
    bedrockRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cognito-idp:GetUser',
          'cognito-idp:GetUserAttributeVerificationCode',
          'cognito-idp:VerifyUserAttribute',
          'cognito-idp:ListUsers',
        ],
        resources: [`arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${cognitoUserPoolId}`],
      })
    );

    // CloudWatch Logs for AgentCore and Agent Registry traces.
    bedrockRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams',
        ],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/bedrock/agentcore/*`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/agent-registry/*`,
        ],
      })
    );

    // Cognito User Pool Reference
    const cognitoUserPool = cognito.UserPool.fromUserPoolId(
      this,
      'CognitoUserPool',
      cognitoUserPoolId
    );

    // Outputs for GitHub Actions + Deployment
    new cdk.CfnOutput(this, 'BedrockRoleArn', {
      value: bedrockRole.roleArn,
      description: 'ARN of Bedrock Agent Core IAM Role',
      exportName: `BedrockRoleArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'RegistryId', {
      value: registryId,
      description: 'AWS Agent Registry ID (agent-registry namespace)',
      exportName: `RegistryId-${environment}`,
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolArn', {
      value: cognitoUserPool.userPoolArn,
      description: 'ARN of Cognito User Pool',
      exportName: `CognitoUserPoolArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'CognitoClientId', {
      value: cognitoClientId,
      description: 'Cognito Client ID for JWT tokens',
      exportName: `CognitoClientId-${environment}`,
    });

    // Store for access in other stacks
    this.bedrockRoleArn = bedrockRole.roleArn;
    this.cognitoUserPoolArn = cognitoUserPool.userPoolArn;
    this.registryId = registryId;
  }
}
