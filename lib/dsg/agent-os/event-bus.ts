import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

export type EventPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Event {
  id: string;
  type: string;
  sourceAgentId: string;
  targetAgentId?: string;
  payload: unknown;
  priority: EventPriority;
  timestamp: string;
  correlationId?: string;
  causationId?: string;
  evidenceHash: string;
}

export interface Subscription {
  id: string;
  agentId: string;
  eventTypes: string[];
  handler: (event: Event) => Promise<void>;
}

export interface PublishInput {
  type: string;
  sourceAgentId: string;
  targetAgentId?: string;
  payload: unknown;
  priority?: EventPriority;
  correlationId?: string;
  causationId?: string;
}

export interface SubscribeInput {
  agentId: string;
  eventTypes: string[];
  handler: (event: Event) => Promise<void>;
}

export interface EventBusStats {
  totalSubscriptions: number;
  streams: number;
  usingRedis: boolean;
  eventsInMemory: number;
}

export interface RedisLikeClient {
  ping(): Promise<string>;
  lpush(key: string, ...values: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<unknown[]>;
  ltrim(key: string, start: number, stop: number): Promise<string>;
}

export interface UpstashInitInput {
  url?: string;
  token?: string;
  client?: RedisLikeClient;
}

class EventBus {
  private subscriptions = new Map<string, Subscription>();
  private streams = new Map<string, Event[]>();
  private counter = 0;
  private redisUrl?: string;
  private usingRedis = false;
  private redisClient?: RedisLikeClient;

  async initializeRedis(redisUrl: string): Promise<{ ok: boolean; error?: string }> {
    this.redisUrl = redisUrl;
    this.usingRedis = true;
    return { ok: true };
  }

  async initializeUpstash(input: UpstashInitInput): Promise<{ ok: boolean; error?: string }> {
    if (input.client) {
      this.redisClient = input.client;
      try {
        await this.redisClient.ping();
      } catch (error) {
        this.usingRedis = false;
        this.redisClient = undefined;
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Upstash ping failed',
        };
      }

      this.usingRedis = true;
      return { ok: true };
    }

    if (!input.url || !input.token) {
      this.usingRedis = false;
      this.redisClient = undefined;
      return { ok: false, error: 'Missing Upstash url/token/client' };
    }

    this.redisUrl = input.url;
    this.usingRedis = true;
    return { ok: true };
  }

  async shutdown(): Promise<void> {
    this.subscriptions.clear();
    this.streams.clear();
    this.usingRedis = false;
    this.redisClient = undefined;
  }

  private generateEventId(): string {
    this.counter++;
    return `evt-${this.counter.toString(36)}-${Date.now().toString(36)}`;
  }

  private generateSubscriptionId(agentId: string): string {
    this.counter++;
    return `sub-${agentId}-${this.counter.toString(36)}`;
  }

  private getStreamKey(type: string, targetAgentId?: string): string {
    if (targetAgentId) {
      return `direct:${targetAgentId}:${type}`;
    }
    return `broadcast:${type}`;
  }

  async publish(input: PublishInput): Promise<Event> {
    const id = this.generateEventId();
    const timestamp = new Date().toISOString();

    const event: Event = {
      id,
      type: input.type,
      sourceAgentId: input.sourceAgentId,
      targetAgentId: input.targetAgentId,
      payload: input.payload,
      priority: input.priority ?? 'normal',
      timestamp,
      correlationId: input.correlationId,
      causationId: input.causationId,
      evidenceHash: '',
    };

    event.evidenceHash = sha256Json({
      id: event.id,
      type: event.type,
      sourceAgentId: event.sourceAgentId,
      targetAgentId: event.targetAgentId ?? null,
      payload: event.payload,
      priority: event.priority,
      timestamp: event.timestamp,
      correlationId: event.correlationId ?? null,
      causationId: event.causationId ?? null,
      version: 'event-hash-v1',
    });

    const streamKey = this.getStreamKey(event.type, event.targetAgentId);
    const stream = this.streams.get(streamKey) || [];
    stream.push(event);
    this.streams.set(streamKey, stream);

    if (this.usingRedis && this.redisClient) {
      try {
        await this.redisClient.lpush(
          `agent-os:stream:${streamKey}`,
          JSON.stringify(event)
        );
      } catch {
        // ignore persistence failures
      }
    }

    for (const subscription of this.subscriptions.values()) {
      const typeMatches = subscription.eventTypes.includes(event.type) || subscription.eventTypes.includes('*');
      const targetMatches = event.targetAgentId && event.targetAgentId === subscription.agentId;

      if (typeMatches || targetMatches) {
        setTimeout(() => {
          subscription.handler(event).catch(console.error);
        }, 0);
      }
    }

    return event;
  }

  subscribe(input: SubscribeInput): string {
    const id = this.generateSubscriptionId(input.agentId);
    const subscription: Subscription = {
      id,
      agentId: input.agentId,
      eventTypes: input.eventTypes,
      handler: input.handler,
    };
    this.subscriptions.set(id, subscription);
    return id;
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  async request(input: PublishInput & { timeoutMs?: number }): Promise<unknown> {
    const correlationId = input.correlationId ?? `req-${Date.now().toString(36)}`;
    const responseType = `${input.type}.response`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, input.timeoutMs ?? 5000);

      const subscriptionId = this.subscribe({
        agentId: input.sourceAgentId,
        eventTypes: [responseType],
        handler: async (event) => {
          if (event.correlationId === correlationId) {
            clearTimeout(timeout);
            this.unsubscribe(subscriptionId);
            resolve(event.payload);
          }
        },
      });

      this.publish({
        ...input,
        correlationId,
      }).catch(reject);
    });
  }

  async getEvents(streamKey: string, since?: string, limit = 100): Promise<Event[]> {
    const memoryStream = this.streams.get(streamKey) || [];

    if (this.usingRedis && this.redisClient) {
      try {
        const redisKey = `agent-os:stream:${streamKey}`;
        const entries = await this.redisClient.lrange(redisKey, 0, limit - 1);
        const parsed: Event[] = [];
        for (const entry of entries) {
          if (typeof entry === 'string') {
            try {
              parsed.push(JSON.parse(entry) as Event);
            } catch {
              // ignore malformed entries
            }
          }
        }

        if (since) {
          return parsed.filter((e) => e.timestamp > since);
        }
        return parsed;
      } catch {
        // fall back to memory
      }
    }

    let events = memoryStream;

    if (since) {
      events = events.filter((e) => e.timestamp > since);
    }

    return events.slice(-limit);
  }

  getStats(): EventBusStats {
    return {
      totalSubscriptions: this.subscriptions.size,
      streams: this.streams.size,
      usingRedis: this.usingRedis,
      eventsInMemory: Array.from(this.streams.values()).reduce((sum, s) => sum + s.length, 0),
    };
  }
}

export const eventBus = new EventBus();
