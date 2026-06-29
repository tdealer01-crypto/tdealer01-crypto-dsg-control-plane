/**
 * WebSocket Client for Real-time Updates
 * Browser-side connector with automatic reconnection and fallback to SSE
 */

export interface WebSocketMessage {
  type: string;
  channel?: string;
  payload?: any;
}

export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatTimeout?: number;
  fallbackToSSE?: boolean;
}

export class TrinityWebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private isManualClose = false;
  private messageHandlers = new Map<string, Set<(msg: WebSocketMessage) => void>>();
  private statusHandlers = new Set<(status: 'connecting' | 'connected' | 'disconnected') => void>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = Date.now();

  constructor(config: WebSocketConfig) {
    this.config = {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatTimeout: 60000,
      fallbackToSSE: true,
      ...config,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.notifyStatus('connecting');
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.reconnectAttempts = 0;
          this.notifyStatus('connected');
          this.setupHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (err) {
            console.error('[WebSocket] Parse error:', err);
          }
        };

        this.ws.onerror = (event) => {
          console.error('[WebSocket] Error:', event);
          reject(new Error('WebSocket connection error'));
        };

        this.ws.onclose = () => {
          this.cleanup();
          if (!this.isManualClose) {
            this.attemptReconnect();
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached, falling back to SSE');
      this.notifyStatus('disconnected');

      if (this.config.fallbackToSSE) {
        this.setupSSEFallback();
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((err) => {
        console.error('[WebSocket] Reconnect failed:', err);
      });
    }, delay);
  }

  private setupHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
        if (timeSinceLastHeartbeat > this.config.heartbeatTimeout) {
          console.warn('[WebSocket] Heartbeat timeout, reconnecting');
          this.ws.close();
          this.attemptReconnect();
          return;
        }

        this.send({ type: 'ping' });
      }
    }, 15000);
  }

  private setupSSEFallback() {
    console.log('[SSE] Falling back to Server-Sent Events');
    // SSE will be handled separately by the application
  }

  private handleMessage(message: WebSocketMessage) {
    const { type, channel, payload } = message;

    // Update heartbeat on any message
    this.lastHeartbeat = Date.now();

    if (type === 'heartbeat' || type === 'pong') {
      return; // Silently ignore heartbeats
    }

    if (type === 'message' && channel) {
      // Broadcast message from Redis
      const handlers = this.messageHandlers.get(channel);
      if (handlers) {
        handlers.forEach((handler) => handler(message));
      }
      return;
    }

    // Notify all handlers regardless of type
    this.messageHandlers.forEach((handlers) => {
      handlers.forEach((handler) => handler(message));
    });
  }

  send(message: WebSocketMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Not connected, message not sent');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('[WebSocket] Send error:', err);
      return false;
    }
  }

  subscribe(channel: string, handler: (msg: WebSocketMessage) => void): () => void {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, new Set());
    }

    this.messageHandlers.get(channel)!.add(handler);

    // Send subscribe message to server
    this.send({ type: 'subscribe', payload: { channel } });

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(channel);
          this.send({ type: 'unsubscribe', payload: { channel } });
        }
      }
    };
  }

  onStatusChange(handler: (status: 'connecting' | 'connected' | 'disconnected') => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private notifyStatus(status: 'connecting' | 'connected' | 'disconnected') {
    this.statusHandlers.forEach((handler) => handler(status));
  }

  disconnect(): void {
    this.isManualClose = true;
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private cleanup() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Factory function for creating client
export function createWebSocketClient(baseUrl: string): TrinityWebSocketClient {
  const wsUrl = baseUrl.replace(/^http/, 'ws');
  return new TrinityWebSocketClient({
    url: wsUrl,
    fallbackToSSE: true,
  });
}
