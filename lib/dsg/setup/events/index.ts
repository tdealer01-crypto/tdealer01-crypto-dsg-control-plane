export { EventBus, eventBus } from './bus';
export type { DSGEvent, AnyEvent, EventListener, EventType } from './types';
import type {
  PlanApprovedEvent,
  ProvisionStartedEvent,
  ItemCompletedEvent,
  ItemFailedEvent,
  HealthCheckedEvent,
  HealthFailedEvent,
} from './types';
export { auditListener } from './listeners/audit-listener';
export { webhookListener } from './listeners/webhook-listener';
export { healthListener } from './listeners/health-listener';
export { notificationListener } from './listeners/notification-listener';

/**
 * Initialize event listeners
 * Connects listeners to the event bus
 */
export async function initializeEventListeners() {
  const { eventBus } = await import('./bus');
  const { auditListener } = await import('./listeners/audit-listener');
  const { webhookListener } = await import('./listeners/webhook-listener');
  const { healthListener } = await import('./listeners/health-listener');
  const { notificationListener } = await import('./listeners/notification-listener');

  // Subscribe all listeners to event bus
  eventBus.subscribe('connector:connected', (event) => auditListener.onEvent(event));
  eventBus.subscribe('discovery:completed', (event) => auditListener.onEvent(event));
  eventBus.subscribe('plan:generated', (event) => auditListener.onEvent(event));
  eventBus.subscribe<PlanApprovedEvent>('plan:approved', async (event) => {
    await auditListener.onEvent(event);
    await webhookListener.onEvent(event);
    await notificationListener.onPlanApproved(event);
  });

  eventBus.subscribe<ProvisionStartedEvent>('provision:started', async (event) => {
    await auditListener.onEvent(event);
    await webhookListener.onEvent(event);
    await notificationListener.onProvisionStarted(event);
  });

  eventBus.subscribe('item:executing', (event) => auditListener.onEvent(event));
  eventBus.subscribe<ItemCompletedEvent>('item:completed', async (event) => {
    await auditListener.onEvent(event);
    await webhookListener.onEvent(event);
    await notificationListener.onItemCompleted(event);
  });

  eventBus.subscribe<ItemFailedEvent>('item:failed', async (event) => {
    await auditListener.onEvent(event);
    await webhookListener.onEvent(event);
    await notificationListener.onItemFailed(event);
  });

  eventBus.subscribe('secret:stored', (event) => auditListener.onEvent(event));
  eventBus.subscribe('secret:rotated', (event) => auditListener.onEvent(event));
  eventBus.subscribe('secret:accessed', (event) => auditListener.onEvent(event));

  eventBus.subscribe<HealthCheckedEvent>('health:checked', async (event) => {
    await auditListener.onEvent(event);
    await healthListener.onHealthChecked(event);
  });

  eventBus.subscribe<HealthFailedEvent>('health:failed', async (event) => {
    await auditListener.onEvent(event);
    await healthListener.onHealthFailed(event);
  });

  eventBus.subscribe('webhook:received', (event) => auditListener.onEvent(event));

  eventBus.subscribe('execution:completed', async (event) => {
    await auditListener.onEvent(event);
    await webhookListener.onEvent(event);
    await notificationListener.onExecutionCompleted(event);
  });

  eventBus.subscribe('execution:failed', async (event) => {
    await auditListener.onEvent(event);
    await webhookListener.onEvent(event);
    await notificationListener.onExecutionFailed(event);
  });

  eventBus.subscribe('execution:paused', (event) => auditListener.onEvent(event));
  eventBus.subscribe('execution:resumed', (event) => auditListener.onEvent(event));
}
