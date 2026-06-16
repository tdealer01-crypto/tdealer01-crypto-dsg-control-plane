"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  status: string;
  created_at: string;
  api_key_hash?: string;
  last_used_at?: string;
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
        setAgents(data.agents || data.items || []);
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
            <p className="mt-2 text-gray-600">
              Connect and manage agents in your organization
            </p>
          </div>
          <Link
            href="/dashboard/agents/connect"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + Connect Agent
          </Link>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center text-gray-600">Loading agents...</div>
        )}

        {/* Empty state */}
        {!loading && agents.length === 0 && !error && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-600">No agents yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Connect your first agent to get started
            </p>
            <Link
              href="/dashboard/agents/connect"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Connect Agent
            </Link>
          </div>
        )}

        {/* Agents Grid */}
        {!loading && agents.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-lg border border-gray-200 bg-white p-6 hover:border-blue-300"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-500">{agent.id}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      agent.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>

                {/* Agent Details */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      CREATED
                    </p>
                    <p>{formatDate(agent.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      LAST USED
                    </p>
                    <p>{formatTime(agent.last_used_at)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() =>
                      router.push(`/dashboard/agents/${agent.id}/permissions`)
                    }
                    className="flex-1 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
                  >
                    Permissions
                  </button>
                  <button
                    onClick={() =>
                      router.push(`/dashboard/agents/${agent.id}/settings`)
                    }
                    className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Settings
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
