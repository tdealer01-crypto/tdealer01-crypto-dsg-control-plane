// components/dashboard/activity-feed.tsx
// Real-time Agent Activity Stream with SHA-256 audit trail

"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ActivityEntry {
  id: string;
  timestamp: string;
  agent: string;
  agentIcon: string;
  action: string;
  result: "ALLOW" | "BLOCK" | "SUCCESS" | "FAIL" | "RETRY";
  duration?: string;
  detail?: string;
  hash?: string;
}

const sampleActivities: ActivityEntry[] = [
  {
    id: "1",
    timestamp: "17:38:42",
    agent: "Policy Engine",
    agentIcon: "⚙️",
    action: "GPT-4 tool_call → file_write evaluation",
    result: "BLOCK",
    duration: "7.8ms",
    detail: "Policy P6-DELETE violated",
    hash: "0x7f3a...e2b1",
  },
  {
    id: "2",
    timestamp: "17:38:41",
    agent: "Revenue Agent",
    agentIcon: "💰",
    action: "customer_xyz → execution #67,241 metered",
    result: "SUCCESS",
    duration: "2ms",
    detail: "$0.001 recorded",
  },
  {
    id: "3",
    timestamp: "17:38:40",
    agent: "MCP Gateway",
    agentIcon: "🔌",
    action: "Route to Anthropic Claude 3.5",
    result: "SUCCESS",
    duration: "847ms",
    detail: "1,247 in / 892 out tokens",
  },
  {
    id: "4",
    timestamp: "17:38:39",
    agent: "Security Agent",
    agentIcon: "🔒",
    action: "Hash chain extended → block #194,847",
    result: "SUCCESS",
    duration: "1ms",
    hash: "0x9c2d...f4a8",
  },
  {
    id: "5",
    timestamp: "17:38:37",
    agent: "Policy Engine",
    agentIcon: "⚙️",
    action: "Claude tool_call → api_request evaluation",
    result: "ALLOW",
    duration: "8.1ms",
    detail: "Policy P5-NETWORK passed",
    hash: "0x3e7b...c9d2",
  },
];

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityEntry[]>(sampleActivities);
  const feedRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log" },
        (payload) => {
          const newEntry: ActivityEntry = {
            id: payload.new.id,
            timestamp: new Date(payload.new.created_at).toLocaleTimeString(
              "en-US",
              { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }
            ),
            agent: payload.new.agent_name,
            agentIcon: payload.new.agent_icon,
            action: payload.new.action_description,
            result: payload.new.result,
            duration: payload.new.duration_ms ? `${payload.new.duration_ms}ms` : undefined,
            detail: payload.new.detail,
            hash: payload.new.sha256_hash?.slice(0, 10),
          };

          setActivities((prev) => [newEntry, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [activities, autoScroll]);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Real-Time Agent Activity
        </h2>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              "text-xs px-2 py-1 rounded",
              autoScroll
                ? "bg-blue-50 text-blue-600"
                : "bg-gray-50 text-gray-500"
            )}
          >
            {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          </button>
        </div>
      </div>

      <div
        ref={feedRef}
        className="max-h-[400px] overflow-y-auto"
        aria-live="polite"
        aria-label="Agent activity feed"
      >
        {activities.map((entry) => (
          <ActivityRow key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
      <span className="text-xs font-mono text-gray-400 min-w-[60px] pt-0.5">
        {entry.timestamp}
      </span>

      <span className="text-base" aria-hidden="true">
        {entry.agentIcon}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900 dark:text-white truncate">
            {entry.action}
          </span>
        </div>
        {entry.detail && (
          <span className="text-xs text-gray-500">{entry.detail}</span>
        )}
      </div>

      <ResultBadge result={entry.result} />

      {entry.duration && (
        <span className="text-xs text-gray-400 min-w-[50px] text-right">
          {entry.duration}
        </span>
      )}
    </div>
  );
}

function ResultBadge({
  result,
}: {
  result: "ALLOW" | "BLOCK" | "SUCCESS" | "FAIL" | "RETRY";
}) {
  const badgeStyles = {
    ALLOW: "bg-green-100 text-green-700",
    BLOCK: "bg-red-100 text-red-700",
    SUCCESS: "bg-blue-100 text-blue-700",
    FAIL: "bg-red-100 text-red-700",
    RETRY: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full min-w-[56px] text-center ${badgeStyles[result]}`}
    >
      {result}
    </span>
  );
}
