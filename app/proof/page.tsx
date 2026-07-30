/**
 * Proof Portal: List user's delivery proof reports
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface DeliveryProofReport {
  id: string;
  run_id: string;
  claim_pass_eligible: boolean;
  requirements_pass: number;
  requirements_total: number;
  last_ci_run: string;
  created_at: string;
  updated_at: string;
  matrix_json?: {
    production_url?: string;
  };
}

function ProofListContent() {
  const [reports, setReports] = useState<DeliveryProofReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReports() {
      try {
        // TODO: Implement authenticated API to fetch user's proofs
        // For now, this is a placeholder
        setReports([]);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400"></div>
          <p className="text-slate-400">Loading proofs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/10 p-6">
        <h3 className="text-lg font-semibold text-red-300">Error loading proofs</h3>
        <p className="mt-2 text-sm text-red-200">{error}</p>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-12 text-center">
        <div className="text-4xl">📋</div>
        <h2 className="mt-4 text-xl font-semibold text-slate-200">No proof reports yet</h2>
        <p className="mt-2 text-slate-400">Create your first delivery proof by scanning your production URL</p>
        <Link
          href="/delivery-proof"
          className="mt-6 inline-block rounded-lg bg-emerald-500/20 px-6 py-2 text-emerald-300 transition hover:bg-emerald-500/30"
        >
          Scan Production URL →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Run ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Production URL</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Score</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Created</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                <td className="px-6 py-4 text-sm font-mono text-slate-300">
                  {report.run_id}
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {report.matrix_json?.production_url ? (
                    <a
                      href={report.matrix_json.production_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      {report.matrix_json.production_url}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {report.claim_pass_eligible ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                      ✓ Evidence Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
                      ⚠ Review Required
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {report.requirements_pass}/{report.requirements_total}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(report.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/proof/${encodeURIComponent(report.run_id)}`}
                    className="text-emerald-400 transition hover:text-emerald-300 text-sm font-semibold"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProofListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Delivery Proof Reports</h1>
        <p className="mt-2 text-slate-400">
          View and share your production readiness proofs. Each report is independently verifiable and includes evidence chain.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-400">Loading...</p>
          </div>
        }
      >
        <ProofListContent />
      </Suspense>
    </div>
  );
}
