#!/usr/bin/env node

import {existsSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import process from 'node:process';

function isTermux() {
  return Boolean(
    process.env.TERMUX_VERSION ||
    process.env.PREFIX?.includes('/com.termux') ||
    process.env.HOME?.includes('/com.termux')
  );
}

const env = {...process.env};
const termux = isTermux();
const useCssFallback = termux || env.DSG_TERMUX_CSS_FALLBACK === 'true';

if (termux) {
  env.DSG_DISABLE_WEBPACK_CACHE = 'true';
  env.NEXT_TELEMETRY_DISABLED = env.NEXT_TELEMETRY_DISABLED || '1';
  console.log('[dsg-build] Termux detected: using deterministic mobile build mode.');
} else if (env.DSG_DISABLE_WEBPACK_CACHE === 'true') {
  console.log('[dsg-build] DSG_DISABLE_WEBPACK_CACHE=true: disabling webpack persistent cache.');
}

rmSync('.next', {recursive: true, force: true});
rmSync('node_modules/.cache', {recursive: true, force: true});

const globalsPath = 'app/globals.css';
const postcssPath = 'postcss.config.mjs';
let originalGlobals = null;
let originalPostcss = null;

const fallbackCss = `/* DSG deterministic Termux build fallback.
   Termux/Android can fail inside Next + webpack + PostCSS/Tailwind v4 dependency snapshotting.
   This fallback is used only by the local mobile build wrapper and is restored after build. */
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { min-height: 100%; margin: 0; background: #020617; color: #e2e8f0; font-family: Arial, Helvetica, sans-serif; }
a { color: inherit; text-decoration: none; }
button, input, textarea, select { font: inherit; }
`;

try {
  if (useCssFallback) {
    if (existsSync(globalsPath)) {
      originalGlobals = readFileSync(globalsPath, 'utf8');
      writeFileSync(globalsPath, fallbackCss, 'utf8');
      console.log('[dsg-build] Termux CSS fallback enabled for app/globals.css.');
    }

    if (existsSync(postcssPath)) {
      originalPostcss = readFileSync(postcssPath, 'utf8');
      writeFileSync(postcssPath, 'export default { plugins: {} };\n', 'utf8');
      console.log('[dsg-build] Termux PostCSS fallback enabled.');
    }
  }

  const result = spawnSync('next', ['build'], {
    stdio: 'inherit',
    shell: true,
    env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
} finally {
  if (originalGlobals !== null) {
    writeFileSync(globalsPath, originalGlobals, 'utf8');
    console.log('[dsg-build] Restored app/globals.css.');
  }

  if (originalPostcss !== null) {
    writeFileSync(postcssPath, originalPostcss, 'utf8');
    console.log('[dsg-build] Restored postcss.config.mjs.');
  }
}
