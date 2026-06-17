import type { Task, AgentExecutionResult } from './types';
import { buildDryRunHermesRomContext } from '@/lib/dsg/hermes-e2e/rom';
import { executeBrowserbaseSafeDomCommand } from '@/lib/dsg/hermes-e2e/browserbase-safe-adapter';
import { buildHermesDomMirror } from '@/lib/dsg/hermes-e2e/dom-mirror';
import type { BrowserbaseSafeCompletion, BrowserbaseSafeExecutionMode } from '@/lib/dsg/hermes-e2e/types';
import type { RawDomElement, SafeDomCommand, SafeDomOperation } from '@/lib/dsg/safe-dom/types';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

export interface AgentExecutorContext {
  agentId: number;
  workspaceId: string;
  orgId: string;
  batchId: string;
  romContextHash?: string;
}

export async function executeTaskOnAgent(
  task: Task,
  context: AgentExecutorContext,
  rawElements: RawDomElement[] | undefined,
  executionMode: BrowserbaseSafeExecutionMode = 'dry_run',
  androidExecutorConfig?: { appPackage: string; allowedApps?: string[] },
): Promise<AgentExecutionResult> {
  const startTime = Date.now();

  // Route to Android executor if specified. Keep the Android/WebdriverIO stack
  // out of the default serverless bundle; it is only loaded for Android tasks.
  if (task.executorType === 'android') {
    return executeAndroidTask(task, context, androidExecutorConfig);
  }

  // Default to browser executor
  try {
    const rom = buildDryRunHermesRomContext({
      goal: `${task.domain}/${task.operation} on ${task.target}`,
      policyHints: ['safe_dom_required', 'no_real_website_navigation'],
    });

    if (!rawElements || rawElements.length === 0) {
      return {
        agentId: context.agentId,
        taskId: task.id,
        status: 'BLOCKED',
        decision: 'BLOCK',
        error: 'NO_RAW_ELEMENTS_PROVIDED',
        executionTimeMs: Date.now() - startTime,
      };
    }

    const frameId = `frame_${task.id}`;
    const mirror = buildHermesDomMirror({
      frameId,
      rawElements,
      romContextHash: rom.contextHash,
    });

    const desiredOp: SafeDomOperation =
      task.operation === 'submit' || task.operation === 'click' || task.operation === 'send'
        ? 'click'
        : 'type';

    const selectedElement =
      mirror.manifest.find((m) => m.allowedOps.includes(desiredOp)) ?? mirror.manifest[0];

    if (!selectedElement) {
      return {
        agentId: context.agentId,
        taskId: task.id,
        status: 'BLOCKED',
        decision: 'BLOCK',
        error: 'NO_SAFE_ELEMENTS_IN_MIRROR',
        executionTimeMs: Date.now() - startTime,
      };
    }

    const command: SafeDomCommand = {
      frameId,
      elementId: selectedElement.id,
      operation: desiredOp,
      ...(desiredOp === 'type' ? { value: task.target } : {}),
    };

    const result = await executeBrowserbaseSafeDomCommand({
      workspaceId: context.workspaceId,
      orgId: context.orgId,
      agentId: `hermes-agent-${context.agentId}`,
      effectId: `effect_${context.batchId}_${task.id}`,
      action: `${task.domain}_${task.operation}`,
      sessionId: `session_${context.batchId}_${context.agentId}`,
      frameId,
      rawElements,
      command,
      rom,
      actionDescriptor: {
        domain: task.domain,
        operation: task.operation,
        target: task.target,
        dataSensitivity: task.dataSensitivity,
        externalEffect: task.externalEffect,
        reversibility: task.reversibility,
        userAuthorized: task.userAuthorized,
        planAllowed: task.planAllowed,
        hasFreshEvidence: task.hasFreshEvidence,
        hasRollback: task.hasRollback,
      },
      executionMode,
    });

    const executionTimeMs = Date.now() - startTime;
    const evidenceHash = computeExecutionEvidenceHash(task, context, result);

    if (result.ok && result.decision === 'ALLOW') {
      return {
        agentId: context.agentId,
        taskId: task.id,
        status:
          result.status === 'DRY_RUN_COMPLETED' || result.status === 'COMPLETED'
            ? 'SUCCESS'
            : 'FAILED',
        decision: result.decision,
        result,
        executionTimeMs,
        evidenceHash,
      };
    }

    return {
      agentId: context.agentId,
      taskId: task.id,
      status: 'BLOCKED',
      decision: result.decision,
      error: result.reason || 'POLICY_BLOCKED',
      result,
      executionTimeMs,
      evidenceHash,
    };
  } catch (error) {
    return {
      agentId: context.agentId,
      taskId: task.id,
      status: 'FAILED',
      decision: 'BLOCK',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      executionTimeMs: Date.now() - startTime,
    };
  }
}

async function executeAndroidTask(
  task: Task,
  context: AgentExecutorContext,
  config?: { appPackage: string; allowedApps?: string[] },
): Promise<AgentExecutionResult> {
  const startTime = Date.now();

  if (!config?.appPackage) {
    return {
      agentId: context.agentId,
      taskId: task.id,
      status: 'BLOCKED',
      decision: 'BLOCK',
      error: 'ANDROID_APP_PACKAGE_NOT_PROVIDED',
      executionTimeMs: Date.now() - startTime,
    };
  }

  try {
    const { executeAndroidSafeDomCommand } = await import('@/lib/executors/android-executor');

    const frameId = `android_frame_${task.id}`;
    const desiredOp: SafeDomOperation =
      task.operation === 'submit' || task.operation === 'click' || task.operation === 'send'
        ? 'click'
        : 'type';

    const command: SafeDomCommand = {
      frameId,
      elementId: `${frameId}-e001`,
      operation: desiredOp,
      ...(desiredOp === 'type' ? { value: task.target } : {}),
    };

    const result = await executeAndroidSafeDomCommand({
      appPackage: config.appPackage,
      frameId,
      command,
      allowedApps: config.allowedApps,
      mode: 'dry_run',
      actionDescriptor: {
        domain: task.domain,
        operation: task.operation,
        target: task.target,
        dataSensitivity: task.dataSensitivity,
        externalEffect: task.externalEffect,
        reversibility: task.reversibility,
        userAuthorized: task.userAuthorized,
        planAllowed: task.planAllowed,
        hasFreshEvidence: task.hasFreshEvidence,
        hasRollback: task.hasRollback,
      },
    });

    const executionTimeMs = Date.now() - startTime;
    const evidenceHash = sha256Json({
      taskId: task.id,
      agentId: context.agentId,
      batchId: context.batchId,
      decision: result.decision,
      status: result.status,
      reason: result.reason,
      appPackage: result.trace.appPackage,
      manifestElementCount: result.trace.manifestElementCount,
      domMirrorHash: result.trace.domMirrorHash,
      touchedRealDevice: result.trace.touchedRealDevice,
      version: 'android-execution-evidence-v1',
    });

    if (result.ok && result.decision === 'ALLOW') {
      return {
        agentId: context.agentId,
        taskId: task.id,
        status:
          result.status === 'DRY_RUN_COMPLETED' || result.status === 'COMPLETED'
            ? 'SUCCESS'
            : 'FAILED',
        decision: result.decision,
        executionTimeMs,
        evidenceHash,
      };
    }

    return {
      agentId: context.agentId,
      taskId: task.id,
      status: 'BLOCKED',
      decision: result.decision,
      error: result.reason || 'POLICY_BLOCKED',
      executionTimeMs,
      evidenceHash,
    };
  } catch (error) {
    return {
      agentId: context.agentId,
      taskId: task.id,
      status: 'FAILED',
      decision: 'BLOCK',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute an agent's assigned tasks in startOrder.
 * Blocked tasks are recorded as evidence and execution continues with the
 * next task — one gated task must not silence the rest of the batch trail.
 */
export async function executeTasksSequentially(
  tasks: Task[],
  context: AgentExecutorContext,
  rawElements?: RawDomElement[],
  executionMode: BrowserbaseSafeExecutionMode = 'dry_run',
  androidExecutorConfig?: { appPackage: string; allowedApps?: string[] },
): Promise<AgentExecutionResult[]> {
  const results: AgentExecutionResult[] = [];

  for (const task of tasks) {
    const result = await executeTaskOnAgent(task, context, rawElements, executionMode, androidExecutorConfig);
    results.push(result);
  }

  return results;
}

function computeExecutionEvidenceHash(
  task: Task,
  context: AgentExecutorContext,
  result: BrowserbaseSafeCompletion,
): string {
  return sha256Json({
    taskId: task.id,
    agentId: context.agentId,
    batchId: context.batchId,
    decision: result.decision,
    status: result.status,
    reason: result.reason,
    romContextHash: result.trace.romContextHash,
    domMirrorHash: result.trace.domMirrorHash,
    commandElementId: result.trace.commandElementId,
    commandOperation: result.trace.commandOperation,
    browserbaseTouchedRealWebsite: result.trace.browserbaseTouchedRealWebsite,
    version: 'agent-execution-evidence-v1',
  });
}
