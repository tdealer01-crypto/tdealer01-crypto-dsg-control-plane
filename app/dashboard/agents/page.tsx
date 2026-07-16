"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AgentCostCard } from "@/components/monitoring";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/Skeleton";

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
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="ตัวแทน"
          description="เชื่อมต่อและจัดการตัวแทนในองค์กรของคุณ"
          actions={
            <Link href="/dashboard/agents/connect">
              <Button variant="primary">+ เชื่อมต่อตัวแทน</Button>
            </Link>
          }
        />

        {error && (
          <Card variant="error" className="mb-6">
            {error}
          </Card>
        )}

        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        )}

        {!loading && agents.length === 0 && !error && (
          <EmptyState
            title="ยังไม่มีตัวแทน"
            description="เชื่อมต่อตัวแทนแรกของคุณเพื่อเริ่มต้น"
            action={
              <Link href="/dashboard/agents/connect">
                <Button variant="primary">เชื่อมต่อตัวแทน</Button>
              </Link>
            }
          />
        )}

        {!loading && agents.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.id} variant="default">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-400">{agent.id}</p>
                  </div>
                  <Badge
                    variant={agent.status === "active" ? "success" : "default"}
                  >
                    {agent.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-gray-400">
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      สร้าง
                    </p>
                    <p>{formatDate(agent.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      ใช้งานล่าสุด
                    </p>
                    <p>{formatTime(agent.last_used_at)}</p>
                  </div>
                </div>

                <div className="mt-6 mb-6">
                  <AgentCostCard
                    agentId={agent.id}
                    dailyLimit={500}
                    monthlyLimit={10000}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/dashboard/agents/${encodeURIComponent(agent.id)}/permissions`)}
                    className="flex-1"
                  >
                    สิทธิ์
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/dashboard/agents/${encodeURIComponent(agent.id)}/settings`)}
                    className="flex-1"
                  >
                    การตั้งค่า
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
