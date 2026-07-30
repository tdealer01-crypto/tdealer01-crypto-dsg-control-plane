'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, AlertCircle, CheckCircle } from 'lucide-react';

interface ComplianceControl {
  control_id: string;
  control_name: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'REVIEW';
  evidence_count: number;
  last_verified: string;
  notes: string;
}

interface ComplianceRequirement {
  requirement_id: string;
  requirement_name: string;
  status: 'MET' | 'UNMET' | 'PARTIAL' | 'REVIEW';
  audit_events_matching: number;
  last_verified: string;
  notes: string;
}

interface EvidenceSummary {
  total_audit_logs: number;
  logs_with_decision_pass: number;
  logs_with_decision_block: number;
  logs_with_decision_review: number;
  unique_actors: number;
  unique_agents: number;
  policy_versions_used: string[];
}

interface ComplianceSchema {
  schema_version: string;
  report_id: string;
  org_id: string;
  generated_at: string;
  period_days: number;
  period_start: string;
  period_end: string;
  audit_events_count: number;
  compliance_matrix: {
    soc2_controls: ComplianceControl[];
    gdpr_requirements: ComplianceRequirement[];
    eu_ai_act_requirements: ComplianceRequirement[];
  };
  evidence_summary: EvidenceSummary;
  ccvs_levels: {
    l1_unit_evidence: boolean;
    l2_integration_evidence: boolean;
    l3_adversarial_evidence: boolean;
    l4_mutation_evidence: boolean;
    l5_provenance_evidence: boolean;
  };
  claims: {
    certification_claim: boolean;
    independent_audit_claim: boolean;
    soc2_claim: boolean;
    gdpr_claim: boolean;
    eu_ai_act_claim: boolean;
  };
}

interface ComplianceExportResponse {
  ok: boolean;
  schema: ComplianceSchema;
}

export default function CompliancePage() {
  const [schema, setSchema] = useState<ComplianceSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(7);

  const fetchCompliance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/compliance-export?format=json&days=${daysBack}`);
      if (!response.ok) {
        throw new Error('Failed to fetch compliance data');
      }

      const data: ComplianceExportResponse = await response.json();
      if (!data.ok) {
        throw new Error('Invalid response from compliance export');
      }

      setSchema(data.schema);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [daysBack]);

  useEffect(() => {
    void fetchCompliance();
  }, [daysBack, fetchCompliance]);

  const handleExport = async (format: 'json' | 'csv') => {
    const response = await fetch(`/api/compliance-export?format=${format}&days=${daysBack}`);

    if (format === 'json' && schema) {
      const jsonStr = JSON.stringify(schema, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${Date.now()}.json`;
      a.click();
    } else if (format === 'csv') {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${Date.now()}.csv`;
      a.click();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
      case 'MET':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'FAIL':
      case 'UNMET':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'PARTIAL':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'REVIEW':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Compliance & Evidence Export</h1>
        <p className="text-gray-600">
          Generate SOC 2, GDPR, and EU AI Act compliance reports from audit logs.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Period
            </label>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleExport('json')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating compliance report...</p>
          </div>
        </div>
      )}

      {/* Report Content */}
      {!loading && !error && schema && (
        <>
          {/* Evidence Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-6">Audit Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600">Total Audit Events</p>
                <p className="text-2xl font-bold text-blue-900">{schema.audit_events_count}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600">Passed Decisions</p>
                <p className="text-2xl font-bold text-green-900">{schema.evidence_summary.logs_with_decision_pass}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-sm text-gray-600">Blocked Decisions</p>
                <p className="text-2xl font-bold text-red-900">{schema.evidence_summary.logs_with_decision_block}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-sm text-gray-600">Review Decisions</p>
                <p className="text-2xl font-bold text-yellow-900">{schema.evidence_summary.logs_with_decision_review}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-gray-600">Unique Actors</p>
                <p className="text-2xl font-bold text-purple-900">{schema.evidence_summary.unique_actors}</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                <p className="text-sm text-gray-600">Unique Agents</p>
                <p className="text-2xl font-bold text-indigo-900">{schema.evidence_summary.unique_agents}</p>
              </div>
            </div>
          </div>

          {/* CCVS Evidence Levels */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-6">CCVS Evidence Levels</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(schema.ccvs_levels).map(([level, available]) => (
                <div
                  key={level}
                  className={`p-4 rounded-lg border flex items-center gap-3 ${
                    available ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {available ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className={available ? 'text-green-900' : 'text-gray-600'}>
                    {level.toUpperCase()}: {available ? 'Available' : 'Not Available'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SOC 2 Controls */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-6">SOC 2 Controls</h2>
            <div className="space-y-3">
              {schema.compliance_matrix.soc2_controls.map((control) => (
                <div
                  key={control.control_id}
                  className={`p-4 rounded-lg border ${getStatusColor(control.status)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">
                        {control.control_id}: {control.control_name}
                      </h3>
                      <p className="text-sm mt-2">{control.notes}</p>
                      <div className="text-xs mt-2 opacity-75">
                        Evidence: {control.evidence_count} | Last verified: {new Date(control.last_verified).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white/50 rounded text-xs font-semibold whitespace-nowrap">
                      {control.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GDPR Requirements */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-6">GDPR Requirements</h2>
            <div className="space-y-3">
              {schema.compliance_matrix.gdpr_requirements.map((req) => (
                <div
                  key={req.requirement_id}
                  className={`p-4 rounded-lg border ${getStatusColor(req.status)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">
                        {req.requirement_id}: {req.requirement_name}
                      </h3>
                      <p className="text-sm mt-2">{req.notes}</p>
                      <div className="text-xs mt-2 opacity-75">
                        Matching events: {req.audit_events_matching} | Last verified: {new Date(req.last_verified).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white/50 rounded text-xs font-semibold whitespace-nowrap">
                      {req.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EU AI Act Requirements */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-6">EU AI Act Requirements</h2>
            <div className="space-y-3">
              {schema.compliance_matrix.eu_ai_act_requirements.map((req) => (
                <div
                  key={req.requirement_id}
                  className={`p-4 rounded-lg border ${getStatusColor(req.status)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">
                        {req.requirement_id}: {req.requirement_name}
                      </h3>
                      <p className="text-sm mt-2">{req.notes}</p>
                      <div className="text-xs mt-2 opacity-75">
                        Matching events: {req.audit_events_matching} | Last verified: {new Date(req.last_verified).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white/50 rounded text-xs font-semibold whitespace-nowrap">
                      {req.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance Claims */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-6">Compliance Claims</h2>
            <p className="text-sm text-gray-600 mb-4">
              All claims are marked as false pending third-party independent audit verification.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(schema.claims).map(([claim, status]) => (
                <div
                  key={claim}
                  className={`p-3 rounded-lg border ${
                    status
                      ? 'bg-green-50 border-green-200 text-green-900'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {status ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="capitalize">
                      {claim.replace(/_/g, ' ')}: {status ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Metadata */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-sm text-gray-600">
            <p>Report ID: <code className="bg-white px-2 py-1 rounded border">{schema.report_id}</code></p>
            <p>Generated: {new Date(schema.generated_at).toLocaleString()}</p>
            <p>Period: {schema.period_days} days ({new Date(schema.period_start).toLocaleDateString()} to {new Date(schema.period_end).toLocaleDateString()})</p>
            <p>Schema Version: {schema.schema_version}</p>
          </div>
        </>
      )}
    </div>
  );
}
