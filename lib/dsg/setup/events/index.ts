export { EventBus, eventBus } from './bus';
export type { DSGEvent, AnyEvent, EventListener, EventType } from './types';
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
  eventBus.subscribe('connector:connected', (event) => auditListener.onEvent(event as any));
  eventBus.subscribe('discovery:completed', (event) => auditListener.onEvent(event as any));
  eventBus.subscribe('plan:generated', (event) => auditListener.onEvent(event as any));
  eventBus.subscribe('plan:approved', async (event) => {
    await auditListener.onEvent(event as any);
    await webhookListener.onEvent(event as any);
    await notificationListener.onPlanApproved(event as any);
  });

  eventBus.subscribe('provision:started', async (event) => {
    await auditListener.onEvent(event as any);
    await webhookListener.onEvent(event as any);
    await notificationListener.onProvisionStarted(event as any);
  });

  eventBus.subscribe('item:executing', (event) => auditListener.onEvent(event as any));
  eventBus.subscribe('item:completed', async (event) => {
    await auditListener.onEvent(event as any);
    await webhookListener.onEvent(event as any);
    await notificationListener.onItemCompleted(event as any);
  });

  eventBus.subscribe('item:failed', async (event) => {
    await auditListener.onEvent(event as any);
    await webhookListener.onEvent(event as any);
    await notificationListener.onItemFailed(event as any);
  });

  eventBus.subscribe('secret:stored', (event) => auditListener.onEvent(event as any));
  eventBus.subscribe('secret:rotated', (event) => auditListener.onEvent(event as any));
  eventBus.subscribe('secret:accessed', (event) => auditListener.onEvent(event as any));

  eventBus.subscribe('health:checked', async (event) => {
    await auditListener.onEvent(event as any);
    await healthListener.onHealthChecked(event as any);
  });

  eventBus.subscribe('health:failed', async (event) => {
    await auditListener.onEvent(event as any);
    await healthListener.onHealthFailed(event as any);
  });

  eventBus.subscribe('webhook:received', (event) => auditListener.onEvent(event as any));

  eventBus.subscribe('execution:completed', async (event) => {
    await auditListener.onEvent(event as any);
    await webhookListener.onEvent(event as any);
    await notificationListener.onExecutionCompleted(event as any);
  });

  eventBus.subscribe('execution:failed', async (event) => {
    await auditListener.onEvent(event as any);
    await webhookListener.onEvent(event as any);
    await notificationListener.onExecutionFailed(event as any);
  });

  eventBus.subscribe('execution:paused', (event) => auditListener.onEvent(event as any));
  eventBus.subscribe('execution:resumed', (event) => auditListener.onEvent(event as any));
}
