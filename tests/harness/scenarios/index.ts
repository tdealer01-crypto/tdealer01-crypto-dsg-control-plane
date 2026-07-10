/**
 * E2E Scenarios Index
 * Import all scenarios for testing
 */

export { ScenarioBase } from './scenario-base';
export { ScenarioGitHubLifecycle } from './scenario-github-lifecycle';
export { ScenarioMultiChainRollback } from './scenario-multi-chain-rollback';
export { ScenarioConcurrent100 } from './scenario-concurrent-100';

/**
 * Run all scenarios
 */
export async function runAllScenarios(): Promise<{
  results: Array<{
    name: string;
    description: string;
    success: boolean;
    duration_ms: number;
    events_count: number;
    error?: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    total_duration_ms: number;
  };
}> {
  const { ScenarioGitHubLifecycle } = await import('./scenario-github-lifecycle');
  const { ScenarioMultiChainRollback } = await import('./scenario-multi-chain-rollback');
  const { ScenarioConcurrent100 } = await import('./scenario-concurrent-100');

  const scenarios = [
    new ScenarioGitHubLifecycle(),
    new ScenarioMultiChainRollback(),
    new ScenarioConcurrent100(),
  ];

  const results: Array<{
    name: string;
    description: string;
    success: boolean;
    duration_ms: number;
    events_count: number;
    error?: string;
  }> = [];

  let totalDuration = 0;
  let passedCount = 0;

  for (const scenario of scenarios) {
    console.log(`\n[scenarios] Running: ${scenario.getScenarioName()}`);
    console.log(`[scenarios] ${scenario.getScenarioDescription()}\n`);

    const result = await scenario.run();

    results.push({
      name: scenario.getScenarioName(),
      description: scenario.getScenarioDescription(),
      success: result.success,
      duration_ms: result.duration_ms,
      events_count: result.events_count,
      error: result.error,
    });

    totalDuration += result.duration_ms;

    if (result.success) {
      passedCount += 1;
      console.log(`[scenarios] ✓ PASSED (${result.duration_ms}ms, ${result.events_count} events)\n`);
    } else {
      console.log(
        `[scenarios] ✗ FAILED (${result.duration_ms}ms): ${result.error}\n`,
      );
    }
  }

  return {
    results,
    summary: {
      total: scenarios.length,
      passed: passedCount,
      failed: scenarios.length - passedCount,
      total_duration_ms: totalDuration,
    },
  };
}
