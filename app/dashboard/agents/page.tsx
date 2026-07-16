"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, Badge } from "@/components/ui";
import { AgentCostCard } from "@/components/monitoring";

interface Agent {
  id: string;
  name: string;
  status: string;
  created_at: string;
  api_key_hash?: string;
  last_used_at?: string;
}

type RawAgent = Partial<Agent> & {
  agent_id?: string;
  agentId?: string;
};

function normalizeAgent(raw: RawAgent): Agent | null {
  const id = String(raw.id ?? raw.agent_id ?? raw.agentId ?? "").trim();
  if (!id || id === "undefined" || id === "null") return null;

  return {
    id,
    name: String(raw.name ?? id),
    status: String(raw.status ?? "active"),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    api_key_hash: raw.api_key_hash,
    last_used_at: raw.last_used_at,
  };
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAgents() {
      try {
        const response = await fetch("/api/agents", {
          method: "GET",
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Please log in to view agents");
            return;
          }
          throw new Error(`Failed to load agents: ${response.status}`);
        }

        const data = await response.json();
        const rawAgents = Array.isArray(data.agents) ? data.agents : Array.isArray(data.items) ? data.items : [];
        setAgents(rawAgents.map(normalizeAgent).filter(Boolean) as Agent[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agents");
      } finally {
        setLoading(false);
      }
    }

    loadAgents();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Agents</h1>
          <p className="mt-2 text-slate-400">
            Connect and manage agents in your organization
          </p>
        </div>
        <Link href="/dashboard/agents/connect">
          <Button className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-white hover:from-emerald-300 hover:to-cyan-400">
            + Connect Agent
          </Button>
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <Card variant="error">
          <p className="text-sm font-medium">Error loading agents</p>
          <p className="text-xs mt-1 opacity-90">{error}</p>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} variant="default">
              <div className="space-y-3">
                <div className="h-5 bg-slate-700 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-slate-700 rounded w-full animate-pulse" />
                <div className="h-3 bg-slate-700 rounded w-1/2 animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && agents.length === 0 && !error && (
        <Card variant="default" className="text-center py-12">
          <p className="text-slate-300 font-medium">No agents yet</p>
          <p className="mt-2 text-sm text-slate-400">
            Connect your first agent to get started
          </p>
          <Link href="/dashboard/agents/connect" className="mt-4 inline-block">
            <Button className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-white hover:from-emerald-300 hover:to-cyan-400">
              Connect Agent
            </Button>
          </Link>
        </Card>
      )}

      {/* Agents grid */}
      {!loading && agents.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} variant="default">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">{agent.id}</p>
                  </div>
                  <Badge variant={agent.status === "active" ? "success" : "default"}>
                    {agent.status}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">CREATED</p>
                    <p className="text-sm text-slate-300">{formatDate(agent.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">LAST USED</p>
                    <p className="text-sm text-slate-300">{formatTime(agent.last_used_at)}</p>
                  </div>
                </div>

                {/* Cost card */}
                <div className="pt-2 border-t border-white/10">
                  <AgentCostCard
                    agentId={agent.id}
                    dailyLimit={500}
                    monthlyLimit={10000}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => router.push(`/dashboard/agents/${encodeURIComponent(agent.id)}/permissions`)}
                    className="flex-1 text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  >
                    Permissions
                  </Button>
                  <Button
                    onClick={() => router.push(`/dashboard/agents/${encodeURIComponent(agent.id)}/settings`)}
                    className="flex-1 text-xs bg-slate-700 text-slate-200 hover:bg-slate-600"
                  >
                    Settings
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
