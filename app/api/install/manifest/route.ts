import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export type InstallChannel = {
  id: 'web' | 'api' | 'mcp' | 'github' | 'vercel';
  name: string;
  status: 'ready' | 'guided' | 'planned';
  installMode: 'one-click' | 'guided' | 'manual';
  href: string;
  firstValue: string;
  notes?: string;
};

const channels: InstallChannel[] = [
  {
    id: 'web',
    name: 'DSG ONE Web',
    status: 'ready',
    installMode: 'one-click',
    href: '/demo',
    firstValue: 'Run a public proof demo without connecting production systems.',
  },
  {
    id: 'api',
    name: 'DSG Gate API',
    status: 'ready',
    installMode: 'guided',
    href: '/dashboard/api-keys',
    firstValue: 'Create an API key, submit a governed action, and receive a decision with evidence.',
  },
  {
    id: 'mcp',
    name: 'DSG ONE MCP Server',
    status: 'guided',
    installMode: 'manual',
    href: '/start#mcp',
    firstValue: 'Connect an MCP client to DSG services after configuring the required service credentials.',
    notes: 'The repository MCP server currently requires local installation and environment configuration.',
  },
  {
    id: 'github',
    name: 'GitHub',
    status: 'planned',
    installMode: 'guided',
    href: '/request-access?integration=github',
    firstValue: 'Gate repository or agent actions before execution.',
    notes: 'Do not advertise one-click GitHub App installation until the production GitHub App registration and callback flow are verified.',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    status: 'planned',
    installMode: 'guided',
    href: '/request-access?integration=vercel',
    firstValue: 'Verify deployment actions and retain evidence for review.',
    notes: 'Do not advertise one-click Vercel installation until a production integration installation flow is verified.',
  },
];

export function GET() {
  return NextResponse.json({
    ok: true,
    version: 1,
    principle: 'Only advertise automation that is actually wired and verifiable.',
    channels,
  });
}
