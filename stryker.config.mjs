/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts',
  },
  mutate: [
    'lib/**/*.ts',
    'hooks/**/*.ts',
    'store/**/*.ts',
    '!lib/**/*.d.ts',
    '!lib/ccvs/catalog.ts',
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },
  coverageAnalysis: 'perTest',
  timeoutMS: 60000,
  timeoutFactor: 1.5,
  disableTypeChecks: true,
  checkers: [],
  ignoreStatic: true,
  htmlReporter: {
    fileName: 'reports/mutation/mutation.html',
  },
};
