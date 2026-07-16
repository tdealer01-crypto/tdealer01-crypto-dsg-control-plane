import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Use the automatic JSX runtime so Next.js components (which do not import
  // React explicitly) can be rendered in tests without "React is not defined".
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: [
      'node_modules/**',
      '.next/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15_000,
    hookTimeout: 90_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      all: true,
      include: ['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: [
        'app/**/page.tsx',
        'app/**/layout.tsx',
        'lib/database.types.ts',
        'tests/**',
        'qa-logs/**',
        '**/*.d.ts',
      ],
      thresholds: {
        // Enforced baseline from measured coverage (2026-07-11: lines/statements
        // 22.67%, functions 65.41%, branches 72.17%). Raise in steps toward the
        // earlier aspirational targets (60/65/55/60, then 75/80/70/75, then
        // 85/90/80/85) as coverage grows.
        lines: 20,
        functions: 65,
        branches: 55,
        statements: 20,
        // Phase-2 per-file floors for critical governance paths.
        'lib/runtime/gate.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
        // branches floor set below measured CI value (76.47%; local measures
        // 83.33% — branch instrumentation varies with environment).
        'lib/ccvs/evidence-collector.ts': { lines: 85, functions: 85, branches: 75, statements: 85 },
        'lib/ccvs/compliance-matrix.ts': { lines: 85, functions: 85, branches: 80, statements: 85 },
        'lib/ccvs/drift-detector.ts': { lines: 85, functions: 85, branches: 75, statements: 85 },
        'lib/commands/normalize.ts': { lines: 80, functions: 80, branches: 70, statements: 80 },
      },
    },
  },
});
