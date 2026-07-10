/**
 * Event Bus
 * Publisher-Subscriber pattern for loose coupling between setup components
 */

import type { DSGEvent, EventListener, EventType, AnyEvent } from './types';

export class EventBus {
  private listeners: Map<EventType, Set<EventListener>> = new Map();
  private eventHistory: AnyEvent[] = [];
  private maxHistorySize = 10000;

  /**
   * Subscribe to events of a specific type
   */
  subscribe<T = Record<string, unknown>>(
    eventType: EventType,
    listener: EventListener<T>,
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;
    listeners.add(listener as EventListener);

    // Return unsubscribe function
    return () => {
      listeners.delete(listener as EventListener);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  /**
   * Subscribe to all events
   */
  subscribeAll(listener: EventListener): () => void {
    const unsubscribers: Array<() => void> = [];

    const eventTypes: EventType[] = [
      'connector:connected',
      'discovery:completed',
      'plan:generated',
      'plan:approved',
      'provision:started',
      'item:executing',
      'item:completed',
      'item:failed',
      'secret:stored',
      'secret:rotated',
      'secret:accessed',
      'health:checked',
      'health:failed',
      'webhook:received',
      'execution:completed',
      'execution:failed',
      'execution:paused',
      'execution:resumed',
    ];

    for (const eventType of eventTypes) {
      unsubscribers.push(this.subscribe(eventType, listener));
    }

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }

  /**
   * Emit an event
   */
  async emit<T = Record<string, unknown>>(event: DSGEvent<T>): Promise<void> {
    // Store in history
    this.eventHistory.push(event as AnyEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify listeners
    const listeners = this.listeners.get(event.type);
    if (!listeners) return;

    // Fire all listeners in parallel but don't fail if one throws
    const promises = Array.from(listeners).map((listener) =>
      (listener as EventListener)(event as any).catch((error) => {
        console.error(`[event-bus] Listener failed for ${event.type}:`, error);
      }),
    );

    await Promise.all(promises);
  }

  /**
   * Get event history (for audit/debugging)
   */
  getHistory(
    filter?: {
      org_id?: string;
      execution_id?: string;
      event_type?: EventType;
      since?: Date;
      limit?: number;
    },
  ): AnyEvent[] {
    let filtered = [...this.eventHistory];

    if (filter?.org_id) {
      filtered = filtered.filter((e) => e.org_id === filter.org_id);
    }

    if (filter?.execution_id) {
      filtered = filtered.filter((e) => e.execution_id === filter.execution_id);
    }

    if (filter?.event_type) {
      filtered = filtered.filter((e) => e.type === filter.event_type);
    }

    if (filter?.since) {
      filtered = filtered.filter((e) => e.timestamp >= filter.since);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get listener count
   */
  getListenerCount(eventType?: EventType): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size ?? 0;
    }

    let total = 0;
    for (const listeners of this.listeners.values()) {
      total += listeners.size;
    }
    return total;
  }
}

export const eventBus = new EventBus();
