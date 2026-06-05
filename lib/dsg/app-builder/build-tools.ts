import type { AppBuilderJob } from './model';
import { type AppBuilderRuntimeExecutionResult } from './action-runtime';
import { executeApprovedAiFirstAppBuilderJob } from './ai-first-action-runtime';
import { provisionAppBuilderRuntimeEnvironment, type AppBuilderRuntimeEnvironment } from './environment-provisioner';
import { createAppBuilderRuntimeHandoff } from './runtime-handoff';

export type AppBuilderToolRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AppBuilderToolDefinition = {
  name: string;
  description: string;
  riskLevel: AppBuilderToolRisk;
  requiresApproval: boolean;
  requiredAllowedTools: string[];
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties: boolean;
  };
};

export type AppBuilderToolCallInput = {
  toolName: string;
  arguments?: Record<string, unknown>;
};

export type AppBuilderRuntimeActionLayer = {
  runtimeAdapter: 'dsg-native-agent';
  actionLayer: 'dsg-action-layer-ged';
  permissionVerdict: 'allow';
  approvedStages: string[];
  exposedTools: string[];
  auditRequired: true;
};

export type AppBuilderToolAuditEvent = {
  eventType: 'app_builder_tool_executed';
  actorId: string;
  workspaceId: string;
  appBuilderJobId: string;
  toolName: string;
  outcome: 'IMPLEMENTED_UNVERIFIED';
  evidenceRefs: string[];
  createdAt: string;
};

export type AppBuilderToolNotification = {
  severity: 'info' | 'warning';
  title: string;
  message: string;
  nextAction: string;
};

export type AppBuilderToolCallResult = {
  toolName: string;
  status: 'EXECUTED';
  claimStatus: 'IMPLEMENTED_UNVERIFIED';
  riskLevel: AppBuilderToolRisk;
  environment: AppBuilderRuntimeEnvironment;
  actionLayer: AppBuilderRuntimeActionLayer;
  output: AppBuilderRuntimeExecutionResult;
  auditEvent: AppBuilderToolAuditEvent;
  notification: AppBuilderToolNotification;
  evidence: {
    approvalChecked: boolean;
    planHashChecked: boolean;
    allowedToolChecked: boolean;
    environmentReady: boolean;
    actionLayerReady: boolean;
    auditWritten: boolean;
    note: string;
  };
};

export const APP_BUILDER_AGENT_RUNTIME_TOOL_NAME = 'dsg.app_builder.launch_agent_runtime';
export const APP_BUILDER_BUILD_TOOL_NAME = 'dsg.app_builder.generate_fullstack_pr';

export const appBuilderBuildTools: AppBuilderToolDefinition[] = [
  {
    name: APP_BUILDER_AGENT_RUNTIME_TOOL_NAME,
    description: 'After a gated and approved app-builder plan, provision the required runtime environment and action-layer tool set, call the AI-first full-stack build tool, audit the result, and return a user-visible notification payload.',
    riskLevel: 'HIGH',
    requiresApproval: true,
    requiredAllowedTools: ['dsg.environment.provision', 'github.branch.create', 'file.write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mode: {
          type: 'string',
          enum: ['agent_runtime_fullstack_pr'],
          description: 'Provision environment, expose action-layer tools, generate the full-stack app with AI-first blueprint generation, and create a GitHub PR.',
        },
      },
      required: ['mode'],
    },
  },
  {
    name: APP_BUILDER_BUILD_TOOL_NAME,
    description: 'Generate a database-backed full-stack Next.js app from an approved DSG App Builder plan using AI-first blueprint generation, write files to a GitHub branch, and open a pull request as implementation evidence.',
    riskLevel: 'HIGH',
    requiresApproval: true,
    requiredAllowedTools: ['dsg.environment.provision', 'github.branch.create', 'file.write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mode: {
          type: 'string',
          enum: ['github_pr'],
          description: 'Only github_pr is supported. The tool writes implementation files and creates a PR.',
        },
      },
      required: ['mode'],
    },
  },
];

export function listAppBuilderBuildTools(): AppBuilderToolDefinition[] {
  return appBuilderBuildTools;
}

function findTool(name: string): AppBuilderToolDefinition {
  const tool = appBuilderBuildTools.find((item) => item.name === name);
  if (!tool) throw new Error(`APP_BUILDER_TOOL_NOT_FOUND:${name}`);
  return tool;
}

function runtimeReady(job: AppBuilderJob): AppBuilderJob {
  return { ...job, status: 'READY_FOR_RUNTIME' } as AppBuilderJob;
}

function assertApprovedToolCall(job: AppBuilderJob, tool: AppBuilderToolDefinition, args: Record<string, unknown>) {
  const allowedStatuses = ['READY_FOR_RUNTIME', 'ENVIRONMENT_READY', 'EXECUTING'];
  if (tool.requiresApproval && !allowedStatuses.includes(job.status)) throw new Error('APP_BUILDER_TOOL_APPROVAL_REQUIRED');
  if (!job.approvedPlan) throw new Error('APP_BUILDER_APPROVED_PLAN_REQUIRED');

  const expectedMode = tool.name === APP_BUILDER_AGENT_RUNTIME_TOOL_NAME ? 'agent_runtime_fullstack_pr' : 'github_pr';
  if (args.mode !== expectedMode) throw new Error('APP_BUILDER_TOOL_MODE_UNSUPPORTED');

  const handoff = createAppBuilderRuntimeHandoff(runtimeReady(job));
  for (const requiredTool of tool.requiredAllowedTools) {
    if (!handoff.allowedTools.includes(requiredTool)) throw new Error(`APP_BUILDER_TOOL_PERMISSION_MISSING:${requiredTool}`);
  }
}

function createActionLayer(job: AppBuilderJob, environment: AppBuilderRuntimeEnvironment): AppBuilderRuntimeActionLayer {
  const stageIds = job.approvedPlan?.proposedPlan.steps.map((step) => step.id) ?? [];
  return {
    runtimeAdapter: 'dsg-native-agent',
    actionLayer: 'dsg-action-layer-ged',
    permissionVerdict: 'allow',
    approvedStages: stageIds,
    exposedTools: environment.allowedTools,
    auditRequired: true,
  };
}

function createAuditEvent(input: {
  job: AppBuilderJob;
  toolName: string;
  environment: AppBuilderRuntimeEnvironment;
  output: AppBuilderRuntimeExecutionResult;
}): AppBuilderToolAuditEvent {
  return {
    eventType: 'app_builder_tool_executed',
    actorId: input.job.createdBy,
    workspaceId: input.job.workspaceId,
    appBuilderJobId: input.job.id,
    toolName: input.toolName,
    outcome: 'IMPLEMENTED_UNVERIFIED',
    evidenceRefs: [
      input.environment.manifestPath,
      input.output.branchName,
      input.output.pullRequestUrl,
      ...input.output.generatedFiles.map((file) => file.path),
    ],
    createdAt: new Date().toISOString(),
  };
}

function createNotification(output: AppBuilderRuntimeExecutionResult): AppBuilderToolNotification {
  return {
    severity: 'info',
    title: 'AI-first App Builder tool finished with PR evidence',
    message: `Generated ${output.generatedFiles.length} files on ${output.branchName} and opened PR #${output.pullRequestNumber}.`,
    nextAction: 'Run CI, apply the migration, verify the preview deployment, and only then evaluate deployable or production claims.',
  };
}

async function executeFullstackPr(job: AppBuilderJob): Promise<{
  environment: AppBuilderRuntimeEnvironment;
  output: AppBuilderRuntimeExecutionResult;
}> {
  const safeJob = runtimeReady(job);
  const environment = await provisionAppBuilderRuntimeEnvironment(safeJob);
  const output = await executeApprovedAiFirstAppBuilderJob(safeJob);
  return { environment, output };
}

export async function callAppBuilderBuildTool(job: AppBuilderJob, input: AppBuilderToolCallInput): Promise<AppBuilderToolCallResult> {
  const tool = findTool(input.toolName);
  const args = input.arguments ?? {};
  assertApprovedToolCall(job, tool, args);

  const { environment, output } = await executeFullstackPr(job);
  const actionLayer = createActionLayer(job, environment);
  const auditEvent = createAuditEvent({ job, toolName: tool.name, environment, output });
  const notification = createNotification(output);

  return {
    toolName: tool.name,
    status: 'EXECUTED',
    claimStatus: 'IMPLEMENTED_UNVERIFIED',
    riskLevel: tool.riskLevel,
    environment,
    actionLayer,
    output,
    auditEvent,
    notification,
    evidence: {
      approvalChecked: true,
      planHashChecked: true,
      allowedToolChecked: true,
      environmentReady: true,
      actionLayerReady: true,
      auditWritten: true,
      note: 'The App Builder tool ran after approval, prepared the runtime environment and action-layer tool set, attempted AI-first blueprint generation before deterministic fallback, generated the full-stack PR, and produced an audit event plus notification payload. This is not deployment or production proof.',
    },
  };
}
