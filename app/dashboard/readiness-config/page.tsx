'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Save, RotateCcw } from 'lucide-react';

interface ReadinessConfig {
  minTestCoveragePercent: number;
  requireNApprovals: number;
  blockOnSecrets: boolean;
  blockOnFailedCI: boolean;
  autoMergeOnPass: boolean;
}

const PRESETS = {
  strict: {
    label: 'Strict (Production)',
    config: {
      minTestCoveragePercent: 90,
      requireNApprovals: 3,
      blockOnSecrets: true,
      blockOnFailedCI: true,
      autoMergeOnPass: false,
    },
  },
  balanced: {
    label: 'Balanced (Default)',
    config: {
      minTestCoveragePercent: 80,
      requireNApprovals: 2,
      blockOnSecrets: true,
      blockOnFailedCI: true,
      autoMergeOnPass: false,
    },
  },
  lenient: {
    label: 'Lenient (Development)',
    config: {
      minTestCoveragePercent: 70,
      requireNApprovals: 1,
      blockOnSecrets: false,
      blockOnFailedCI: false,
      autoMergeOnPass: false,
    },
  },
};

export default function ReadinessConfigPage() {
  const [config, setConfig] = useState<ReadinessConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const response = await fetch('/api/readiness/config');
      const result = await response.json();
      if (result.success) {
        setConfig(result.data);
      } else {
        setError('Failed to load configuration');
      }
    } catch (err) {
      setError('Error fetching configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/readiness/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error || 'Failed to save configuration');
      }
    } catch (err) {
      setError('Error saving configuration');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function applyPreset(presetKey: keyof typeof PRESETS) {
    const preset = PRESETS[presetKey];
    setConfig(preset.config);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-100 rounded w-96 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || 'Failed to load readiness configuration'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Readiness Gate Configuration</h1>
          <p className="text-gray-600">
            Define deployment readiness rules. These checks block or require review before promoting to production.
          </p>
        </div>

        {/* Success message */}
        {saved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-800">
            <CheckCircle2 className="w-5 h-5" />
            Configuration saved successfully
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Quick presets */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Quick Presets</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key as keyof typeof PRESETS)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-left"
              >
                <div className="font-semibold text-gray-900">{preset.label}</div>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <div>Coverage: {preset.config.minTestCoveragePercent}%</div>
                  <div>Approvals: {preset.config.requireNApprovals}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration form */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-lg font-semibold mb-6">Custom Configuration</h2>

          <div className="space-y-8">
            {/* Test Coverage */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Minimum Test Coverage: {config.minTestCoveragePercent}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={config.minTestCoveragePercent}
                onChange={e =>
                  setConfig({
                    ...config,
                    minTestCoveragePercent: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">
                Deployments below this coverage % require review
              </p>
            </div>

            {/* Approvals */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Required Approvals: {config.requireNApprovals}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={config.requireNApprovals}
                onChange={e =>
                  setConfig({
                    ...config,
                    requireNApprovals: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">
                Number of code reviews required before merge
              </p>
            </div>

            {/* Checkbox: Block on Secrets */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.blockOnSecrets}
                  onChange={e =>
                    setConfig({
                      ...config,
                      blockOnSecrets: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <div>
                  <div className="font-medium text-gray-900">Block on Detected Secrets</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Prevent deployment if credentials, API keys, or tokens are found in diff
                  </p>
                </div>
              </label>
            </div>

            {/* Checkbox: Block on Failed CI */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.blockOnFailedCI}
                  onChange={e =>
                    setConfig({
                      ...config,
                      blockOnFailedCI: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <div>
                  <div className="font-medium text-gray-900">Block on Failed CI</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Prevent deployment if GitHub Actions or other CI workflow failed
                  </p>
                </div>
              </label>
            </div>

            {/* Checkbox: Auto-merge on pass */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoMergeOnPass}
                  onChange={e =>
                    setConfig({
                      ...config,
                      autoMergeOnPass: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <div>
                  <div className="font-medium text-gray-900">Auto-merge When Ready</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically merge PR when all readiness checks pass (optional)
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              onClick={() => fetchConfig()}
              className="flex items-center gap-2 bg-gray-200 text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">How Readiness Gates Work</h3>
          <ul className="space-y-2 text-sm text-blue-900">
            <li>✓ <strong>CI Status</strong> — All GitHub Actions must pass</li>
            <li>✓ <strong>Test Coverage</strong> — Code must meet minimum coverage threshold</li>
            <li>✓ <strong>Code Reviews</strong> — PR must have required number of approvals</li>
            <li>✓ <strong>Secrets Detection</strong> — No hardcoded credentials in diff</li>
            <li>✓ <strong>Migrations</strong> — Pending database changes flagged for review</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
