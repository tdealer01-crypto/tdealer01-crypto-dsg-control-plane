/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  mutate: [
    'lib/runtime/gate.ts',
    'lib/spine/pipeline.ts',
    'lib/ccvs/evidence-collector.ts',
    'lib/ccvs/drift-detector.ts',
  ],
  checkers: [],
  coverageAnalysis: 'perTest',
  timeoutMS: 30000,
  timeoutFactor: 2,
  concurrency: 2,
  thresholds: {
    high: 90,
    low: 80,
    break: 70,
  },
  reporters: ['html', 'json', 'progress'],
  htmlReporter: { fileName: 'stryker-report/index.html' },
  jsonReporter: { fileName: 'stryker-report/mutation-report.json' },
  ignorePatterns: ['node_modules', '.next', 'coverage', 'stryker-report'],
  vitest: {
    configFile: 'vitest.config.ts',
  },
};
