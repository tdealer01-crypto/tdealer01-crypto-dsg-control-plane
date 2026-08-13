import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('command center capabilities surface', () => {
  it('exposes a typed governed agent, live truth sources, and Stripe checkout', () => {
    const source = read('app/dashboard/command-center/page.tsx');

    expect(source).toContain('Typed browser agent');
    expect(source).toContain('Current truth');
    expect(source).toContain('onClick={() => void submitGoal()}');
    expect(source).toContain('disabled={!goal.trim() || agentBusy}');
    expect(source).toContain("fetch('/api/agent-chat'");
    expect(source).toContain("'/api/revenue-readiness'");
    expect(source).toContain("'/api/github/revenue-autopilot-status'");
    expect(source).toContain("'/api/billing/activation-proof'");
    expect(source).toContain("fetch('/api/billing/checkout'");
    expect(source).toContain(
      'Live browser click/type/submit executor is not enabled',
    );
  });

  it('shows live monitor + chat workflow in app shell', () => {
    const pageSource = read('app/app-shell/page.tsx');
    const clientSource = read('components/AppShellClient.tsx');

    expect(pageSource).toContain('AppShellClient');
    expect(pageSource).toContain("redirect('/login?next=/app-shell')");
    expect(clientSource).toContain('Split-pane chat and live monitor');
    expect(clientSource).toContain('Run in Agent Chat');
    expect(clientSource).toContain("fetch('/api/core/monitor'");
    expect(clientSource).toContain("fetch('/api/agent-chat'");
  });

  it('documents skill controller tools and confirms no voice control surface', () => {
    const skillsSource = read('app/dashboard/skills/page.tsx');
    const commandCenterSource = read('app/dashboard/command-center/page.tsx').toLowerCase();
    const appShellSource = [
      read('app/app-shell/page.tsx'),
      read('components/AppShellClient.tsx'),
    ].join('\n').toLowerCase();

    expect(skillsSource).toContain('GET /api/core/monitor');
    expect(skillsSource).toContain('POST /api/mcp/call');
    expect(skillsSource).toContain('POST /api/agent-chat');

    expect(commandCenterSource).not.toContain('voice');
    expect(commandCenterSource).not.toContain('microphone');
    expect(appShellSource).not.toContain('voice');
    expect(appShellSource).not.toContain('microphone');
  });
});
