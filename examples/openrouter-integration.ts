/**
 * OpenRouter Integration Examples
 * Shows various ways to use OpenRouter models in DSG ONE
 */

import {
  OpenRouterClient,
  getOpenRouterClient,
} from '../lib/openrouter/client';
import { getUsageTracker } from '../lib/openrouter/usage-tracker';

/**
 * Example 1: Basic Inference with Fallback
 *
 * Automatically handles fallback chain if primary model fails
 */
export async function example1BasicInference() {
  const client = getOpenRouterClient();
  const tracker = getUsageTracker();

  try {
    const response = await client.complete({
      messages: [
        {
          role: 'user',
          content:
            'Explain quantum computing in simple terms for a 10-year-old.',
        },
      ],
      maxTokens: 500,
      temperature: 0.7,
    });

    const message = response.choices[0].message.content;
    console.log('Response:', message);

    // Track usage
    tracker.track(
      response.model,
      response.usage.promptTokens,
      response.usage.completionTokens
    );

    // Display stats
    const stats = tracker.getStats();
    console.log(`Total requests: ${stats.totalRequests}`);
    console.log(`Total cost: $${stats.totalCost.toFixed(4)}`);
  } catch (error) {
    console.error('Failed to complete inference:', error);
  }
}

/**
 * Example 2: Batch Processing with Model Fallback
 *
 * Process multiple requests, falling back if any model fails
 */
export async function example2BatchProcessing() {
  const client = getOpenRouterClient();
  const tracker = getUsageTracker();

  const prompts = [
    'What is machine learning?',
    'Explain blockchain technology',
    'How do neural networks work?',
  ];

  const results: string[] = [];

  for (const prompt of prompts) {
    try {
      const response = await client.complete({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 300,
      });

      const answer = response.choices[0].message.content;
      results.push(answer);

      tracker.track(
        response.model,
        response.usage.promptTokens,
        response.usage.completionTokens
      );

      console.log(`✓ Processed: ${prompt.substring(0, 30)}...`);
    } catch (error) {
      console.error(`✗ Failed: ${prompt}`, error);
      results.push('ERROR: Processing failed');
    }
  }

  return results;
}

/**
 * Example 3: Custom Model Selection with Cost Awareness
 *
 * Choose models based on cost and performance tradeoffs
 */
export async function example3CostAwareSelection() {
  const fastClient = new (await import('../lib/openrouter/client')).OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || '',
    primaryModel: 'anthropic/claude-3.5-haiku', // Fast & cheap
    fallbackModels: ['meta-llama/llama-2-7b-chat'], // Cheap backup
  });

  const qualityClient = new (await import('../lib/openrouter/client')).OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || '',
    primaryModel: 'mistralai/mistral-7b-instruct', // Quality
    fallbackModels: ['jondurbin/airoboros-l2-70b'], // High quality
  });

  // Use fast model for simple tasks
  const fastResponse = await fastClient.complete({
    messages: [
      {
        role: 'user',
        content: 'What is 2 + 2?',
      },
    ],
    maxTokens: 50,
  });

  console.log('Fast response:', fastResponse.choices[0].message.content);
  console.log(
    'Used model:',
    fastResponse.model,
    `(Cost: ~$${(fastResponse.usage.totalTokens * 0.8) / 1000000})`
  );

  // Use quality model for complex reasoning
  const qualityResponse = await qualityClient.complete({
    messages: [
      {
        role: 'user',
        content: 'Explain the implications of AI on society',
      },
    ],
    maxTokens: 1000,
  });

  console.log('Quality response:', qualityResponse.choices[0].message.content);
  console.log(
    'Used model:',
    qualityResponse.model,
    `(Cost: ~$${(qualityResponse.usage.totalTokens * 0.14) / 1000000})`
  );
}

/**
 * Example 4: Streaming-Style Processing
 *
 * Process responses as they complete (polling approach)
 */
export async function example4StreamingStyle() {
  const client = getOpenRouterClient();
  const tracker = getUsageTracker();

  const messages = [
    { role: 'user', content: 'Tell me a short story about a robot.' },
  ];

  console.log('Sending request...');
  const startTime = Date.now();

  const response = await client.complete({
    messages: messages,
    maxTokens: 500,
  });

  const latency = Date.now() - startTime;
  const content = response.choices[0].message.content;

  console.log(`\nResponse (received in ${latency}ms):`);
  console.log(content);

  // Track for billing
  tracker.track(
    response.model,
    response.usage.promptTokens,
    response.usage.completionTokens
  );

  const stats = tracker.getStats();
  console.log(`\nUsage: ${response.usage.totalTokens} tokens`);
  console.log(`Cost: $${stats.byModel[response.model]?.cost || 0}`);
}

/**
 * Example 5: Error Handling with Graceful Degradation
 *
 * Handle errors elegantly and provide fallback responses
 */
export async function example5ErrorHandling() {
  const client = getOpenRouterClient();
  const tracker = getUsageTracker();

  const prompt = 'Analyze this complex data structure...';

  try {
    // Try primary model first
    const response = await client.complete({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2000,
      temperature: 0.5,
    });

    console.log('✓ Successfully got response');
    tracker.track(
      response.model,
      response.usage.promptTokens,
      response.usage.completionTokens
    );

    return response.choices[0].message.content;
  } catch (error) {
    if (error instanceof Error && error.message.includes('All models failed')) {
      console.log(
        '✗ All models exhausted. Providing cached/fallback response.'
      );
      return 'Unable to process. Please try again later.';
    }

    if (
      error instanceof Error &&
      error.message.includes('Invalid authentication')
    ) {
      console.error('✗ API key issue. Check OPENROUTER_API_KEY env var');
      return 'Authentication failed.';
    }

    console.error('✗ Unexpected error:', error);
    return 'An unexpected error occurred.';
  }
}

/**
 * Example 6: Usage Analytics and Reporting
 *
 * Generate usage reports for billing and optimization
 */
export async function example6UsageAnalytics() {
  const tracker = getUsageTracker();

  // Do some inference
  const client = getOpenRouterClient();
  for (let i = 0; i < 3; i++) {
    try {
      const response = await client.complete({
        messages: [{ role: 'user', content: `Test request ${i + 1}` }],
        maxTokens: 50,
      });

      tracker.track(
        response.model,
        response.usage.promptTokens,
        response.usage.completionTokens
      );
    } catch (e) {
      console.error('Error in example:', e);
    }
  }

  // Generate report
  const stats = tracker.getStats();

  console.log('\n📊 Usage Analytics Report');
  console.log('═'.repeat(50));
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Total Tokens: ${stats.totalTokens}`);
  console.log(`Total Cost: $${stats.totalCost.toFixed(4)}`);
  console.log('\nBreakdown by Model:');

  Object.entries(stats.byModel).forEach(([model, data]) => {
    const modelName = model.split('/')[1] || model;
    console.log(`  ${modelName}:`);
    console.log(`    Requests: ${data.requests}`);
    console.log(`    Tokens: ${data.tokens}`);
    console.log(`    Cost: $${data.cost.toFixed(4)}`);
  });

  console.log('═'.repeat(50));

  // Export for persistence
  const exported = tracker.export();
  console.log('\nExported data keys:', Object.keys(exported));
}

/**
 * Example 7: Dynamic Model Switching
 *
 * Switch models based on availability or load
 */
export async function example7DynamicSwitching() {
  const client = getOpenRouterClient();

  console.log('Current config:');
  console.log('  Primary:', client.getPrimaryModel());
  console.log('  Fallbacks:', client.getFallbackModels());
  console.log('  Chain:', client.getModelChain());

  // Test connection to current primary
  const testResult = await client.testConnection();
  console.log(`\nConnection test: ${testResult.success ? '✓' : '✗'}`);
  console.log(`Latency: ${testResult.latency}ms`);

  if (!testResult.success) {
    console.log('Primary model unavailable, switching...');
    client.switchPrimaryModel('mistralai/mistral-7b-instruct');
    console.log('Switched to:', client.getPrimaryModel());
  }

  // Test with new primary
  const fallbackResult = await client.testConnection();
  console.log(`\nFallback model status: ${fallbackResult.success ? '✓' : '✗'}`);
}

/**
 * Example 8: Configuration from Different Sources
 *
 * Load config from environment or file
 */
export async function example8ConfigurationSources() {
  const { OpenRouterClient } = await import('../lib/openrouter/client');

  // From environment variables
  const envClient = OpenRouterClient.fromEnv();
  console.log('From env - Primary:', envClient.getPrimaryModel());

  // From config file
  let configClient: OpenRouterClient;
  try {
    const configFile = require('../ai-config.json');
    configClient = OpenRouterClient.fromConfig(configFile);
    console.log('From config - Primary:', configClient.getPrimaryModel());
  } catch (e) {
    console.log('Config file not found, using environment config');
    configClient = envClient;
  }

  // Test both
  const envTest = await envClient.testConnection();
  console.log('Env client test:', envTest.success ? '✓' : '✗');

  const configTest = await configClient.testConnection();
  console.log('Config client test:', configTest.success ? '✓' : '✗');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 OpenRouter Integration Examples\n');

  try {
    console.log('\n--- Example 1: Basic Inference ---');
    await example1BasicInference();

    console.log('\n--- Example 2: Batch Processing ---');
    const results = await example2BatchProcessing();
    console.log(`Processed ${results.length} items`);

    console.log('\n--- Example 3: Cost-Aware Selection ---');
    await example3CostAwareSelection();

    console.log('\n--- Example 4: Streaming Style ---');
    await example4StreamingStyle();

    console.log('\n--- Example 5: Error Handling ---');
    const fallbackResult = await example5ErrorHandling();
    console.log('Result:', fallbackResult);

    console.log('\n--- Example 6: Usage Analytics ---');
    await example6UsageAnalytics();

    console.log('\n--- Example 7: Dynamic Switching ---');
    await example7DynamicSwitching();

    console.log('\n--- Example 8: Configuration Sources ---');
    await example8ConfigurationSources();

    console.log('\n✨ All examples completed!');
  } catch (error) {
    console.error('❌ Example error:', error);
  }
}

// Uncomment to run:
// runAllExamples().catch(console.error);
