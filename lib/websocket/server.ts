/**
 * Production WebSocket Server
 * Separate standalone server for real-time updates
 *
 * Usage: Run this with `bun lib/websocket/server.ts` or via Docker
 *
 * Environment variables:
 * - WS_PORT: WebSocket server port (default 3001)
 * - REDIS_URL: Redis connection string
 * - NODE_ENV: production/development
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createClient } from 'redis';

const PORT = parseInt(process.env.WS_PORT || '3001', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Redis client for subscribing to updates
const redisSubscriber = createClient({ url: REDIS_URL });
const redisPublisher = createClient({ url: REDIS_URL });

// HTTP server with WebSocket upgrade
const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Status endpoint
  if (req.url === '/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      port: PORT,
      environment: NODE_ENV,
      clients: wss.clients.size,
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });
const connectedClients = new Map<string, Set<string>>();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  console.log(`[WS] Client connected: ${clientId} from ${clientIp}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    payload: {
      clientId,
      message: 'Connected to Trinity WebSocket server',
      timestamp: new Date().toISOString(),
    },
  }));

  // Handle incoming messages (subscriptions)
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleClientMessage(clientId, ws, message);
    } catch (err) {
      console.error(`[WS] Parse error for ${clientId}:`, err);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Invalid message format' },
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`[WS] Client disconnected: ${clientId}`);
    connectedClients.delete(clientId);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error for ${clientId}:`, err.message);
  });

  // Send periodic heartbeat
  const heartbeat = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        payload: { timestamp: new Date().toISOString() },
      }));
    }
  }, 30000);

  // Cleanup heartbeat on close
  ws.on('close', () => clearInterval(heartbeat));
});

function handleClientMessage(clientId: string, ws: any, message: any) {
  const { type, payload } = message;

  switch (type) {
    case 'subscribe':
      // Subscribe to a channel
      const channel = payload?.channel;
      if (!channel) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Channel name required' },
        }));
        return;
      }

      if (!connectedClients.has(channel)) {
        connectedClients.set(channel, new Set());
      }
      connectedClients.get(channel)!.add(clientId);

      ws.send(JSON.stringify({
        type: 'subscribed',
        payload: { channel, clientId },
      }));

      console.log(`[WS] Client ${clientId} subscribed to ${channel}`);
      break;

    case 'unsubscribe':
      const unsubChannel = payload?.channel;
      if (connectedClients.has(unsubChannel)) {
        connectedClients.get(unsubChannel)!.delete(clientId);
      }

      ws.send(JSON.stringify({
        type: 'unsubscribed',
        payload: { channel: unsubChannel },
      }));

      console.log(`[WS] Client ${clientId} unsubscribed from ${unsubChannel}`);
      break;

    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        payload: { timestamp: new Date().toISOString() },
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Unknown message type' },
      }));
  }
}

// Redis subscription handler
async function setupRedisSubscription() {
  try {
    await redisSubscriber.connect();
    console.log('[Redis] Subscriber connected');

    // Subscribe to broadcast channels
    await redisSubscriber.subscribe('trinity:*', (message, channel) => {
      try {
        const data = JSON.parse(message);
        broadcastToChannel(channel, data);
      } catch (err) {
        console.error(`[Redis] Parse error on ${channel}:`, err);
      }
    });
  } catch (err) {
    console.error('[Redis] Subscription error:', err);
    process.exit(1);
  }
}

function broadcastToChannel(channel: string, data: any) {
  const clients = connectedClients.get(channel);
  if (!clients || clients.size === 0) return;

  const message = JSON.stringify({
    type: 'message',
    channel,
    payload: data,
  });

  let successCount = 0;
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
      successCount++;
    }
  }

  console.log(`[Broadcast] ${channel}: sent to ${successCount} clients`);
}

// Startup
async function start() {
  try {
    // Connect Redis publisher
    await redisPublisher.connect();
    console.log('[Redis] Publisher connected');

    // Setup Redis subscriptions
    await setupRedisSubscription();

    // Start HTTP/WebSocket server
    httpServer.listen(PORT, () => {
      console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Status: http://localhost:${PORT}/status`);
    });
  } catch (err) {
    console.error('[Startup] Error:', err);
    process.exit(1);
  }
}

start();
