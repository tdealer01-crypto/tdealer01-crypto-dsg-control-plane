/**
 * Notification Listener
 * Sends notifications to users based on setup events
 */

import type {
  DSGEvent,
  PlanApprovedEvent,
  ProvisionStartedEvent,
  ItemCompletedEvent,
  ItemFailedEvent,
  ExecutionCompletedEvent,
  ExecutionFailedEvent,
} from '../types';

export interface UserNotification {
  id: string;
  org_id: string;
  user_id: string;
  type: 'email' | 'push' | 'in-app';
  subject: string;
  message: string;
  event_type: string;
  read: boolean;
  created_at: Date;
}

export class NotificationListener {
  private notifications: Map<string, UserNotification> = new Map();

  /**
   * Handle plan approved event
   */
  async onPlanApproved(event: DSGEvent<PlanApprovedEvent>): Promise<void> {
    const { approval_id, approved_by, approved_at } = event.data;

    const notification: UserNotification = {
      id: crypto.randomUUID(),
      org_id: event.org_id,
      user_id: approved_by,
      type: 'in-app',
      subject: 'Plan Approved',
      message: `Your provision plan has been approved and is ready for execution. Approval ID: ${approval_id}`,
      event_type: 'plan:approved',
      read: false,
      created_at: new Date(),
    };

    this.notifications.set(notification.id, notification);
    await this.deliver(notification);
  }

  /**
   * Handle provision started event
   */
  async onProvisionStarted(event: DSGEvent<ProvisionStartedEvent>): Promise<void> {
    const { execution_id } = event.data;

    const notification: UserNotification = {
      id: crypto.randomUUID(),
      org_id: event.org_id,
      user_id: event.user_id || 'system',
      type: 'in-app',
      subject: 'Provisioning Started',
      message: `Infrastructure provisioning has started. Execution ID: ${execution_id}. You can track progress in the dashboard.`,
      event_type: 'provision:started',
      read: false,
      created_at: new Date(),
    };

    this.notifications.set(notification.id, notification);
    await this.deliver(notification);
  }

  /**
   * Handle item completed event
   */
  async onItemCompleted(event: DSGEvent<ItemCompletedEvent>): Promise<void> {
    const { item_id, provider, action, duration_seconds } = event.data;

    const notification: UserNotification = {
      id: crypto.randomUUID(),
      org_id: event.org_id,
      user_id: event.user_id || 'system',
      type: 'in-app',
      subject: `Setup Step Complete: ${provider}`,
      message: `${provider} ${action} completed in ${duration_seconds}s`,
      event_type: 'item:completed',
      read: false,
      created_at: new Date(),
    };

    this.notifications.set(notification.id, notification);
    // Don't force deliver for progress updates; store for polling
  }

  /**
   * Handle item failed event
   */
  async onItemFailed(event: DSGEvent<ItemFailedEvent>): Promise<void> {
    const { item_id, provider, action, error } = event.data;

    const notification: UserNotification = {
      id: crypto.randomUUID(),
      org_id: event.org_id,
      user_id: event.user_id || 'system',
      type: 'email', // Email for failures
      subject: `Setup Failed: ${provider} ${action}`,
      message: `${provider} ${action} failed with error: ${error}. Check the execution log for details.`,
      event_type: 'item:failed',
      read: false,
      created_at: new Date(),
    };

    this.notifications.set(notification.id, notification);
    await this.deliver(notification);
  }

  /**
   * Handle execution completed event
   */
  async onExecutionCompleted(event: DSGEvent): Promise<void> {
    const notification: UserNotification = {
      id: crypto.randomUUID(),
      org_id: event.org_id,
      user_id: event.user_id || 'system',
      type: 'email',
      subject: 'Provisioning Complete',
      message:
        'All infrastructure setup steps have been completed successfully. Your environment is now ready.',
      event_type: 'execution:completed',
      read: false,
      created_at: new Date(),
    };

    this.notifications.set(notification.id, notification);
    await this.deliver(notification);
  }

  /**
   * Handle execution failed event
   */
  async onExecutionFailed(event: DSGEvent): Promise<void> {
    const notification: UserNotification = {
      id: crypto.randomUUID(),
      org_id: event.org_id,
      user_id: event.user_id || 'system',
      type: 'email',
      subject: 'Provisioning Failed',
      message: 'Infrastructure provisioning encountered an error. Check the dashboard for rollback status and next steps.',
      event_type: 'execution:failed',
      read: false,
      created_at: new Date(),
    };

    this.notifications.set(notification.id, notification);
    await this.deliver(notification);
  }

  /**
   * Deliver notification (placeholder for email/push service)
   */
  private async deliver(notification: UserNotification): Promise<void> {
    // Placeholder for actual delivery mechanism
    if (notification.type === 'email') {
      console.debug('[notification-listener] Sending email:', notification.subject);
      // In production: call email service (SendGrid, AWS SES, etc.)
    } else if (notification.type === 'push') {
      console.debug('[notification-listener] Sending push:', notification.subject);
      // In production: call push service (Firebase, OneSignal, etc.)
    } else {
      console.debug('[notification-listener] Creating in-app notification:', notification.subject);
    }
  }

  /**
   * Get notifications for user
   */
  getNotifications(org_id: string, user_id: string): UserNotification[] {
    return Array.from(this.notifications.values()).filter(
      (n) => n.org_id === org_id && n.user_id === user_id,
    );
  }

  /**
   * Mark notification as read
   */
  markAsRead(notification_id: string): boolean {
    const notification = this.notifications.get(notification_id);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  /**
   * Clear old notifications (for testing)
   */
  clearNotifications(): void {
    this.notifications.clear();
  }
}

export const notificationListener = new NotificationListener();
