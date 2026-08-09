import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  mcpGet: vi.fn(),
  mcpPost: vi.fn(),
}));

vi.mock('@/app/api/mcp/route', () => ({
  GET: mocks.mcpGet,
  POST: mocks.mcpPost,
}));

import { GET, POST } from '@/app/api/framer/mcp/route';

describe('/api/framer/mcp server-side origin guard', () => {
  const allowedOrigin = 'https://multidisciplinary-badger-803385.framer.app';

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DSG_ALLOWED_ORIGINS', allowedOrigin);
    vi.stubEnv('APP_URL', 'https://tdealer01-crypto-dsg-control-plane.onrender.com');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://tdealer01-crypto-dsg-control-plane.onrender.com');
    mocks.mcpGet.mockReset();
    mocks.mcpPost.mockReset();
    mocks.mcpGet.mockResolvedValue(NextResponse.json({ ok: true }));
    mocks.mcpPost.mockResolvedValue(NextResponse.json({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects a disallowed GET origin before the MCP handler runs', async () => {
    const request = new NextRequest('https://backend.example/api/framer/mcp', {
      method: 'GET',
      headers: { Origin: 'https://not-allowed.invalid' },
    });

    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(response.headers.get('vary')).toBe('Origin');
    expect(mocks.mcpGet).not.toHaveBeenCalled();
  });

  it('rejects a disallowed POST origin before the MCP handler runs', async () => {
    const request = new NextRequest('https://backend.example/api/framer/mcp', {
      method: 'POST',
      headers: {
        Origin: 'https://not-allowed.invalid',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mocks.mcpPost).not.toHaveBeenCalled();
  });

  it('allows the exact Framer production origin and returns exact ACAO', async () => {
    const request = new NextRequest('https://backend.example/api/framer/mcp', {
      method: 'GET',
      headers: { Origin: allowedOrigin },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe(allowedOrigin);
    expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    expect(mocks.mcpGet).toHaveBeenCalledTimes(1);
  });

  it('allows server-to-server requests with no Origin header', async () => {
    const request = new NextRequest('https://backend.example/api/framer/mcp', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(mocks.mcpGet).toHaveBeenCalledTimes(1);
  });
});
