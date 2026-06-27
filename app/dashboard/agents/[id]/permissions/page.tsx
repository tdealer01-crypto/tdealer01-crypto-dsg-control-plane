"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const AVAILABLE_PERMISSIONS = [
  {
    id: "org.execute",
    name: "Execute Actions",
    description: "Run and execute agent actions",
    category: "core",
  },
  {
    id: "org.manage_agents",
    name: "Manage Agents",
    description: "Create, edit, and manage agents",
    category: "admin",
  },
  {
    id: "org.manage_api_keys",
    name: "Manage API Keys",
    description: "Create and revoke API keys",
    category: "admin",
  },
  {
    id: "org.manage_policies",
    name: "Manage Policies",
    description: "Create, edit, and delete policies",
    category: "admin",
  },
  {
    id: "org.view_reports",
    name: "View Reports",
    description: "View execution reports and analytics",
    category: "view",
  },
  {
    id: "org.view_evidence",
    name: "View Evidence",
    description: "View audit logs and compliance evidence",
    category: "view",
  },
];

function normalizeParamId(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = String(raw ?? "").trim();
  if (!id || id === "undefined" || id === "null") return "";
  return id;
}

export default function PermissionsPage() {
  const params = useParams();
  const agentId = normalizeParamId(params.id);

  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    async function loadPermissions() {
      if (!agentId) {
        setError("Invalid agent id. Go back to Agents and open Permissions from a real agent card.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/agents/${encodeURIComponent(agentId)}/permissions`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || `Failed to load permissions: ${response.status}`);
        }

        setPermissions(Array.isArray(data.permissions) ? data.permissions : []);
        if (data.warning) {
          setWarning(String(data.warning));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load permissions"
        );
      } finally {
        setLoading(false);
      }
    }

    loadPermissions();
  }, [agentId]);

  const togglePermission = (permissionId: string) => {
    setPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((permission) => permission !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSave = async () => {
    if (!agentId) {
      setError("Invalid agent id. Go back to Agents and open Permissions from a real agent card.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(agentId)}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permissions,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to save permissions");
      }

      setPermissions(Array.isArray(data.permissions) ? data.permissions : permissions);
      setSuccess("Permissions updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce(
    (acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    },
    {} as Record<string, typeof AVAILABLE_PERMISSIONS>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/dashboard/agents"
            className="text-sm text-blue-600 hover:text-blue-900"
          >
            ← Back to Agents
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Agent Permissions
          </h1>
          <p className="mt-2 text-gray-600">
            Control what this agent can do
          </p>
          {agentId && <p className="mt-1 font-mono text-xs text-gray-400">{agentId}</p>}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {warning && !error && (
          <div className="mb-4 rounded-lg bg-amber-50 p-4 text-amber-800">
            Warning: {warning}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-800">
            {success}
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-600">
            Loading permissions...
          </div>
        )}

        {!loading && (
          <div className="space-y-8">
            {Object.entries(groupedPermissions).map(
              ([category, perms]) => (
                <div key={category}>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">
                    {category === "core" && "Core Capabilities"}
                    {category === "admin" && "Administrative"}
                    {category === "view" && "Viewing & Reporting"}
                  </h2>

                  <div className="space-y-3">
                    {perms.map((perm) => (
                      <div
                        key={perm.id}
                        className="rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={permissions.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            disabled={!agentId}
                            className="mt-1 h-4 w-4 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {perm.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {perm.description}
                            </p>
                            <p className="mt-1 font-mono text-xs text-gray-500">
                              {perm.id}
                            </p>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h3 className="font-semibold text-blue-900">
                Granted Permissions ({permissions.length})
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {permissions.length > 0 ? (
                  permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                    >
                      {perm}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-blue-700">No permissions granted</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving || !agentId}
                className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Permissions"}
              </button>
              <Link
                href="/dashboard/agents"
                className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-gray-900 hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
