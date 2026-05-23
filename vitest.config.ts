import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: ['app/**/page.tsx', 'app/**/layout.tsx', '**/*.d.ts', 'tests/**'],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
    },
  },
});
