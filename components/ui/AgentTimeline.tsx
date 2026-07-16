'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Loader,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Info,
} from 'lucide-react';
import { getHumanToolLabel } from '@/lib/hermes/human-event';

export interface AgentEvent {
  type?: string;
  step?: string;
  tool?: string;
  error?: string;
  reply?: string;
  model?: string;
  steps?: Array<{ id?: string; toolId?: string; toolName?: string; goal?: string }>;
  result?: unknown;
  decision?: string;
  reason?: string;
  risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  affected_count?: number;
  rollback_available?: boolean;
  decision_id?: string;
}

interface AgentTimelineProps {
  events: AgentEvent[];
  isLoading?: boolean;
  accentColor?: 'blue' | 'amber' | 'emerald' | 'red' | 'purple';
}

function getEventIcon(type?: string) {
  switch (type) {
    case 'plan':
      return <Zap className="h-4 w-4" />;
    case 'step_start':
      return <Clock className="h-4 w-4" />;
    case 'step_result':
      return <CheckCircle className="h-4 w-4" />;
    case 'step_error':
      return <AlertCircle className="h-4 w-4" />;
    case 'done':
      return <CheckCircle className="h-4 w-4" />;
    case 'preflight':
      return <Info className="h-4 w-4" />;
    case 'approval_required':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

function getEventColor(type?: string): string {
  switch (type) {
    case 'plan':
      return 'text-amber-400 bg-amber-500/10';
    case 'step_start':
      return 'text-blue-400 bg-blue-500/10';
    case 'step_result':
      return 'text-emerald-400 bg-emerald-500/10';
    case 'step_error':
      return 'text-red-400 bg-red-500/10';
    case 'done':
      return 'text-emerald-400 bg-emerald-500/10';
    case 'approval_required':
      return 'text-yellow-400 bg-yellow-500/10';
    case 'preflight':
      return 'text-cyan-400 bg-cyan-500/10';
    default:
      return 'text-gray-400 bg-gray-500/10';
  }
}

function getEventLabel(type?: string): string {
  switch (type) {
    case 'plan':
      return 'Plan';
    case 'step_start':
      return 'Step Started';
    case 'step_result':
      return 'Step Complete';
    case 'step_error':
      return 'Step Error';
    case 'done':
      return 'Done';
    case 'preflight':
      return 'Preflight Check';
    case 'approval_required':
      return 'Approval Needed';
    default:
      return 'Event';
  }
}

function formatResult(result: unknown): string {
  if (!result || typeof result !== 'object') {
    return String(result ?? '-');
  }

  const data = result as Record<string, unknown>;

  if (typeof data.status === 'string') {
    return `Status: ${data.status}`;
  }

  if (typeof data.ok === 'boolean') {
    return data.ok ? '✓ Success' : '✗ Failed';
  }

  if (Array.isArray(data.items)) {
    const pagination = data.pagination as Record<string, unknown> | undefined;
    if (pagination?.total) {
      return `Found ${pagination.total} items`;
    }
    return `Found ${data.items.length} items`;
  }

  if (typeof data.message === 'string') {
    return data.message;
  }

  return JSON.stringify(data).slice(0, 100) + '...';
}

function EventCard({ event, index }: { event: AgentEvent; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const eventType = event.type || 'unknown';
  const colorClass = getEventColor(eventType);
  const iconClass = getEventColor(eventType).split(' ')[0];

  const hasDetails =
    (event.error && eventType === 'step_error') ||
    (event.result && eventType === 'step_result') ||
    (event.steps && eventType === 'plan') ||
    (event.reason && eventType === 'approval_required');

  return (
    <div className="flex gap-4">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div
          className={`flex items-center justify-center h-8 w-8 rounded-full border-2 border-current ${colorClass}`}
        >
          {eventType === 'step_start' ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            getEventIcon(eventType)
          )}
        </div>
        {index < 100 && <div className="h-12 w-0.5 bg-gradient-to-b from-current to-transparent mt-2" />}
      </div>

      {/* Event card */}
      <div className="flex-1 pb-6">
        <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${iconClass}`}>
                  {getEventLabel(eventType)}
                </span>
                {event.tool && (
                  <span className="text-xs text-gray-400">
                    • {getHumanToolLabel(event.tool, event.tool)}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300">
                {eventType === 'step_start' && `Running: ${event.step || event.tool || 'step'}`}
                {eventType === 'step_result' && `Completed: ${event.step || 'step'}`}
                {eventType === 'step_error' && `Error in ${event.step || 'step'}`}
                {eventType === 'plan' &&
                  `Plan: ${event.steps?.length || 0} steps${event.decision ? ` (${event.decision})` : ''}`}
                {eventType === 'approval_required' && `Approval needed`}
                {eventType === 'preflight' && `Preflight check`}
                {eventType === 'done' && `Execution completed`}
                {eventType === 'assistant_reply' && (event.model ? `Reply via ${event.model}` : 'Assistant reply')}
              </p>
            </div>
            {hasDetails && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-gray-400 hover:text-gray-200 transition-colors p-1"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </div>

          {expanded && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
              {eventType === 'plan' && event.steps && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-2">Steps:</p>
                  <div className="space-y-1">
                    {event.steps.map((step, i) => (
                      <div key={i} className="text-xs text-gray-400">
                        {i + 1}. {getHumanToolLabel(step.toolId || step.goal, step.toolName)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {eventType === 'step_result' && event.result && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1">Result:</p>
                  <pre className="text-xs bg-black/30 rounded p-2 text-gray-300 overflow-x-auto max-h-40">
                    {formatResult(event.result)}
                  </pre>
                </div>
              )}

              {eventType === 'step_error' && event.error && (
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1">Error:</p>
                  <pre className="text-xs bg-red-500/10 rounded p-2 text-red-300 overflow-x-auto max-h-40">
                    {event.error}
                  </pre>
                </div>
              )}

              {eventType === 'approval_required' && (
                <div className="space-y-1">
                  {event.reason && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400">Reason:</p>
                      <p className="text-xs text-gray-300">{event.reason}</p>
                    </div>
                  )}
                  {event.affected_count && (
                    <p className="text-xs text-yellow-300">
                      ⚠️ Affects {event.affected_count} items
                    </p>
                  )}
                  {event.rollback_available && (
                    <p className="text-xs text-gray-400">✓ Rollback available</p>
                  )}
                </div>
              )}

              {eventType === 'assistant_reply' && event.reply && (
                <div>
                  <p className="text-sm text-gray-300">{event.reply}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AgentTimeline({
  events,
  isLoading = false,
  accentColor = 'blue',
}: AgentTimelineProps) {
  if (!events.length && !isLoading) {
    return (
      <div className="text-center py-12">
        <Info className="h-8 w-8 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-500">No events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, index) => (
        <EventCard key={index} event={event} index={index} />
      ))}

      {isLoading && (
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-8 w-8 rounded-full border-2 border-current text-blue-400 bg-blue-500/10">
              <Loader className="h-4 w-4 animate-spin" />
            </div>
          </div>
          <div className="flex-1 pb-6">
            <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
              <p className="text-sm text-gray-400">Processing...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
