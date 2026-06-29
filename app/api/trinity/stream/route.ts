/**
 * Trinity AI Real-time Stream (Server-Sent Events)
 * GET /api/trinity/stream
 *
 * Provides real-time status and execution updates via SSE.
 * This works with Next.js; WebSocket requires a separate server.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // SSE streams can run up to 60 seconds on Vercel

export async function GET(request: NextRequest) {
  // Check if client supports SSE
  const responseHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: responseHeaders,
    });
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected","payload":{"message":"Stream connected"}}\n\n'));

      // Send status update after 1 second
      const statusTimer = setTimeout(() => {
        const statusMsg = {
          type: 'status',
          payload: {
            ok: true,
            system: 'Trinity AI Multi-Agent System',
            version: '1.0',
            agents: {
              Mind: { status: 'registered', role: 'Job discovery across 6 platforms' },
              Hand: { status: 'registered', role: 'Work execution and deliverable generation' },
              Eye: { status: 'registered', role: 'Quality verification and blockchain tx validation' },
              Nerve: { status: 'registered', role: 'Payment settlement and reputation management' },
              Spine: { status: 'registered', role: 'Orchestration, DSG governance, and audit trail' },
            },
            governance: {
              policyVersion: '1.0',
              constraintsEnforced: 5,
            },
            checkedAt: new Date().toISOString(),
          },
        };
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(statusMsg)}\n\n`));
      }, 1000);

      // Keep connection alive with periodic heartbeats
      const heartbeatTimer = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
      }, 15000);

      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        clearTimeout(statusTimer);
        clearInterval(heartbeatTimer);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: responseHeaders,
  });
}
