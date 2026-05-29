// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: 'vitest',
  mutate: [
    'lib/runtime/gate.ts',
    'lib/spine/pipeline.ts',
    'lib/ccvs/evidence-collector.ts',
    'lib/ccvs/drift-detector.ts',
  ],
  coverageAnalysis: 'perTest',
  timeoutMS: 30_000,
  timeoutFactor: 2,
  concurrency: 2,
  thresholds: { high: 90, low: 80, break: 70 },
  reporters: ['html', 'json', 'progress'],
  htmlReporter: { fileName: 'stryker-report/index.html' },
  jsonReporter: { fileName: 'stryker-report/mutation-report.json' },
  ignorePatterns: [
    'node_modules', '.next', 'coverage', 'stryker-report',
    '.factory', '.agents', '.devin', '.forge', '.goose',
    '.hermes', '.openhands', '.pi', 'skills',
  ],
  vitest: { configFile: 'vitest.config.ts', related: true },
  logLevel: 'warn',
  disableTypeChecks: true,
};

export default config;
