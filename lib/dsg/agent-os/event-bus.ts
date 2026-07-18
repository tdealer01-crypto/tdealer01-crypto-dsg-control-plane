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

/**
 * Minimal Redis surface the bus needs. Satisfied by @upstash/redis (REST,
 * serverless-friendly) or any injected fake in tests.
 */
export interface RedisLikeClient {
  ping(): Promise<unknown>;
  lpush(key: string, ...values: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<unknown[]>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
}

class EventBus {
  private subscriptions = new Map<string, Subscription>();
  private streams = new Map<string, Event[]>();
  private counter = 0;
  private redisUrl?: string;
  private usingRedis = false;
  private redisClient?: RedisLikeClient;
  private readonly redisKeyPrefix = 'agent-os:stream:';
  private readonly maxRedisEventsPerStream = 500;

  async initializeRedis(redisUrl: string): Promise<{ ok: boolean; error?: string }> {
    // Legacy TCP URL path. No TCP client is opened in serverless; real
    // persistence goes through initializeUpstash (REST). Does not claim
    // usingRedis without an actual connection.
    this.redisUrl = redisUrl;
    return { ok: true };
  }

  /**
   * Connect the bus to Upstash Redis (REST) for durable event persistence.
   * Pass url+token, or inject a client (tests). Verifies with a ping before
   * claiming the connection. Delivery to subscribers stays in-process; what
   * Redis adds is that published events survive across serverless invocations
   * and are readable from any instance via getEvents.
   */
  async initializeUpstash(input: {
    url?: string;
    token?: string;
    client?: RedisLikeClient;
  }): Promise<{ ok: boolean; error?: string }> {
    try {
      let client = input.client;
      if (!client) {
        if (!input.url || !input.token) {
          return { ok: false, error: 'Upstash URL and token are required' };
        }
        const { Redis } = await import('@upstash/redis');
        client = new Redis({ url: input.url, token: input.token }) as unknown as RedisLikeClient;
      }
      await client.ping();
      this.redisClient = client;
      this.usingRedis = true;
      return { ok: true };
    } catch (err) {
      this.redisClient = undefined;
      this.usingRedis = false;
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
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

    // Compute evidence hash
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

    // Store in stream
    const streamKey = this.getStreamKey(event.type, event.targetAgentId);
    const stream = this.streams.get(streamKey) || [];
    stream.push(event);
    this.streams.set(streamKey, stream);

    // Durable persistence (best-effort): newest-first list per stream in Redis.
    if (this.redisClient) {
      const key = this.redisKeyPrefix + streamKey;
      try {
        await this.redisClient.lpush(key, JSON.stringify(event));
        await this.redisClient.ltrim(key, 0, this.maxRedisEventsPerStream - 1);
      } catch (err) {
        console.error('[AgentOS EventBus] Redis persist failed:', err);
      }
    }

    // Deliver to subscribers
    for (const subscription of this.subscriptions.values()) {
      // Match by event type OR if event has targetAgentId matching this subscription's agent
      const typeMatches = subscription.eventTypes.includes(event.type) || subscription.eventTypes.includes('*');
      const targetMatches = event.targetAgentId && event.targetAgentId === subscription.agentId;
      
      if (typeMatches || targetMatches) {
        // Async delivery
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
    // Prefer the durable Redis stream when connected — it spans invocations.
    if (this.redisClient) {
      try {
        const raw = await this.redisClient.lrange(this.redisKeyPrefix + streamKey, 0, limit - 1);
        // Upstash may auto-deserialize JSON strings; handle both shapes.
        const parsed = raw.map((r) => (typeof r === 'string' ? (JSON.parse(r) as Event) : (r as Event)));
        let events = parsed.reverse(); // stored newest-first; return chronological
        if (since) {
          events = events.filter((e) => e.timestamp > since);
        }
        return events.slice(-limit);
      } catch (err) {
        console.error('[AgentOS EventBus] Redis read failed, falling back to memory:', err);
      }
    }

    const stream = this.streams.get(streamKey) || [];
    let events = stream;

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