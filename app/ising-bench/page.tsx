'use client';

import { useState } from 'react';
import { benchmarkIsingVsZ3, loadBenchmarkCases, exportBenchmarkReport, type BenchmarkReport } from '@/lib/dsg-one/ising-benchmark';
import type { BenchmarkCase } from '@/lib/dsg-one/ising-benchmark';

export default function IsingBenchmarkDashboard() {
  const [selectedCases, setSelectedCases] = useState<string[]>(['small']);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allCases, setAllCases] = useState<BenchmarkCase[]>([]);
  const [loading, setLoading] = useState(true);

  // Load cases on mount
  const loadCases = async () => {
    try {
      const cases = await loadBenchmarkCases();
      setAllCases(cases);
      setLoading(false);
    } catch (err) {
      setError(`Failed to load test cases: ${err}`);
      setLoading(false);
    }
  };

  // Load cases on first render
  if (loading && allCases.length === 0) {
    loadCases();
  }

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    setError(null);
    setReport(null);

    try {
      const casesToRun = allCases.filter((c) => selectedCases.includes(c.id));
      if (casesToRun.length === 0) {
        setError('Please select at least one test case');
        setIsRunning(false);
        return;
      }

      const benchmarkReport = await benchmarkIsingVsZ3(casesToRun);
      setReport(benchmarkReport);

      // Auto-export reports
      await exportBenchmarkReport(benchmarkReport);
    } catch (err) {
      setError(`Benchmark failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleCase = (caseId: string) => {
    setSelectedCases((prev) =>
      prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId]
    );
  };

  const handleExportMarkdown = () => {
    if (!report) return;
    const blob = new Blob([report.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ising-benchmark-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report.json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ising-benchmark-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            DSG Ising Benchmark Dashboard
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Evidence Generator for Determinism Proof
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Test Configuration</h2>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Select Test Cases
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {allCases.map((testCase) => (
                <label
                  key={testCase.id}
                  className="flex items-center p-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedCases.includes(testCase.id)}
                    onChange={() => handleToggleCase(testCase.id)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-slate-900 dark:text-white">{testCase.name}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {testCase.variables} vars × {testCase.constraints} constraints
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunBenchmark}
            disabled={isRunning || selectedCases.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition"
          >
            {isRunning ? '⏳ Running Benchmark...' : '▶ Run Benchmark'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Results Panel */}
        {report && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Summary</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Fastest Mode</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {report.summary.fastestMode}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Latency</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {report.summary.averageLatency.toFixed(0)}ms
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Determinism</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {report.summary.deterministicScore.toFixed(0)}/100
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Fallback Rate</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {report.summary.fallbackRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Go/No-Go Criteria */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Go/No-Go Criteria</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Determinism ≥95%</span>
                    <span className={report.summary.deterministicScore >= 95 ? 'text-green-600' : 'text-red-600'}>
                      {report.summary.deterministicScore >= 95 ? '✅ PASS' : '❌ FAIL'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Proof Consistency</span>
                    <span className={report.summary.proofConsistency === 100 ? 'text-green-600' : 'text-yellow-600'}>
                      {report.summary.proofConsistency === 100 ? '✅ PASS' : '⚠️ CAUTION'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Performance &lt;2s</span>
                    <span className={report.summary.averageLatency < 2000 ? 'text-green-600' : 'text-yellow-600'}>
                      {report.summary.averageLatency < 2000 ? '✅ PASS' : '⚠️ REVIEW'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-Case Results */}
            {Array.from(report.results.entries()).map(([caseId, results]) => {
              const testCase = report.cases.find((c) => c.id === caseId);
              return (
                <div key={caseId} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    {testCase?.name || caseId}
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            Solver Mode
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            Latency
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            Determinism
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            Energy Var
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            Proof
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result) => (
                          <tr
                            key={result.mode}
                            className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                          >
                            <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">{result.mode}</td>
                            <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                              {result.latencyMs.toFixed(0)}ms
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                              {result.success ? `${result.deterministicScore.toFixed(0)}/100` : 'FAILED'}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                              {result.energyVariance.toFixed(6)}
                            </td>
                            <td className="py-2 px-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                              {result.proofHash ? `${result.proofHash.substring(0, 12)}...` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Export Panel */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Export Evidence</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExportMarkdown}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  📄 Export Markdown
                </button>
                <button
                  onClick={handleExportJSON}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  📊 Export JSON
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                Reports saved to <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">/reports/ising-benchmark/</code>
              </p>
            </div>

            {/* Raw Markdown View */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Audit Evidence (Markdown)</h2>
              <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-xs overflow-x-auto text-slate-700 dark:text-slate-300">
                {report.markdown}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
