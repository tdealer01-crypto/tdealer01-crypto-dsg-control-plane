#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const url = process.argv[2];

if (!url) {
  console.error('Usage: release-gate <url>');
  process.exit(1);
}

console.log(`\n🔍 Running release gate for: ${url}\n`);

const result = spawnSync('bash', ['scripts/go-no-go-gate.sh', url], {
  stdio: 'inherit',
});

if (result.status === 0) {
  console.log('\n✅ RELEASE: GO');
  process.exit(0);
} else {
  console.error('\n❌ RELEASE: NO-GO');
  process.exit(1);
}
