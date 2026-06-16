"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Markdoc Policies
            </h1>
            <p className="mt-2 text-gray-600">
              Create and manage markdown-based governance policies
            </p>
          </div>
          <Link
            href="/dashboard/markdoc-policies/new"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + Create Policy
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
          <div className="text-center text-gray-600">Loading policies...</div>
        )}

        {/* Empty state */}
        {!loading && policies.length === 0 && !error && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-600">No policies yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Create your first Markdoc policy to get started
            </p>
            <Link
              href="/dashboard/markdoc-policies/new"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Create Policy
            </Link>
          </div>
        )}

        {/* Policies table */}
        {!loading && policies.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Policy Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {policy.name}
                        {policy.is_default && (
                          <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {policy.description || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      v{policy.version}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          policy.status === "active"
                            ? "bg-green-100 text-green-800"
                            : policy.status === "draft"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {policy.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(policy.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() =>
                          router.push(
                            `/dashboard/markdoc-policies/${policy.id}`
                          )
                        }
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        View
                      </button>
                      <span className="mx-2 text-gray-300">|</span>
                      <button className="text-blue-600 hover:text-blue-900 hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
