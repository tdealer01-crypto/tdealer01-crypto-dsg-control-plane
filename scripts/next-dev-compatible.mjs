import { spawn } from 'node:child_process';
import path from 'node:path';

const input = process.argv.slice(2);
const forwarded = [];
let hasPort = false;

for (let index = 0; index < input.length; index += 1) {
  const argument = input[index];
  if (argument === '--strictPort') continue;
  if (argument === '--host') {
    forwarded.push('--hostname');
    if (input[index + 1] && !input[index + 1].startsWith('-')) {
      forwarded.push(input[index + 1]);
      index += 1;
    }
    continue;
  }
  if (argument === '--port' || argument === '-p') hasPort = true;
  forwarded.push(argument);
}

if (!hasPort) forwarded.push('--port', '3000');

const nextBin = path.join(
  process.cwd(),
  'node_modules',
  'next',
  'dist',
  'bin',
  'next',
);
const child = spawn(process.execPath, [nextBin, 'dev', ...forwarded], {
  env: process.env,
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
