'use client';

import React, { useState, useMemo } from 'react';
import { Check, X, AlertTriangle, Loader } from 'lucide-react';
import { Badge } from './Badge';
import type { AgentChatEvent } from '../../lib/agent/chat-event';

export type TimelineEntry = {
  id: string;
  kind: 'plan' | 'preflight' | 'step' | 'approval' | 'governance' | 'done' | 'error';
  label: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'review' | 'info';
  toolName?: string;
  decision?: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason?: string;
  result?: unknown;
  error?: string;
  isReadOnly?: boolean;
};

interface AgentTimelineProps {
  events: AgentChatEvent[];
  className?: string;
}

function getStatusIcon(status: TimelineEntry['status']) {
  switch (status) {
    case 'running':
      return <Loader className="w-4 h-4 animate-spin" />;
    case 'success':
      return <Check className="w-4 h-4" />;
    case 'error':
      return <X className="w-4 h-4" />;
    case 'review':
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <div className="w-4 h-4 rounded-full border border-slate-400" />;
  }
}

function getStatusColor(status: TimelineEntry['status']) {
  switch (status) {
    case 'running':
      return 'text-yellow-400';
    case 'success':
      return 'text-emerald-400';
    case 'error':
      return 'text-red-400';
    case 'review':
      return 'text-orange-400';
    default:
      return 'text-slate-400';
  }
}

function getDecisionBadgeVariant(decision?: string): 'success' | 'error' | 'warning' | 'default' {
  switch (decision) {
    case 'ALLOW':
      return 'success';
    case 'BLOCK':
      return 'error';
    case 'REVIEW':
      return 'warning';
    default:
      return 'default';
  }
}

function TimelineCard({ entry }: { entry: TimelineEntry }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = getStatusColor(entry.status);
  const statusIcon = getStatusIcon(entry.status);

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex gap-3">
        {/* Timeline connector */}
        <div className="flex flex-col items-center">
          <div className={`${statusColor} transition-colors`}>{statusIcon}</div>
          <div className="w-0.5 h-12 bg-slate-700 mt-1 last:h-0" />
        </div>

        {/* Card content */}
        <div className="flex-1 pb-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-slate-200 truncate">
                  {entry.toolName ? (
                    <>
                      <span className="text-slate-400">Step:</span> {entry.toolName}
                    </>
                  ) : (
                    entry.label
                  )}
                </h4>
                {entry.isReadOnly && (
                  <p className="text-xs text-slate-500 mt-1">อ่านอย่างเดียว (read-only)</p>
                )}
              </div>
              {entry.decision && (
                <Badge variant={getDecisionBadgeVariant(entry.decision)} className="flex-shrink-0">
                  {entry.decision}
                </Badge>
              )}
            </div>

            {/* Reason/error message */}
            {(entry.reason || entry.error) && (
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {entry.reason || entry.error}
              </p>
            )}

            {/* Expand/collapse for details */}
            {(entry.result !== undefined || entry.error) && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {expanded ? '▼ ซ่อนหลักฐาน' : '▶ ดูหลักฐาน'}
              </button>
            )}

            {/* Details (collapsible) */}
            {expanded && (entry.result !== undefined || entry.error) && (
              <div className="mt-3 p-2 rounded bg-slate-950 border border-slate-800 max-h-60 overflow-y-auto">
                <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words font-mono">
                  {entry.error ? entry.error : JSON.stringify(entry.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AgentTimeline({ events, className = '' }: AgentTimelineProps) {
  const timeline = useMemo(() => {
    const entries: TimelineEntry[] = [];
    let stepCounter = 0;

    for (const event of events) {
      const type = String(event?.type || '');

      if (type === 'plan') {
        const steps = Array.isArray(event.steps) ? event.steps : [];
        const isReadOnly = steps.length > 0 && steps.every((s) => {
          const toolId = String(s.toolId || s.goal || '');
          const readOnlyTools = [
            'readiness_v2', 'list_agents_v2', 'list_policies_v2', 'list_executions_v2',
            'audit_events_v2', 'runtime_summary_v2', 'runtime_recovery_v2',
            'readiness', 'list_agents', 'capacity', 'get_metrics',
          ];
          return readOnlyTools.includes(toolId);
        });

        entries.push({
          id: `plan-${entries.length}`,
          kind: 'plan',
          label: 'แผนงาน',
          status: 'info',
          reason: isReadOnly
            ? 'โหมดอ่านอย่างเดียว — ไม่แก้ไฟล์ ไม่แตะฐานข้อมูล ไม่ deploy'
            : 'ต้องตรวจผลกระทบก่อนรันจริง',
        });
      }

      if (type === 'preflight') {
        entries.push({
          id: `preflight-${entries.length}`,
          kind: 'preflight',
          label: 'ตรวจสิทธิ์และความเสี่ยง',
          status: 'info',
          decision: event.decision ? (String(event.decision).toUpperCase() as 'ALLOW' | 'BLOCK' | 'REVIEW') : undefined,
          reason: event.reason,
        });
      }

      if (type === 'step_start') {
        stepCounter++;
        entries.push({
          id: `step-start-${stepCounter}`,
          kind: 'step',
          label: `ขั้นตอน ${stepCounter}`,
          status: 'running',
          toolName: event.tool,
        });
      }

      if (type === 'step_result') {
        entries.push({
          id: `step-result-${entries.length}`,
          kind: 'step',
          label: `ขั้นตอน ${stepCounter} สำเร็จ`,
          status: 'success',
          result: event.result,
        });
      }

      if (type === 'step_error') {
        entries.push({
          id: `step-error-${entries.length}`,
          kind: 'step',
          label: `ขั้นตอน ${stepCounter} ล้มเหลว`,
          status: 'error',
          error: event.error,
        });
      }

      if (type === 'approval_required') {
        entries.push({
          id: `approval-${entries.length}`,
          kind: 'approval',
          label: 'รอการอนุมัติ',
          status: 'review',
        });
      }

      if (type === 'governance') {
        entries.push({
          id: `governance-${entries.length}`,
          kind: 'governance',
          label: 'ประเมินการบริหารจัดการ',
          status: 'info',
          decision: event.decision ? (String(event.decision).toUpperCase() as 'ALLOW' | 'BLOCK' | 'REVIEW') : undefined,
          reason: event.reason,
        });
      }

      if (type === 'done') {
        entries.push({
          id: `done-${entries.length}`,
          kind: 'done',
          label: 'งานเสร็จแล้ว',
          status: 'success',
        });
      }
    }

    return entries;
  }, [events]);

  if (timeline.length === 0) return null;

  return (
    <div className={`${className}`}>
      <div className="space-y-1">
        {timeline.map((entry) => (
          <TimelineCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
