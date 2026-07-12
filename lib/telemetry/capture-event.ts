import { getPostHogClient } from './posthog-client';

export interface EventContext {
  userId: string;
  organizationId: string;
  workspaceId?: string;
  agentId?: string;
}

export async function captureEvent(
  event: string,
  context: EventContext,
  properties: Record<string, any> = {}
): Promise<void> {
  try {
    const posthog = getPostHogClient();

    posthog.capture({
      distinctId: context.userId,
      event,
      groups: {
        organization: context.organizationId,
        workspace: context.workspaceId || context.organizationId,
        agent: context.agentId || undefined,
      },
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`[Telemetry] Failed to capture event "${event}":`, error);
  }
}
