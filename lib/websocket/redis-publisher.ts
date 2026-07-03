/**
 * Redis Publisher for WebSocket Broadcasting
 * Used by the Next.js app to send real-time updates to connected WebSocket clients
 */

import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = createClient({ url: redisUrl });

    redisClient.on('error', (err) => {
      console.error('[Redis] Error:', err);
    });

    await redisClient.connect();
    console.log('[Redis] Publisher connected');
  }

  return redisClient;
}

export interface BroadcastMessage {
  type: string;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Publish message to a Trinity channel
 * Channel format: trinity:{feature}
 * Examples: trinity:orchestration, trinity:executions, trinity:leaderboard
 */
export async function publishToChannel(channel: string, message: BroadcastMessage) {
  try {
    const client = await getRedisClient();

    // Ensure channel starts with trinity:
    const fullChannel = channel.startsWith('trinity:') ? channel : `trinity:${channel}`;

    // Add timestamp if not present
    const payload = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    };

    await client.publish(fullChannel, JSON.stringify(payload));
    console.log(`[Broadcast] Published to ${fullChannel}`);
  } catch (err) {
    console.error('[Broadcast] Error:', err);
    throw err;
  }
}

/**
 * Publish orchestration status update
 */
export async function publishOrchestrationUpdate(data: {
  executionId: string;
  status: 'running' | 'completed' | 'blocked' | 'failed';
  agentResults?: any;
  planHash?: string;
  governance?: any;
}) {
  await publishToChannel('trinity:orchestration', {
    type: 'orchestration-update',
    payload: data,
  });
}

/**
 * Publish execution result
 */
export async function publishExecutionResult(data: {
  executionId: string;
  agentName: string;
  result: any;
  status: 'success' | 'failed';
}) {
  await publishToChannel('trinity:executions', {
    type: 'execution-result',
    payload: data,
  });
}

/**
 * Publish reputation update
 */
export async function publishReputationUpdate(data: {
  agentId: string;
  newScore: number;
  change: number;
  reason: string;
}) {
  await publishToChannel('trinity:reputation', {
    type: 'reputation-update',
    payload: data,
  });
}

/**
 * Publish job discovery update
 */
export async function publishJobDiscoveryUpdate(data: {
  jobCount: number;
  jobs: any[];
  sources: string[];
}) {
  await publishToChannel('trinity:jobs', {
    type: 'job-discovery',
    payload: data,
  });
}

/**
 * Broadcast to all connected clients (system-wide)
 */
export async function broadcastSystemEvent(data: {
  type: string;
  message: string;
  severity?: 'info' | 'warning' | 'error';
}) {
  await publishToChannel('trinity:system', {
    type: 'system-event',
    payload: data,
  });
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedisPublisher() {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
    console.log('[Redis] Publisher disconnected');
  }
}
