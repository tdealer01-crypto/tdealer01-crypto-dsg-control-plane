'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Check, AlertCircle, Loader2 } from 'lucide-react';

// OpenRouter free models
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

interface StepProps {
  isActive: boolean;
  isComplete: boolean;
  stepNumber: number;
  title: string;
}

function StepIndicator({ isActive, isComplete, stepNumber, title }: StepProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
        isActive
          ? 'border-blue-500 bg-blue-50'
          : isComplete
            ? 'border-green-500 bg-green-50'
            : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
          isComplete
            ? 'bg-green-500 text-white'
            : isActive
              ? 'bg-blue-500 text-white'
              : 'bg-gray-300 text-white'
        }`}
      >
        {isComplete ? <Check className="w-4 h-4" /> : stepNumber}
      </div>
      <span
        className={`font-medium ${
          isActive ? 'text-blue-700' : isComplete ? 'text-green-700' : 'text-gray-600'
        }`}
      >
        {title}
      </span>
    </div>
  );
}

interface WizardConfig {
  apiKey: string;
  selectedModel: string;
  configFormat: 'env' | 'json';
  fallbackModels: string[];
}

export function AIWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<WizardConfig>({
    apiKey: '',
    selectedModel: FREE_MODELS[0].id,
    configFormat: 'env',
    fallbackModels: [FREE_MODELS[1].id, FREE_MODELS[2].id],
  });
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [previewData, setPreviewData] = useState('');

  const generatePreview = useCallback(() => {
    if (config.configFormat === 'env') {
      const envContent = `# AI Setup Wizard Configuration
OPENROUTER_API_KEY=${config.apiKey || '<YOUR_API_KEY>'}
AI_PRIMARY_MODEL=${config.selectedModel}
AI_FALLBACK_MODELS=${config.fallbackModels.join(',')}
AI_CONFIG_VERSION=1.0.0
AI_SETUP_TIMESTAMP=${new Date().toISOString()}`;
      setPreviewData(envContent);
    } else {
      const jsonConfig = {
        ai: {
          provider: 'openrouter',
          apiKey: config.apiKey || '<YOUR_API_KEY>',
          primaryModel: config.selectedModel,
          fallbackModels: config.fallbackModels,
          configVersion: '1.0.0',
          setupTimestamp: new Date().toISOString(),
          models: {
            primary: FREE_MODELS.find((m) => m.id === config.selectedModel),
            fallbacks: config.fallbackModels.map((id) => FREE_MODELS.find((m) => m.id === id)),
          },
        },
      };
      setPreviewData(JSON.stringify(jsonConfig, null, 2));
    }
  }, [config.configFormat, config.apiKey, config.selectedModel, config.fallbackModels]);

  // Generate preview on config change
  useEffect(() => {
    if (currentStep === 4) {
      generatePreview();
    }
  }, [config, currentStep, generatePreview]);

  async function testConnection() {
    if (!config.apiKey) {
      setTestResult({ success: false, message: 'API key is required' });
      return;
    }

    setTestLoading(true);
    try {
      const response = await fetch('/api/setup/test-openrouter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          model: config.selectedModel,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: `✓ Connected to ${config.selectedModel}. Model is ready.`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection test failed',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setTestLoading(false);
    }
  }

  function downloadConfig() {
    const filename =
      config.configFormat === 'env' ? '.env.local' : 'ai-config.json';
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(previewData)
    );
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(previewData);
    alert('Configuration copied to clipboard!');
  }

  function addFallback(modelId: string) {
    if (!config.fallbackModels.includes(modelId)) {
      setConfig({
        ...config,
        fallbackModels: [...config.fallbackModels, modelId],
      });
    }
  }

  function removeFallback(modelId: string) {
    setConfig({
      ...config,
      fallbackModels: config.fallbackModels.filter((id) => id !== modelId),
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Setup Wizard
          </h1>
          <p className="text-gray-600">
            Configure your OpenRouter AI models in 5 easy steps
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2 mb-8">
          {[
            { num: 1, title: 'API Key' },
            { num: 2, title: 'Model Selection' },
            { num: 3, title: 'Fallback Chain' },
            { num: 4, title: 'Preview' },
            { num: 5, title: 'Deploy' },
          ].map((step) => (
            <StepIndicator
              key={step.num}
              stepNumber={step.num}
              title={step.title}
              isActive={currentStep === step.num}
              isComplete={currentStep > step.num}
            />
          ))}
        </div>

        {/* Step 1: API Key */}
        {currentStep === 1 && (
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Step 1: Get Your API Key</h2>

            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>New to OpenRouter?</strong> Visit{' '}
                  <a
                    href="https://openrouter.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold"
                  >
                    openrouter.ai
                  </a>{' '}
                  and create a free account to get your API key.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  OpenRouter API Key
                </label>
                <Input
                  type="password"
                  placeholder="sk-or-..."
                  value={config.apiKey}
                  onChange={(e) =>
                    setConfig({ ...config, apiKey: e.target.value })
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Your API key will be securely stored locally. Never shared
                  with DSG servers.
                </p>
              </div>

              <button
                onClick={testConnection}
                disabled={!config.apiKey || testLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {testLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Test Connection
              </button>

              {testResult && (
                <div
                  className={`p-4 rounded-lg ${
                    testResult.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      testResult.success ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {testResult.message}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!config.apiKey}
                className="gap-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Model Selection */}
        {currentStep === 2 && (
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Step 2: Select Primary Model</h2>

            <div className="space-y-4">
              {FREE_MODELS.map((model) => (
                <div
                  key={model.id}
                  onClick={() => setConfig({ ...config, selectedModel: model.id })}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                    config.selectedModel === model.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                        config.selectedModel === model.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {config.selectedModel === model.id && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {model.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {model.description}
                      </p>
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        <span>Provider: {model.provider}</span>
                        <span>Max tokens: {model.maxTokens}</span>
                        <span>${model.costPer1kTokens} per 1k tokens</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between gap-4 mt-8">
              <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(3)} className="gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Fallback Chain */}
        {currentStep === 3 && (
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold mb-2">Step 3: Configure Fallback Chain</h2>
            <p className="text-gray-600 mb-6">
              If your primary model is unavailable, DSG will try these in order
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Active Fallback Models
                </h3>
                {config.fallbackModels.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No fallback models selected. Add at least one for resilience.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {config.fallbackModels.map((modelId, idx) => {
                      const model = FREE_MODELS.find((m) => m.id === modelId);
                      return (
                        <div
                          key={modelId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              #{idx + 1} {model?.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              ${model?.costPer1kTokens} per 1k tokens
                            </div>
                          </div>
                          <button
                            onClick={() => removeFallback(modelId)}
                            className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Available Models
                </h3>
                <div className="space-y-2">
                  {FREE_MODELS.filter(
                    (m) =>
                      m.id !== config.selectedModel &&
                      !config.fallbackModels.includes(m.id)
                  ).map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {model.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {model.provider}
                        </div>
                      </div>
                      <button
                        onClick={() => addFallback(model.id)}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-4 mt-8">
              <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(4)} className="gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Preview */}
        {currentStep === 4 && (
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Step 4: Preview Configuration</h2>

            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="env"
                    checked={config.configFormat === 'env'}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        configFormat: e.target.value as 'env' | 'json',
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">.env.local format</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="json"
                    checked={config.configFormat === 'json'}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        configFormat: e.target.value as 'env' | 'json',
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">JSON format</span>
                </label>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 mb-6 overflow-x-auto">
              <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap break-words">
                {previewData}
              </pre>
            </div>

            <div className="flex gap-3 mb-8">
              <Button
                onClick={copyToClipboard}
                variant="secondary"
                className="flex-1"
              >
                Copy to Clipboard
              </Button>
              <Button onClick={downloadConfig} className="flex-1">
                Download
              </Button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <strong>Keep your API key private.</strong> Never commit it to
                  version control. Use .env.local locally and add it to your
                  deployment environment separately.
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-4">
              <Button variant="secondary" onClick={() => setCurrentStep(3)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(5)} className="gap-2">
                Review & Deploy <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 5: Deploy */}
        {currentStep === 5 && (
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Step 5: Complete Setup</h2>

            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <strong>Configuration Ready!</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Primary Model: {FREE_MODELS.find((m) => m.id === config.selectedModel)?.name}</li>
                      <li>Fallback Models: {config.fallbackModels.length}</li>
                      <li>Format: {config.configFormat.toUpperCase()}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Next Steps:</h3>
                <ol className="space-y-2 text-sm text-blue-900 list-decimal list-inside">
                  <li>Download or copy your configuration</li>
                  <li>
                    {config.configFormat === 'env'
                      ? 'Add the environment variables to .env.local (local dev) or Vercel (production)'
                      : 'Place ai-config.json in your project root'}
                  </li>
                  <li>Restart your application to load the configuration</li>
                  <li>Test with a sample inference request</li>
                  <li>Monitor usage on your OpenRouter dashboard</li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Configuration Summary
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Primary Model:</dt>
                    <dd className="font-mono text-gray-900">
                      {config.selectedModel}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Fallback Models:</dt>
                    <dd className="font-mono text-gray-900">
                      {config.fallbackModels.length}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">API Provider:</dt>
                    <dd className="font-mono text-gray-900">OpenRouter</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="flex justify-between gap-4 mt-8">
              <Button variant="secondary" onClick={() => setCurrentStep(4)}>
                Back
              </Button>
              <Button
                onClick={() => {
                  downloadConfig();
                  setCurrentStep(1);
                  setConfig({
                    apiKey: '',
                    selectedModel: FREE_MODELS[0].id,
                    configFormat: 'env',
                    fallbackModels: [FREE_MODELS[1].id, FREE_MODELS[2].id],
                  });
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                ✓ Complete Setup
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
