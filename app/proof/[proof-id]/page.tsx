/**
 * Proof Portal: Individual proof report detail page
 * Accessible via shareable link: /proof/{run_id}
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
}

interface ProofReport {
  run_id: string;
  claim_pass_eligible: boolean;
  requirements_pass: number;
  requirements_total: number;
  matrix_json?: {
    checks?: CheckResult[];
    production_url?: string;
    generated_at?: string;
  };
  created_at: string;
  updated_at: string;
}

export default function ProofDetailPage() {
  const params = useParams();
  const proofId = Array.isArray(params.['proof-id'])
    ? params.['proof-id'][0]
    : params.['proof-id'];

  const [report, setReport] = useState<ProofReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        // Fetch the proof report by run_id
        // This is a public endpoint - shareable without auth
        const res = await fetch(`/api/delivery-proof/report/${encodeURIComponent(proofId)}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Failed to load proof: ${res.statusText}`);
        }

        const data = await res.json();
        setReport(data);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }

    if (proofId) {
      loadReport();
    }
  }, [proofId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400"></div>
          <p className="text-slate-400">Loading proof report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/10 p-6">
        <h3 className="text-lg font-semibold text-red-300">Error loading proof</h3>
        <p className="mt-2 text-sm text-red-200">{error}</p>
        <Link href="/proof" className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
          ← Back to proofs
        </Link>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="border-slate-700 bg-slate-900/30 p-6">
        <h3 className="text-lg font-semibold text-slate-300">Proof not found</h3>
        <p className="mt-2 text-sm text-slate-400">The requested proof report could not be found.</p>
        <Link href="/proof" className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
          ← Back to proofs
        </Link>
      </Card>
    );
  }

  const checks = report.matrix_json?.checks || [];
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/proof" className="text-sm text-emerald-400 hover:underline">
          ← Back to proofs
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Proof Report</h1>
        <p className="mt-2 text-slate-400">Run ID: {report.run_id}</p>
      </div>

      {/* Status Card */}
      <Card className={`border-2 p-6 ${
        report.claim_pass_eligible
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-amber-500/30 bg-amber-500/10'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {report.claim_pass_eligible ? '✓ Evidence Complete' : '⚠ Review Required'}
            </h2>
            <p className={`mt-2 text-sm ${
              report.claim_pass_eligible ? 'text-emerald-200' : 'text-amber-200'
            }`}>
              {report.claim_pass_eligible
                ? 'All checks passed. This deployment is evidence-ready.'
                : `${failCount} check(s) failed. Please review and remediate.`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-400">
              {passCount}/{report.requirements_total}
            </div>
            <p className="text-xs text-slate-400">Checks passed</p>
          </div>
        </div>
      </Card>

      {/* Production URL */}
      {report.matrix_json?.production_url && (
        <Card className="border-slate-700 bg-slate-900/30 p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase">Production URL</h3>
          <a
            href={report.matrix_json.production_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-emerald-400 break-all hover:underline"
          >
            {report.matrix_json.production_url}
          </a>
        </Card>
      )}

      {/* Checks Table */}
      <Card className="border-slate-700 bg-slate-900/30 p-6">
        <h3 className="text-lg font-semibold">Readiness Checks</h3>
        <div className="mt-4 space-y-3">
          {checks.length === 0 ? (
            <p className="text-slate-400">No checks recorded.</p>
          ) : (
            checks.map((check, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 ${
                  check.status === 'pass'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : check.status === 'fail'
                      ? 'border-red-500/30 bg-red-500/10'
                      : 'border-slate-700 bg-slate-800/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-200">{check.name}</h4>
                    <p className="mt-1 text-sm text-slate-400">{check.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      check.status === 'pass'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : check.status === 'fail'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-slate-700/20 text-slate-300'
                    }`}
                  >
                    {check.status === 'pass' ? '✓ Pass' : check.status === 'fail' ? '✗ Fail' : '— Skip'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Metadata */}
      <Card className="border-slate-700 bg-slate-900/30 p-4 text-xs text-slate-500">
        <p>Created: {new Date(report.created_at).toLocaleString()}</p>
        <p>Last updated: {new Date(report.updated_at).toLocaleString()}</p>
        {report.matrix_json?.generated_at && (
          <p>Generated at: {new Date(report.matrix_json.generated_at).toLocaleString()}</p>
        )}
      </Card>
    </div>
  );
}
