import { afterEach, describe, expect, it } from 'vitest';
import { eventBus, type RedisLikeClient } from '../../lib/dsg/agent-os/event-bus';

class FakeRedis implements RedisLikeClient {
  store = new Map<string, string[]>();
  failPing = false;

  async ping(): Promise<string> {
    if (this.failPing) throw new Error('connection refused');
    return 'PONG';
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    const list = this.store.get(key) ?? [];
    list.unshift(...values);
    this.store.set(key, list);
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<unknown[]> {
    const list = this.store.get(key) ?? [];
    return list.slice(start, stop + 1);
  }

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    const list = this.store.get(key) ?? [];
    this.store.set(key, list.slice(start, stop + 1));
    return 'OK';
  }
}

describe('EventBus Upstash persistence', () => {
  afterEach(async () => {
    await eventBus.shutdown();
  });

  it('connects via injected client and reports usingRedis', async () => {
    const fake = new FakeRedis();
    const result = await eventBus.initializeUpstash({ client: fake });

    expect(result.ok).toBe(true);
    expect(eventBus.getStats().usingRedis).toBe(true);
  });

  it('fails gracefully when ping fails and stays in-memory', async () => {
    const fake = new FakeRedis();
    fake.failPing = true;

    const result = await eventBus.initializeUpstash({ client: fake });

    expect(result.ok).toBe(false);
    expect(eventBus.getStats().usingRedis).toBe(false);
  });

  it('rejects initialization without url/token/client', async () => {
    const result = await eventBus.initializeUpstash({});
    expect(result.ok).toBe(false);
  });

  it('persists published events to redis and reads them back', async () => {
    const fake = new FakeRedis();
    await eventBus.initializeUpstash({ client: fake });

    const published = await eventBus.publish({
      type: 'agent-os.test',
      sourceAgentId: 'test-agent',
      payload: { n: 1 },
    });

    expect(fake.store.get('agent-os:stream:broadcast:agent-os.test')?.length).toBe(1);

    const events = await eventBus.getEvents('broadcast:agent-os.test');
    expect(events.length).toBe(1);
    expect(events[0].id).toBe(published.id);
    expect(events[0].evidenceHash).toBe(published.evidenceHash);
  });

  it('shutdown disconnects redis', async () => {
    const fake = new FakeRedis();
    await eventBus.initializeUpstash({ client: fake });
    await eventBus.shutdown();

    expect(eventBus.getStats().usingRedis).toBe(false);
  });
});
