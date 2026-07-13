#!/usr/bin/env node
/**
 * Test script for logging + sim-use integration
 *
 * Usage:
 *   npx tsx scripts/test-logging-sim-use.ts
 *   node scripts/test-logging-sim-use.mjs
 */

import { createLogger } from '../lib/logging/logger';
import { simUseAdapter } from '../lib/integrations/sim-use';

async function main() {
  const logger = createLogger('test-script');

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  DSG Logging + sim-use Integration    ║');
  console.log('║  Test Script                          ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Test 1: Logging levels
  console.log('📋 Test 1: Logging Levels\n');
  logger.debug('This is a DEBUG message (level 0)');
  logger.info('This is an INFO message (level 1)', {
    module: 'test',
    action: 'testing',
  });
  logger.warn('This is a WARN message (level 2)', {
    module: 'test',
    warning: 'sample warning',
  });

  // Test 2: Sensitive data redaction
  console.log('\n📋 Test 2: Sensitive Data Redaction\n');
  logger.info('Testing sensitive data masking', {
    requestId: 'req-123',
    apiKey: 'sk_test_very_secret_key_12345',
    password: 'my-password-123',
    email: 'user@example.com',
  });

  // Test 3: Context inheritance
  console.log('\n📋 Test 3: Context Inheritance\n');
  const childLogger = logger.withContext({
    agentId: 'agent-001',
    requestId: 'req-456',
  });
  childLogger.info('Child logger with inherited context', {
    action: 'simulated_action',
  });

  // Test 4: sim-use adapter
  console.log('\n📋 Test 4: SIM-use Adapter\n');
  const stats = simUseAdapter.getStats();
  console.log('SIM-use Adapter Stats:', stats);

  // Test 5: Query SIM usage (will use mock data in test mode)
  console.log('\n📋 Test 5: SIM Usage Query (Test Mode)\n');
  const simResult = await simUseAdapter.queryUsage('08012345678', {
    agentId: 'agent-001',
    requestId: 'req-789',
  });

  if (simResult.ok && simResult.data) {
    console.log('✅ SIM Usage Query Successful:');
    console.log(`   SIM ID: ${simResult.data.simId}`);
    console.log(`   Data Usage: ${simResult.data.dataPercentage}% (${Math.round(simResult.data.dataUsageBytes / 1e9 * 10) / 10} GB / ${Math.round(simResult.data.dataLimitBytes / 1e9 * 10) / 10} GB)`);
    console.log(`   Call Minutes: ${simResult.data.callMinutesUsed}/${simResult.data.callMinutesLimit}`);
    console.log(`   SMS: ${simResult.data.smsUsed}/${simResult.data.smsLimit}`);
    console.log(`   Status: ${simResult.data.status}`);
    console.log(`   Query Time: ${simResult.queryTime}ms`);
  } else {
    console.log('❌ SIM Usage Query Failed:', simResult.error);
  }

  // Test 6: Error logging
  console.log('\n📋 Test 6: Error Logging\n');
  try {
    throw new Error('Test error for logging');
  } catch (error) {
    logger.error(
      'Caught an error during test',
      error instanceof Error ? error : new Error(String(error)),
      { context: 'test', errorType: 'simulated' }
    );
  }

  // Test 7: Android executor simulation
  console.log('\n📋 Test 7: Android Executor Simulation\n');
  const executorLogger = createLogger('android-executor');
  const auditContext = {
    agentId: 'hermes-agent-1',
    userId: 'user-123',
    requestId: 'exec-req-001',
    sessionId: 'session-xyz',
  };

  executorLogger.debug('Android executor command start', auditContext, {
    appPackage: 'com.line.app',
    operation: 'click',
    simId: '08012345678',
  });

  executorLogger.info('SIM usage queried successfully', auditContext, {
    dataPercentage: 70,
    status: 'active',
    queryTime: 50,
  });

  executorLogger.info('Android safe DOM command executed successfully', auditContext, {
    appPackage: 'com.line.app',
    operation: 'click',
    screenTitle: 'MainActivity',
    simDataPercentage: 70,
  });

  // Summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  ✅ Test Complete                     ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('📊 Configuration Summary:');
  console.log(`   LOG_LEVEL: ${process.env.LOG_LEVEL || 'INFO'}`);
  const simUseKey = process.env.SIM_USE_API_KEY || '';
  const isTestMode = !simUseKey || simUseKey.includes('placeholder') || simUseKey.startsWith('sk_test_dev');
  console.log(`   SIM_USE Mode: ${isTestMode ? '🧪 TEST/DEV (mock data)' : '🔌 PRODUCTION'}`);
  console.log(`   PostHog: ${process.env.POSTHOG_API_KEY?.includes('placeholder') || !process.env.POSTHOG_API_KEY ? '❌ Not configured' : '✅ Configured'}`);
  console.log(`   Cache Size: ${stats.cacheSize} entries`);
  console.log(`   Total Queries: ${stats.totalQueries}`);
  console.log('\n💡 To use real API keys:');
  console.log('   1. Update .env.local with real SIM_USE_API_KEY from LINE');
  console.log('   2. Update .env.local with real POSTHOG_API_KEY');
  console.log('   3. Restart the server (npm run dev)\n');
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
