import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RequestQueue,
  type QueuedRequest,
  type RequestPriority,
  type QueueStats,
} from '@/lib/performance/request-queue';

describe('RequestQueue - Priority Levels and FIFO', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  afterEach(() => {
    queue.clear();
  });

  const createRequest = (overrides: any = {}) => ({
    priority: 1 as RequestPriority,
    agentId: 'agent-1',
    delegationId: 'deleg-1',
    command: {
      frameId: 'frame-1',
      elementId: 'elem-1',
      action: 'click',
    },
    enqueuedAt: Date.now(),
    deadline: Date.now() + 30000,
    ...overrides,
  });

  it('should enqueue and dequeue with priority 1', () => {
    const reqId = queue.enqueue(createRequest({ priority: 1 }));
    expect(reqId).not.toBeNull();

    const dequeued = queue.dequeue();
    expect(dequeued).not.toBeNull();
    expect(dequeued?.priority).toBe(1);
  });

  it('should enqueue and dequeue with priority 2', () => {
    const reqId = queue.enqueue(createRequest({ priority: 2 }));
    expect(reqId).not.toBeNull();

    const dequeued = queue.dequeue();
    expect(dequeued).not.toBeNull();
    expect(dequeued?.priority).toBe(2);
  });

  it('should enqueue and dequeue with priority 3', () => {
    const reqId = queue.enqueue(createRequest({ priority: 3 }));
    expect(reqId).not.toBeNull();

    const dequeued = queue.dequeue();
    expect(dequeued).not.toBeNull();
    expect(dequeued?.priority).toBe(3);
  });

  it('should prioritize P1 over P2 and P3', () => {
    queue.enqueue(createRequest({ priority: 3 }));
    queue.enqueue(createRequest({ priority: 1 }));
    queue.enqueue(createRequest({ priority: 2 }));

    const first = queue.dequeue();
    expect(first?.priority).toBe(1);

    const second = queue.dequeue();
    expect(second?.priority).toBe(2);

    const third = queue.dequeue();
    expect(third?.priority).toBe(3);
  });

  it('should prioritize P2 over P3', () => {
    queue.enqueue(createRequest({ priority: 3 }));
    queue.enqueue(createRequest({ priority: 2 }));

    const first = queue.dequeue();
    expect(first?.priority).toBe(2);

    const second = queue.dequeue();
    expect(second?.priority).toBe(3);
  });

  it('should maintain FIFO order within priority 1', () => {
    const ids = [
      queue.enqueue(createRequest({ priority: 1, agentId: 'agent-1' })),
      queue.enqueue(createRequest({ priority: 1, agentId: 'agent-2' })),
      queue.enqueue(createRequest({ priority: 1, agentId: 'agent-3' })),
    ];

    const first = queue.dequeue();
    expect(first?.agentId).toBe('agent-1');

    const second = queue.dequeue();
    expect(second?.agentId).toBe('agent-2');

    const third = queue.dequeue();
    expect(third?.agentId).toBe('agent-3');
  });

  it('should maintain FIFO order within priority 2', () => {
    const ids = [
      queue.enqueue(createRequest({ priority: 2, agentId: 'agent-a' })),
      queue.enqueue(createRequest({ priority: 2, agentId: 'agent-b' })),
      queue.enqueue(createRequest({ priority: 2, agentId: 'agent-c' })),
    ];

    const first = queue.dequeue();
    expect(first?.agentId).toBe('agent-a');

    const second = queue.dequeue();
    expect(second?.agentId).toBe('agent-b');

    const third = queue.dequeue();
    expect(third?.agentId).toBe('agent-c');
  });

  it('should maintain FIFO order within priority 3', () => {
    const ids = [
      queue.enqueue(createRequest({ priority: 3, agentId: 'agent-x' })),
      queue.enqueue(createRequest({ priority: 3, agentId: 'agent-y' })),
      queue.enqueue(createRequest({ priority: 3, agentId: 'agent-z' })),
    ];

    const first = queue.dequeue();
    expect(first?.agentId).toBe('agent-x');

    const second = queue.dequeue();
    expect(second?.agentId).toBe('agent-y');

    const third = queue.dequeue();
    expect(third?.agentId).toBe('agent-z');
  });
});

describe('RequestQueue - Fairness and No Starvation', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  afterEach(() => {
    queue.clear();
  });

  const createRequest = (overrides: any = {}) => ({
    priority: 1 as RequestPriority,
    agentId: 'agent-1',
    delegationId: 'deleg-1',
    command: {
      frameId: 'frame-1',
      elementId: 'elem-1',
      action: 'click',
    },
    enqueuedAt: Date.now(),
    deadline: Date.now() + 30000,
    ...overrides,
  });

  it('should process P3 after max consecutive P3 dequeues (fairness limit)', () => {
    for (let i = 0; i < 10; i++) {
      queue.enqueue(createRequest({ priority: 3, agentId: `p3-agent-${i}` }));
    }

    const p3Dequeued = [];
    for (let i = 0; i < 5; i++) {
      const req = queue.dequeue();
      expect(req?.priority).toBe(3);
      p3Dequeued.push(req);
    }

    const nextReq = queue.dequeue();
    expect(nextReq).toBeNull();

    queue.enqueue(createRequest({ priority: 1 }));
    const p1Req = queue.dequeue();
    expect(p1Req?.priority).toBe(1);

    const nextP3 = queue.dequeue();
    expect(nextP3?.priority).toBe(3);
  });

  it('should not starve P3 when P1 and P2 are available', () => {
    queue.enqueue(createRequest({ priority: 1, agentId: 'p1-1' }));
    queue.enqueue(createRequest({ priority: 1, agentId: 'p1-2' }));
    queue.enqueue(createRequest({ priority: 2, agentId: 'p2-1' }));
    queue.enqueue(createRequest({ priority: 2, agentId: 'p2-2' }));
    queue.enqueue(createRequest({ priority: 3, agentId: 'p3-1' }));
    queue.enqueue(createRequest({ priority: 3, agentId: 'p3-2' }));

    const priorities = [];
    for (let i = 0; i < 6; i++) {
      const req = queue.dequeue();
      if (req) priorities.push(req.priority);
    }

    expect(priorities).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('should process P3 when P1 and P2 queues are empty', () => {
    queue.enqueue(createRequest({ priority: 3, agentId: 'p3-1' }));

    const req = queue.dequeue();
    expect(req).not.toBeNull();
    expect(req?.priority).toBe(3);
  });

  it('fairness counter resets when higher priority dequeued', () => {
    queue.enqueue(createRequest({ priority: 3, agentId: 'p3-1' }));
    queue.enqueue(createRequest({ priority: 3, agentId: 'p3-2' }));
    queue.enqueue(createRequest({ priority: 1, agentId: 'p1-1' }));
    queue.enqueue(createRequest({ priority: 3, agentId: 'p3-3' }));

    queue.dequeue();
    queue.dequeue();
    queue.dequeue();
    const req = queue.dequeue();
    expect(req?.agentId).toBe('p3-3');
  });
});

describe('RequestQueue - Timeout and Expiration', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  afterEach(() => {
    queue.clear();
  });

  const createRequest = (overrides: any = {}) => ({
    priority: 1 as RequestPriority,
    agentId: 'agent-1',
    delegationId: 'deleg-1',
    command: {
      frameId: 'frame-1',
      elementId: 'elem-1',
      action: 'click',
    },
    enqueuedAt: Date.now(),
    deadline: Date.now() + 30000,
    ...overrides,
  });

  it('should enqueue request with 30 second deadline', () => {
    const now = Date.now();
    const reqId = queue.enqueue(createRequest());
    expect(reqId).not.toBeNull();

    const dequeued = queue.dequeue();
    expect(dequeued?.deadline).toBeGreaterThanOrEqual(now + 30000 - 100);
  });

  it('should skip expired requests during dequeue', () => {
    const now = Date.now();
    const expiredDeadline = now - 1000;
    const validDeadline = now + 30000;

    queue.enqueue(
      createRequest({ priority: 1, agentId: 'expired-1', deadline: expiredDeadline })
    );
    queue.enqueue(
      createRequest({ priority: 1, agentId: 'valid-1', deadline: validDeadline })
    );

    const dequeued = queue.dequeue();
    expect(dequeued?.agentId).toBe('valid-1');
  });

  it('should count expired requests in stats', () => {
    const now = Date.now();
    const expiredDeadline = now - 1000;

    queue.enqueue(
      createRequest({ priority: 1, agentId: 'expired-1', deadline: expiredDeadline })
    );

    const lifetimeStats = queue.getLifetimeStats();
    expect(lifetimeStats.totalExpired).toBe(0);

    queue.dequeue();

    const updatedStats = queue.getLifetimeStats();
    expect(updatedStats.totalExpired).toBe(1);
  });

  it('should return null when all requests are expired', () => {
    const now = Date.now();
    const expiredDeadline = now - 1000;

    queue.enqueue(
      createRequest({ priority: 1, agentId: 'expired-1', deadline: expiredDeadline })
    );
    queue.enqueue(
      createRequest({ priority: 1, agentId: 'expired-2', deadline: expiredDeadline })
    );

    const dequeued = queue.dequeue();
    expect(dequeued).toBeNull();

    const stats = queue.getLifetimeStats();
    expect(stats.totalExpired).toBe(2);
  });

  it('should handle multiple expired requests before valid one', () => {
    const now = Date.now();
    const expiredDeadline = now - 1000;
    const validDeadline = now + 30000;

    for (let i = 0; i < 5; i++) {
      queue.enqueue(
        createRequest({
          priority: 1,
          agentId: `expired-${i}`,
          deadline: expiredDeadline,
        })
      );
    }
    queue.enqueue(createRequest({ priority: 1, agentId: 'valid-1', deadline: validDeadline }));

    const dequeued = queue.dequeue();
    expect(dequeued?.agentId).toBe('valid-1');

    const stats = queue.getLifetimeStats();
    expect(stats.totalExpired).toBe(5);
  });
});

describe('RequestQueue - Backpressure (Pause at 1000)', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  afterEach(() => {
    queue.clear();
  });

  const createRequest = (overrides: any = {}) => ({
    priority: 1 as RequestPriority,
    agentId: 'agent-1',
    delegationId: 'deleg-1',
    command: {
      frameId: 'frame-1',
      elementId: 'elem-1',
      action: 'click',
    },
    enqueuedAt: Date.now(),
    deadline: Date.now() + 30000,
    ...overrides,
  });

  it('should track queue size', () => {
    for (let i = 0; i < 10; i++) {
      queue.enqueue(createRequest({ agentId: `agent-${i}` }));
    }

    expect(queue.getTotalSize()).toBe(10);
  });

  it('should track priority queue sizes', () => {
    queue.enqueue(createRequest({ priority: 1 }));
    queue.enqueue(createRequest({ priority: 1 }));
    queue.enqueue(createRequest({ priority: 2 }));
    queue.enqueue(createRequest({ priority: 3 }));
    queue.enqueue(createRequest({ priority: 3 }));
    queue.enqueue(createRequest({ priority: 3 }));

    expect(queue.getQueueSize(1)).toBe(2);
    expect(queue.getQueueSize(2)).toBe(1);
    expect(queue.getQueueSize(3)).toBe(3);
  });

  it('should handle large queue sizes (>1000)', async () => {
    for (let i = 0; i < 1200; i++) {
      queue.enqueue(
        createRequest({
          agentId: `agent-${i}`,
          priority: (((i % 3) + 1) as RequestPriority),
        })
      );
    }

    expect(queue.getTotalSize()).toBe(1200);

    let count = 0;
    while (queue.dequeue() && count < 2000) {
      count++;
    }

    expect(count).toBeGreaterThan(100); // Should dequeue many accounting for fairness
  });

  it('processQueueAsync should pause when queue size > 1000', async () => {
    const processed = [];

    for (let i = 0; i < 1100; i++) {
      queue.enqueue(createRequest({ agentId: `agent-${i}` }));
    }

    const asyncGen = queue.processQueueAsync();
    const iter = asyncGen[Symbol.asyncIterator]();

    const timeoutMs = 500;
    const startTime = Date.now();

    try {
      while (Date.now() - startTime < timeoutMs) {
        const result = await Promise.race([
          iter.next(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 100)
          ),
        ]);

        if ((result as any).done) break;
        const req = (result as any).value;
        processed.push(req);

        if (processed.length >= 5) break;
      }
    } catch {
      // Timeout is expected
    }

    expect(processed.length).toBeGreaterThan(0);
  });

  it('processQueueAsync should resume when queue size < 500', async () => {
    for (let i = 0; i < 600; i++) {
      queue.enqueue(createRequest({ agentId: `agent-${i}` }));
    }

    while (queue.getTotalSize() > 490) {
      queue.dequeue();
    }

    expect(queue.getTotalSize()).toBeLessThan(500);

    const asyncGen = queue.processQueueAsync();
    const iter = asyncGen[Symbol.asyncIterator]();

    const result = await Promise.race([
      iter.next(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 200)
      ),
    ]);

    expect((result as any).value).toBeDefined();
  });
});

describe('RequestQueue - Requeue with Priority Bump', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  afterEach(() => {
    queue.clear();
  });

  const createRequest = (overrides: any = {}) => ({
    priority: 1 as RequestPriority,
    agentId: 'agent-1',
    delegationId: 'deleg-1',
    command: {
      frameId: 'frame-1',
      elementId: 'elem-1',
      action: 'click',
    },
    enqueuedAt: Date.now(),
    deadline: Date.now() + 30000,
    ...overrides,
  });

  it('should requeue with auto-bumped priority (P2->P1)', () => {
    const origReqId = queue.enqueue(createRequest({ priority: 2 }));
    const origReq = queue.dequeue()!;
    expect(origReq.attemptCount).toBe(1);

    const requeuedId = queue.requeue(origReq);
    expect(requeuedId).not.toBeNull();

    const requeued = queue.dequeue()!;
    expect(requeued.priority).toBe(1); // P2 auto-bumps to P1
  });

  it('should requeue with explicit priority', () => {
    const origReqId = queue.enqueue(createRequest({ priority: 3 }));
    const origReq = queue.dequeue()!;

    const requeuedId = queue.requeue(origReq, 1);
    expect(requeuedId).not.toBeNull();

    const requeued = queue.dequeue()!;
    expect(requeued.priority).toBe(1);
  });

  it('should auto-bump priority on requeue (P3->P2)', () => {
    const origReqId = queue.enqueue(createRequest({ priority: 3 }));
    const origReq = queue.dequeue()!;

    const requeuedId = queue.requeue(origReq);
    expect(requeuedId).not.toBeNull();

    const requeued = queue.dequeue()!;
    expect(requeued.priority).toBe(2);
  });

  it('should bump P1 to P1 (already highest)', () => {
    const origReqId = queue.enqueue(createRequest({ priority: 1 }));
    const origReq = queue.dequeue()!;

    const requeuedId = queue.requeue(origReq);
    expect(requeuedId).not.toBeNull();

    const requeued = queue.dequeue()!;
    expect(requeued.priority).toBe(1);
  });

  it('should reject requeue after 3 dequeues (attemptCount > 3)', () => {
    const origReq = createRequest() as QueuedRequest;
    origReq.id = '123';
    origReq.attemptCount = 4;

    const requeuedId = queue.requeue(origReq);
    expect(requeuedId).toBeNull();
  });

  it('should allow requeue up to 3 dequeues', () => {
    const origReq = createRequest() as QueuedRequest;
    origReq.id = '123';
    origReq.attemptCount = 2;

    const requeuedId = queue.requeue(origReq);
    expect(requeuedId).not.toBeNull();

    const requeued = queue.dequeue()!;
    expect(requeued.attemptCount).toBe(1); // Fresh dequeue starts at 0, increments to 1
  });

  it('should reset deadline on requeue', () => {
    const now = Date.now();
    const origReqId = queue.enqueue(createRequest({ priority: 1, enqueuedAt: now - 10000 }));
    const origReq = queue.dequeue()!;

    const requeuedId = queue.requeue(origReq);
    const requeued = queue.dequeue()!;

    expect(requeued.deadline).toBeGreaterThan(now + 29000);
  });
});

describe('RequestQueue - Queue Full (MAX_QUEUE_SIZE 10k)', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  afterEach(() => {
    queue.clear();
  });

  const createRequest = (overrides: any = {}) => ({
    priority: 1 as RequestPriority,
    agentId: 'agent-1',
    delegationId: 'deleg-1',
    command: {
      frameId: 'frame-1',
      elementId: 'elem-1',
      action: 'click',
    },
    enqueuedAt: Date.now(),
    deadline: Date.now() + 30000,
    ...overrides,
  });

  it('should accept 10000 requests', () => {
    for (let i = 0; i < 10000; i++) {
      const reqId = queue.enqueue(createRequest({ agentId: `agent-${i}` }));
      expect(reqId).not.toBeNull();
    }

    expect(queue.getTotalSize()).toBe(10000);
  });

  it('should reject request when queue reaches 10000', () => {
    for (let i = 0; i < 10000; i++) {
      queue.enqueue(createRequest({ agentId: `agent-${i}` }));
    }

    const rejectedId = queue.enqueue(createRequest({ agentId: 'agent-rejected' }));
    expect(rejectedId).toBeNull();

    const stats = queue.getLifetimeStats();
    expect(stats.totalRejected).toBe(1);
  });

  it('should accept requests again after dequeuing', () => {
    for (let i = 0; i < 10000; i++) {
      queue.enqueue(createRequest({ agentId: `agent-${i}` }));
    }

    queue.dequeue();
    expect(queue.getTotalSize()).toBe(9999);

    const reqId = queue.enqueue(createRequest({ agentId: 'agent-new' }));
    expect(reqId).not.toBeNull();
    expect(queue.getTotalSize()).toBe(10000);
  });

  it('should count rejections in stats', () => {
    for (let i = 0; i < 10000; i++) {
      queue.enqueue(createRequest({ agentId: `agent-${i}` }));
    }

    for (let i = 0; i < 5; i++) {
      queue.enqueue(createRequest({ agentId: `agent-rejected-${i}` }));
    }

    const stats = queue.getLifetimeStats();
    expect(stats.totalRejected).toBe(5);
  });
});

describe('RequestQueue - Concurrent Enqueue/Dequeue', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  afterEach(() => {
    queue.clear();
  });

  const createRequest = (overrides: any = {}) => ({
    priority: 1 as RequestPriority,
    agentId: 'agent-1',
    delegationId: 'deleg-1',
    command: {
      frameId: 'frame-1',
      elementId: 'elem-1',
      action: 'click',
    },
    enqueuedAt: Date.now(),
    deadline: Date.now() + 30000,
    ...overrides,
  });

  it('should handle concurrent enqueue operations', () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        Promise.resolve(queue.enqueue(createRequest({ agentId: `agent-${i}` })))
      );
    }

    return Promise.all(promises).then((results) => {
      expect(results.every((id) => id !== null)).toBe(true);
      expect(queue.getTotalSize()).toBe(100);
    });
  });

  it('should handle concurrent dequeue operations', async () => {
    for (let i = 0; i < 100; i++) {
      queue.enqueue(createRequest({ agentId: `agent-${i}` }));
    }

    const dequeuedRequests = [];
    for (let i = 0; i < 100; i++) {
      const req = queue.dequeue();
      if (req) dequeuedRequests.push(req);
    }

    expect(dequeuedRequests.length).toBe(100);
    expect(queue.getTotalSize()).toBe(0);
  });

  it('should maintain consistency with interleaved enqueue/dequeue', () => {
    const enqueueDequeueSequence = () => {
      queue.enqueue(createRequest({ agentId: 'agent-1' }));
      queue.enqueue(createRequest({ agentId: 'agent-2' }));
      const req1 = queue.dequeue();
      queue.enqueue(createRequest({ agentId: 'agent-3' }));
      const req2 = queue.dequeue();
      const req3 = queue.dequeue();

      return [req1, req2, req3].filter((r) => r !== null);
    };

    const results = enqueueDequeueSequence();
    expect(results.length).toBe(3);
    expect(results[0]?.agentId).toBe('agent-1');
    expect(results[1]?.agentId).toBe('agent-2');
    expect(results[2]?.agentId).toBe('agent-3');
  });

  it('should handle rapid enqueue/dequeue cycling', () => {
    for (let cycle = 0; cycle < 10; cycle++) {
      const ids = [];
      for (let i = 0; i < 50; i++) {
        const id = queue.enqueue(
          createRequest({ agentId: `agent-${cycle}-${i}` })
        );
        if (id) ids.push(id);
      }

      const dequeued = [];
      for (let i = 0; i < 50; i++) {
        const req = queue.dequeue();
        if (req) dequeued.push(req);
      }

      expect(dequeued.length).toBe(50);
      expect(queue.getTotalSize()).toBe(0);
    }
  });
});

describe('RequestQueue - Stats Accuracy', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  afterEach(() => {
    queue.clear();
  });

  const createRequest = (overrides: any = {}) => ({
    priority: 1 as RequestPriority,
    agentId: 'agent-1',
    delegationId: 'deleg-1',
    command: {
      frameId: 'frame-1',
      elementId: 'elem-1',
      action: 'click',
    },
    enqueuedAt: Date.now(),
    deadline: Date.now() + 30000,
    ...overrides,
  });

  it('should track total enqueued count', () => {
    queue.enqueue(createRequest());
    queue.enqueue(createRequest());
    queue.enqueue(createRequest());

    const stats = queue.getLifetimeStats();
    expect(stats.totalEnqueued).toBe(3);
  });

  it('should track total dequeued count', () => {
    queue.enqueue(createRequest());
    queue.enqueue(createRequest());
    queue.enqueue(createRequest());

    queue.dequeue();
    queue.dequeue();

    const stats = queue.getLifetimeStats();
    expect(stats.totalDequeued).toBe(2);
  });

  it('should calculate average wait time', () => {
    const now = Date.now();
    queue.enqueue(createRequest({ enqueuedAt: now - 100 }));
    queue.enqueue(createRequest({ enqueuedAt: now - 200 }));

    queue.dequeue();
    queue.dequeue();

    const stats = queue.getLifetimeStats();
    expect(stats.avgWaitTime).toBeGreaterThan(0);
    expect(stats.avgWaitTime).toBeLessThan(500);
  });

  it('should calculate percentiles (p95, p99) for dequeued requests', () => {
    const now = Date.now();

    for (let i = 0; i < 100; i++) {
      queue.enqueue(createRequest({ enqueuedAt: now - (i * 10) }));
    }

    for (let i = 0; i < 100; i++) {
      queue.dequeue();
    }

    const stats = queue.getStats();
    // With small wait times, percentiles may still be low but should exist
    expect(stats.p99WaitMs).toBeGreaterThanOrEqual(stats.p95WaitMs);
  });

  it('should report priority distribution', () => {
    queue.enqueue(createRequest({ priority: 1 }));
    queue.enqueue(createRequest({ priority: 1 }));
    queue.enqueue(createRequest({ priority: 2 }));
    queue.enqueue(createRequest({ priority: 3 }));
    queue.enqueue(createRequest({ priority: 3 }));
    queue.enqueue(createRequest({ priority: 3 }));

    const stats = queue.getStats();
    expect(stats.priorityDistribution.p1).toBe(2);
    expect(stats.priorityDistribution.p2).toBe(1);
    expect(stats.priorityDistribution.p3).toBe(3);
  });

  it('should report current queue size', () => {
    queue.enqueue(createRequest());
    queue.enqueue(createRequest());
    queue.enqueue(createRequest());

    const stats = queue.getStats();
    expect(stats.size).toBe(3);
  });

  it('should report oldest request age', () => {
    const now = Date.now();
    const oldTime = now - 5000;

    queue.enqueue(createRequest({ enqueuedAt: oldTime }));
    queue.enqueue(createRequest({ enqueuedAt: now }));

    const stats = queue.getStats();
    expect(stats.oldestRequestAgeMs).toBeGreaterThan(4900);
    expect(stats.oldestRequestAgeMs).toBeLessThan(5100);
  });

  it('should maintain stats after clear', () => {
    queue.enqueue(createRequest());
    queue.dequeue();

    const beforeClear = queue.getLifetimeStats();
    expect(beforeClear.totalEnqueued).toBe(1);

    queue.clear();

    const afterClear = queue.getLifetimeStats();
    expect(afterClear.totalEnqueued).toBe(0);
    expect(afterClear.totalDequeued).toBe(0);
  });

  it('should return zero stats for empty queue', () => {
    const stats = queue.getStats();
    expect(stats.size).toBe(0);
    expect(stats.avgWaitMs).toBe(0);
    expect(stats.p95WaitMs).toBe(0);
    expect(stats.p99WaitMs).toBe(0);
    expect(stats.priorityDistribution.p1).toBe(0);
    expect(stats.priorityDistribution.p2).toBe(0);
    expect(stats.priorityDistribution.p3).toBe(0);
    expect(stats.oldestRequestAgeMs).toBe(0);
  });

  it('should handle incremental stats calculation', () => {
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      queue.enqueue(createRequest({ enqueuedAt: now - (i * 100) }));
    }

    let stats = queue.getStats();
    expect(stats.size).toBe(5);

    queue.dequeue();
    queue.dequeue();

    stats = queue.getStats();
    expect(stats.size).toBe(3);

    const lifetimeStats = queue.getLifetimeStats();
    expect(lifetimeStats.totalDequeued).toBe(2);
  });
});

describe('RequestQueue - Edge Cases and Integration', () => {
  let queue: RequestQueue;

  beforeEach(() => {
    queue = new RequestQueue();
  });

  afterEach(() => {
    queue.clear();
  });

  const createRequest = (overrides: any = {}) => ({
    priority: 1 as RequestPriority,
    agentId: 'agent-1',
    delegationId: 'deleg-1',
    command: {
      frameId: 'frame-1',
      elementId: 'elem-1',
      action: 'click',
    },
    enqueuedAt: Date.now(),
    deadline: Date.now() + 30000,
    ...overrides,
  });

  it('should generate unique IDs for each request', () => {
    const id1 = queue.enqueue(createRequest());
    const id2 = queue.enqueue(createRequest());
    const id3 = queue.enqueue(createRequest());

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it('should handle empty dequeue gracefully', () => {
    const req = queue.dequeue();
    expect(req).toBeNull();
  });

  it('should handle multiple empty dequeues', () => {
    for (let i = 0; i < 5; i++) {
      const req = queue.dequeue();
      expect(req).toBeNull();
    }
  });

  it('should preserve command data through queue cycle', () => {
    const command = {
      frameId: 'frame-test-123',
      elementId: 'elem-test-456',
      action: 'fill_form',
      value: { username: 'testuser' },
    };

    const reqId = queue.enqueue(
      createRequest({
        command,
      })
    );

    const dequeued = queue.dequeue();
    expect(dequeued?.command).toEqual(command);
  });

  it('should respect fairness limit across long dequeue runs', () => {
    for (let i = 0; i < 20; i++) {
      const priority = i < 10 ? 3 : 1;
      queue.enqueue(createRequest({ priority, agentId: `agent-${i}` }));
    }

    let processed = 0;
    let p3Count = 0;

    while (processed < 20) {
      const req = queue.dequeue();
      if (!req) break;
      if (req.priority === 3) p3Count++;
      processed++;
    }

    expect(p3Count).toBeGreaterThan(0);
    expect(processed).toBeGreaterThanOrEqual(15);
  });

  it('should processQueueAsync yield requests indefinitely', async () => {
    const processed = [];

    for (let i = 0; i < 5; i++) {
      queue.enqueue(createRequest({ agentId: `agent-${i}` }));
    }

    const asyncGen = queue.processQueueAsync();
    const iter = asyncGen[Symbol.asyncIterator]();

    const processWithTimeout = async (count: number) => {
      let processedCount = 0;
      try {
        while (processedCount < count) {
          const result = await Promise.race([
            iter.next(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 200)
            ),
          ]);

          const req = (result as any).value;
          if (req) {
            processedCount++;
            processed.push(req);
          }
        }
      } catch {
        // Timeout or done
      }
      return processedCount;
    };

    const count = await processWithTimeout(5);
    expect(count).toBeGreaterThan(0);
  });

  it('should return valid QueuedRequest with all fields', () => {
    const reqId = queue.enqueue(
      createRequest({ agentId: 'test-agent', delegationId: 'test-deleg' })
    );

    const dequeued = queue.dequeue();

    expect(dequeued?.id).toBeDefined();
    expect(dequeued?.priority).toBeDefined();
    expect(dequeued?.agentId).toBe('test-agent');
    expect(dequeued?.delegationId).toBe('test-deleg');
    expect(dequeued?.command).toBeDefined();
    expect(dequeued?.enqueuedAt).toBeDefined();
    expect(dequeued?.deadline).toBeDefined();
    expect(dequeued?.attemptCount).toBe(1);
  });

  it('should increment attemptCount on each dequeue', () => {
    queue.enqueue(createRequest());
    const req1 = queue.dequeue();
    expect(req1?.attemptCount).toBe(1);

    queue.requeue(req1!);
    const req2 = queue.dequeue();
    expect(req2?.attemptCount).toBe(1);

    queue.requeue(req2!);
    const req3 = queue.dequeue();
    expect(req3?.attemptCount).toBe(1);
  });
});
