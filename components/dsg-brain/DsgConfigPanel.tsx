'use client';

import { useState } from 'react';
import type { DsgBrainConfig } from '@/lib/dsg/brain/ui/types';

interface DsgConfigPanelProps {
  config: DsgBrainConfig;
  onSave: (config: DsgBrainConfig) => void;
  onClose: () => void;
}

export default function DsgConfigPanel({ config, onSave, onClose }: DsgConfigPanelProps) {
  const [commands, setCommands] = useState(config.allowedCommands.join(', '));
  const [paths, setPaths] = useState(config.allowedPaths.join(', '));

  const handleSave = () => {
    const updatedConfig: DsgBrainConfig = {
      ...config,
      allowedCommands: commands
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s),
      allowedPaths: paths
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s),
    };
    onSave(updatedConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Configuration</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Allowed Commands */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Allowed Commands (comma-separated)
            </label>
            <textarea
              value={commands}
              onChange={(e) => setCommands(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-600 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
              rows={3}
              placeholder="echo, ls, find, grep"
            />
            <p className="text-xs text-slate-400 mt-1">
              Commands that can be executed. Leave empty to allow all.
            </p>
          </div>

          {/* Allowed Paths */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Allowed Paths (comma-separated)
            </label>
            <textarea
              value={paths}
              onChange={(e) => setPaths(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-600 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
              rows={3}
              placeholder="/tmp, /var, /home"
            />
            <p className="text-xs text-slate-400 mt-1">
              Paths that can be accessed. Leave empty to allow all.
            </p>
          </div>

          {/* Model Info */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Model</label>
            <div className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-300">
              {config.model || 'claude-haiku-4-5-20251001'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Anthropic API (read-only for now)</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
