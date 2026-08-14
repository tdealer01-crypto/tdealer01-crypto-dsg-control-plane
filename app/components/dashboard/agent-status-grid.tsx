// components/dashboard/agent-status-grid.tsx
// Real-time Agent Fleet Status with health indicators

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AgentHealth {
  id: string;
  name: string;
  icon: string;
  role: string;
  status: "active" | "degraded" | "offline";
  uptime: string;
  lastAction: string;
  actionsToday: number;
  indicators: { label: string; value: string; ok: boolean }[];
}

const initialAgents: AgentHealth[] = [
  {
    id: "policy-engine",
    name: "Policy Engine",
    icon: "⚙️",
    role: "AI Governance Designer",
    status: "active",
    uptime: "99.99%",
    lastAction: "2s ago",
    actionsToday: 3847,
    indicators: [
      { label: "Latency", value: "8.42ms", ok: true },
      { label: "Determinism", value: "100%", ok: true },
      { label: "Z3 Status", value: "Operational", ok: true },
    ],
  },
  {
    id: "revenue-agent",
    name: "Revenue Agent",
    icon: "💰",
    role: "Automated Revenue Manager",
    status: "active",
    uptime: "99.95%",
    lastAction: "45s ago",
    actionsToday: 156,
    indicators: [
      { label: "Stripe Sync", value: "Connected", ok: true },
      { label: "Retry Queue", value: "2 pending", ok: true },
      { label: "MRR", value: "$4,280", ok: true },
    ],
  },
  {
    id: "security-agent",
    name: "Security Agent",
    icon: "🔒",
    role: "Autonomous Security Guardian",
    status: "active",
    uptime: "100%",
    lastAction: "1s ago",
    actionsToday: 7694,
    indicators: [
      { label: "Hash Chain", value: "Intact", ok: true },
      { label: "RLS", value: "Enforced", ok: true },
      { label: "VOLT", value: "Compliant", ok: true },
    ],
  },
  {
    id: "mcp-gateway",
    name: "MCP Gateway",
    icon: "🔌",
    role: "AI Provider Router",
    status: "active",
    uptime: "99.97%",
    lastAction: "3s ago",
    actionsToday: 3847,
    indicators: [
      { label: "OpenAI", value: "200 OK", ok: true },
      { label: "Anthropic", value: "200 OK", ok: true },
      { label: "Bedrock", value: "200 OK", ok: true },
    ],
  },
  {
    id: "customer-success",
    name: "Customer Success",
    icon: "📈",
    role: "Automated Growth & Retention",
    status: "active",
    uptime: "99.9%",
    lastAction: "12m ago",
    actionsToday: 28,
    indicators: [
      { label: "Onboarding", value: "2 active", ok: true },
      { label: "Churn Alerts", value: "0", ok: true },
      { label: "Expansion", value: "5 signals", ok: true },
    ],
  },
];

export function AgentStatusGrid() {
  const [agents, setAgents] = useState<AgentHealth[]>(initialAgents);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("agent-health")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "agent_status" },
        (payload) => {
          setAgents((prev) =>
            prev.map((agent) =>
              agent.id === payload.new.agent_id
                ? {
                    ...agent,
                    status: payload.new.status,
                    lastAction: "just now",
                    actionsToday: payload.new.actions_today,
                  }
                : agent
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Agent Fleet Status
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}

function AgentCard({ agent }: { agent: AgentHealth }) {
  const borderStyles = {
    active: "border-green-200 dark:border-green-800",
    degraded: "border-yellow-200 dark:border-yellow-800",
    offline: "border-red-200 dark:border-red-800",
  };

  return (
    <div
      className={`relative p-4 bg-white dark:bg-gray-800 rounded-xl border transition-all hover:shadow-md ${borderStyles[agent.status]}`}
    >
      {/* Status Indicator */}
      <div className="absolute top-3 right-3">
        <StatusDot status={agent.status} />
      </div>

      {/* Agent Info */}
      <div className="text-2xl mb-2" aria-hidden="true">
        {agent.icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {agent.name}
      </h3>
      <p className="text-xs text-gray-500 mb-3">{agent.role}</p>

      {/* Metrics */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Uptime</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {agent.uptime}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Last Action</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {agent.lastAction}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Today</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {agent.actionsToday.toLocaleString()} actions
          </span>
        </div>
      </div>

      {/* Health Indicators */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-2 space-y-1">
        {agent.indicators.map((indicator) => (
          <div
            key={indicator.label}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-gray-400">{indicator.label}</span>
            <span
              className={`font-medium ${indicator.ok ? "text-green-600" : "text-red-600"}`}
            >
              {indicator.value} {indicator.ok ? "✓" : "✗"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "active" | "degraded" | "offline" }) {
  return (
    <span className="relative flex h-3 w-3" aria-label={`Status: ${status}`}>
      {status === "active" && (
        <>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </>
      )}
      {status === "degraded" && (
        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
      )}
      {status === "offline" && (
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
      )}
    </span>
  );
}
