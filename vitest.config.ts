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
        // Phase-1 global targets. Phase-2: 75/80/70/75. Phase-3: 85/90/80/85.
        lines: 60,
        functions: 65,
        branches: 55,
        statements: 60,
        // Phase-2 per-file floors for critical governance paths.
        'lib/runtime/gate.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
        'lib/ccvs/evidence-collector.ts': { lines: 85, functions: 85, branches: 80, statements: 85 },
        'lib/ccvs/compliance-matrix.ts': { lines: 85, functions: 85, branches: 80, statements: 85 },
        'lib/ccvs/drift-detector.ts': { lines: 85, functions: 85, branches: 75, statements: 85 },
        'lib/commands/normalize.ts': { lines: 80, functions: 80, branches: 70, statements: 80 },
      },
    },
  },
});
