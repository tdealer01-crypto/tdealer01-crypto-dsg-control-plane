#!/usr/bin/env node

/**
 * AI Setup Wizard CLI
 * Interactive Node.js CLI for configuring OpenRouter AI models
 * Generates .env.local and ai-config.json
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Free models available through OpenRouter
const FREE_MODELS = [
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    description: 'Fast, compact model for real-time tasks',
    maxTokens: 8000,
    costPer1kTokens: 0.8,
  },
  {
    id: 'mistralai/mistral-7b-instruct',
    name: 'Mistral 7B',
    provider: 'Mistral',
    description: 'Open-source model with strong reasoning',
    maxTokens: 32000,
    costPer1kTokens: 0.14,
  },
  {
    id: 'meta-llama/llama-2-7b-chat',
    name: 'LLaMA 2 7B',
    provider: 'Meta',
    description: 'Community-backed open model',
    maxTokens: 4096,
    costPer1kTokens: 0.1,
  },
  {
    id: 'microsoft/phi-2',
    name: 'Phi 2',
    provider: 'Microsoft',
    description: 'Small but capable reasoning model',
    maxTokens: 4096,
    costPer1kTokens: 0.2,
  },
  {
    id: 'jondurbin/airoboros-l2-70b',
    name: 'Airoboros L2 70B',
    provider: 'Community',
    description: 'Large open model with strong performance',
    maxTokens: 4096,
    costPer1kTokens: 0.7,
  },
];

class AISetupWizard {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.config = {
      apiKey: '',
      selectedModel: FREE_MODELS[0].id,
      configFormat: 'env',
      fallbackModels: [FREE_MODELS[1].id, FREE_MODELS[2].id],
    };
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async promptChoice(question, choices) {
    console.log(`\n${question}`);
    choices.forEach((choice, idx) => {
      console.log(`  ${idx + 1}. ${choice.label}`);
    });

    let selected = null;
    while (!selected) {
      const answer = await this.prompt('\nEnter choice (number): ');
      const idx = parseInt(answer) - 1;
      if (idx >= 0 && idx < choices.length) {
        selected = choices[idx].value;
      } else {
        console.log('Invalid choice. Try again.');
      }
    }
    return selected;
  }

  async testOpenRouterConnection(apiKey, modelId) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://dsg-one-setup-wizard',
          'X-Title': 'DSG AI Setup Wizard',
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: 'user',
              content: 'ping',
            },
          ],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        return { success: true, message: 'Connection successful!' };
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid API key. Check your OpenRouter credentials.',
        };
      } else {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          message: `Error: ${error.error?.message || response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  generateEnvConfig() {
    return `# AI Setup Wizard Configuration
# Generated: ${new Date().toISOString()}

OPENROUTER_API_KEY=${this.config.apiKey}
AI_PRIMARY_MODEL=${this.config.selectedModel}
AI_FALLBACK_MODELS=${this.config.fallbackModels.join(',')}
AI_CONFIG_VERSION=1.0.0
AI_SETUP_TIMESTAMP=${new Date().toISOString()}
AI_PROVIDER=openrouter
AI_MAX_RETRIES=3
AI_TIMEOUT_MS=30000
`;
  }

  generateJsonConfig() {
    const primaryModel = FREE_MODELS.find((m) => m.id === this.config.selectedModel);
    const fallbackModels = this.config.fallbackModels.map(
      (id) => FREE_MODELS.find((m) => m.id === id)
    );

    return JSON.stringify(
      {
        ai: {
          version: '1.0.0',
          provider: 'openrouter',
          apiKey: this.config.apiKey,
          setupTimestamp: new Date().toISOString(),
          models: {
            primary: {
              id: primaryModel.id,
              name: primaryModel.name,
              provider: primaryModel.provider,
              maxTokens: primaryModel.maxTokens,
              costPer1kTokens: primaryModel.costPer1kTokens,
            },
            fallbacks: fallbackModels.map((m) => ({
              id: m.id,
              name: m.name,
              provider: m.provider,
              maxTokens: m.maxTokens,
              costPer1kTokens: m.costPer1kTokens,
            })),
          },
          fallbackStrategy: 'sequential',
          maxRetries: 3,
          timeoutMs: 30000,
        },
      },
      null,
      2
    );
  }

  printHeader() {
    console.clear();
    console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║           🚀 DSG AI Setup Wizard CLI 🚀           ║
║                                                    ║
║     Configure OpenRouter Models in 5 Steps         ║
║                                                    ║
╚════════════════════════════════════════════════════╝
    `);
  }

  printStep(step, title) {
    console.log(`\n┌─ Step ${step}/5: ${title}`);
    console.log('└─────────────────────────────────────────\n');
  }

  printSeparator() {
    console.log('\n─────────────────────────────────────────\n');
  }

  async step1ApiKey() {
    this.printStep(1, 'API Key Configuration');

    console.log('Get your free OpenRouter API key:');
    console.log('  1. Visit https://openrouter.ai');
    console.log('  2. Sign up for a free account');
    console.log('  3. Go to API Keys section');
    console.log('  4. Copy your API key (starts with sk-or-)\n');

    let apiKey = '';
    while (!apiKey) {
      apiKey = await this.prompt('Enter your OpenRouter API Key: ');
      if (!apiKey.startsWith('sk-or-')) {
        console.log(
          '⚠️  Warning: API key should start with "sk-or-". Continue anyway? (y/n)'
        );
        const confirm = await this.prompt('> ');
        if (confirm.toLowerCase() !== 'y') {
          apiKey = '';
        }
      }
    }

    this.config.apiKey = apiKey;

    console.log('\nTesting connection...');
    const testResult = await this.testOpenRouterConnection(
      apiKey,
      this.config.selectedModel
    );

    if (testResult.success) {
      console.log(`✓ ${testResult.message}`);
    } else {
      console.log(`✗ ${testResult.message}`);
      const retry = await this.prompt('Retry with different API key? (y/n): ');
      if (retry.toLowerCase() === 'y') {
        return this.step1ApiKey();
      }
    }
  }

  async step2ModelSelection() {
    this.printStep(2, 'Primary Model Selection');

    console.log('Select your primary AI model:\n');
    const choices = FREE_MODELS.map((model) => ({
      label: `${model.name} (${model.provider}) - $${model.costPer1kTokens}/1k tokens`,
      value: model.id,
    }));

    this.config.selectedModel = await this.promptChoice(
      'Which model do you want as your primary?',
      choices
    );

    const selected = FREE_MODELS.find((m) => m.id === this.config.selectedModel);
    console.log(`\n✓ Selected: ${selected.name}`);
    console.log(`  Description: ${selected.description}`);
    console.log(`  Max tokens: ${selected.maxTokens}`);
  }

  async step3FallbackChain() {
    this.printStep(3, 'Configure Fallback Chain');

    console.log('Set up fallback models for resilience.');
    console.log('If your primary model fails, DSG will try these in order.\n');

    let adding = true;
    this.config.fallbackModels = [];

    while (adding && this.config.fallbackModels.length < 3) {
      const available = FREE_MODELS.filter(
        (m) =>
          m.id !== this.config.selectedModel &&
          !this.config.fallbackModels.includes(m.id)
      );

      if (available.length === 0) {
        console.log('No more models available for fallback.');
        break;
      }

      console.log(
        `\nFallback Model ${this.config.fallbackModels.length + 1} (optional):`
      );
      const choices = [
        ...available.map((m) => ({
          label: `${m.name} (${m.provider})`,
          value: m.id,
        })),
        { label: 'Skip (done with fallback models)', value: null },
      ];

      const modelId = await this.promptChoice(
        'Select model or skip:',
        choices
      );

      if (modelId === null) {
        adding = false;
      } else {
        this.config.fallbackModels.push(modelId);
        const model = FREE_MODELS.find((m) => m.id === modelId);
        console.log(`✓ Added: ${model.name}`);
      }
    }

    if (this.config.fallbackModels.length === 0) {
      console.log('\n⚠️  No fallback models selected. Continuing with primary model only.');
    } else {
      console.log(`\n✓ Fallback chain: ${this.config.fallbackModels.length} model(s)`);
    }
  }

  async step4Preview() {
    this.printStep(4, 'Configuration Preview');

    console.log('Choose configuration format:\n');
    this.config.configFormat = await this.promptChoice(
      'Which format do you prefer?',
      [
        {
          label: '.env.local (recommended for Next.js)',
          value: 'env',
        },
        {
          label: 'JSON (ai-config.json)',
          value: 'json',
        },
      ]
    );

    this.printSeparator();

    if (this.config.configFormat === 'env') {
      console.log('Your .env.local configuration:\n');
      console.log('─────────────────────────────────────────');
      console.log(this.generateEnvConfig());
      console.log('─────────────────────────────────────────');
    } else {
      console.log('Your ai-config.json configuration:\n');
      console.log('─────────────────────────────────────────');
      console.log(this.generateJsonConfig());
      console.log('─────────────────────────────────────────');
    }

    const editAgain = await this.prompt(
      '\nLooks good? (y = continue, n = go back): '
    );
    if (editAgain.toLowerCase() === 'n') {
      return this.step3FallbackChain();
    }
  }

  async step5Deploy() {
    this.printStep(5, 'Complete Setup');

    const primaryModel = FREE_MODELS.find((m) => m.id === this.config.selectedModel);

    console.log('Configuration Summary:');
    console.log('─────────────────────────────────────────');
    console.log(`Primary Model: ${primaryModel.name}`);
    console.log(`Fallback Models: ${this.config.fallbackModels.length}`);
    console.log(`Format: ${this.config.configFormat.toUpperCase()}`);
    console.log('─────────────────────────────────────────\n');

    const save = await this.prompt('Save configuration to file? (y/n): ');

    if (save.toLowerCase() === 'y') {
      const projectRoot = process.cwd();

      if (this.config.configFormat === 'env') {
        const envPath = path.join(projectRoot, '.env.local');
        const envContent = this.generateEnvConfig();

        try {
          fs.writeFileSync(envPath, envContent, 'utf-8');
          console.log(`\n✓ Configuration saved to .env.local`);
          console.log(`  Location: ${envPath}`);
        } catch (error) {
          console.error(`✗ Failed to write .env.local: ${error.message}`);
        }
      } else {
        const jsonPath = path.join(projectRoot, 'ai-config.json');
        const jsonContent = this.generateJsonConfig();

        try {
          fs.writeFileSync(jsonPath, jsonContent, 'utf-8');
          console.log(`\n✓ Configuration saved to ai-config.json`);
          console.log(`  Location: ${jsonPath}`);
        } catch (error) {
          console.error(`✗ Failed to write ai-config.json: ${error.message}`);
        }
      }
    }

    console.log('\n📋 Next Steps:');
    console.log('  1. Verify the configuration file was created');
    console.log('  2. Restart your application (npm run dev)');
    console.log('  3. Test with a sample inference request');
    console.log('  4. Monitor usage at https://openrouter.ai/account/activity\n');
  }

  async run() {
    try {
      this.printHeader();

      await this.step1ApiKey();
      this.printSeparator();

      await this.step2ModelSelection();
      this.printSeparator();

      await this.step3FallbackChain();
      this.printSeparator();

      await this.step4Preview();
      this.printSeparator();

      await this.step5Deploy();

      console.log('✨ Setup complete! Happy coding!\n');
    } catch (error) {
      console.error('Setup wizard error:', error);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Run wizard
const wizard = new AISetupWizard();
wizard.run();
