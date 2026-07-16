"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface Policy {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function MarkdocPoliciesPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPolicies() {
      try {
        const response = await fetch("/api/markdoc-policies", {
          method: "GET",
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Please log in to view policies");
            return;
          }
          throw new Error(`Failed to load policies: ${response.status}`);
        }

        const data = await response.json();
        setPolicies(data.policies || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load policies"
        );
      } finally {
        setLoading(false);
      }
    }

    loadPolicies();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <PageHeader
            title="Markdoc Policies"
            description="Create and manage markdown-based governance policies"
          />
          <Link
            href="/dashboard/markdoc-policies/new"
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            + Create Policy
          </Link>
        </div>

        {error && (
          <Card variant="error" className="mb-4">
            <p className="text-sm">{error}</p>
          </Card>
        )}

        {loading && (
          <div className="text-center text-slate-400 py-8">Loading policies...</div>
        )}

        {!loading && policies.length === 0 && !error && (
          <EmptyState
            title="No policies yet"
            description="Create your first Markdoc policy to get started"
            action={
              <Link
                href="/dashboard/markdoc-policies/new"
                className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Create Policy
              </Link>
            }
          />
        )}

        {!loading && policies.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">
                      Policy Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">
                      Version
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {policies.map((policy) => (
                    <tr key={policy.id} className="hover:bg-slate-900 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">
                          {policy.name}
                          {policy.is_default && (
                            <span className="ml-2 inline-block rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
                              Default
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {policy.description || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        v{policy.version}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            policy.status === "active"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : policy.status === "draft"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-slate-600/20 text-slate-300"
                          }`}
                        >
                          {policy.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {formatDate(policy.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/markdoc-policies/${policy.id}`
                            )
                          }
                          className="text-cyan-400 hover:text-cyan-300 transition"
                        >
                          View
                        </button>
                        <span className="mx-2 text-slate-600">|</span>
                        <button className="text-cyan-400 hover:text-cyan-300 transition">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
