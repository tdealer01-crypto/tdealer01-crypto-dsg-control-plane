import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('command center capabilities surface', () => {
  it('exposes clickable chat submit action and monitor panel in dashboard command center', () => {
    const source = read('app/dashboard/command-center/page.tsx');

    expect(source).toContain('Chat / Agent Console');
    expect(source).toContain('Monitor / Control Panel');
    expect(source).toContain('onClick={submitCommand}');
    expect(source).toContain('disabled={chatBusy}');
    expect(source).toContain("fetch('/api/agent-chat'");
    expect(source).toContain("fetch('/api/health'");
    expect(source).toContain("fetch('/api/audit?limit=8'");
  });

  it('shows live monitor + chat workflow in app shell', () => {
    const source = read('app/app-shell/page.tsx');

    expect(source).toContain('Split-pane chat and live monitor');
    expect(source).toContain('Run in Agent Chat');
    expect(source).toContain("fetch('/api/core/monitor'");
    expect(source).toContain("fetch('/api/agent-chat'");
  });

  it('documents skill controller tools and confirms no voice control surface', () => {
    const skillsSource = read('app/dashboard/skills/page.tsx');
    const commandCenterSource = read('app/dashboard/command-center/page.tsx').toLowerCase();
    const appShellSource = read('app/app-shell/page.tsx').toLowerCase();

    expect(skillsSource).toContain('GET /api/core/monitor');
    expect(skillsSource).toContain('POST /api/mcp/call');
    expect(skillsSource).toContain('POST /api/agent-chat');

    expect(commandCenterSource).not.toContain('voice');
    expect(commandCenterSource).not.toContain('microphone');
    expect(appShellSource).not.toContain('voice');
    expect(appShellSource).not.toContain('microphone');
  });
});
