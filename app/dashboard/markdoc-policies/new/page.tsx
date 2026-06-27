"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TEMPLATE = `# My Policy

## Rules

{% PolicyRule type="allow" condition="confidence >= 0.90" resource="user_data" action="read" /%}

Allow read access when confidence is 90% or higher.

{% PolicyRule type="review" condition="confidence >= 0.75 AND confidence < 0.90" resource="user_data" action="modify" /%}

Require manual review for modifications when confidence is 75-90%.

{% PolicyRule type="block" condition="confidence < 0.75" resource="sensitive_data" /%}

Block all actions on sensitive data with low confidence.

## Alert

{% Alert type="info" title="Policy Info" %}
This is your policy documentation
{% /Alert %}
`;

export default function CreatePolicyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    markdown_content: TEMPLATE,
    is_default: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        setError("Policy name is required");
        return;
      }

      if (!formData.markdown_content.trim()) {
        setError("Policy content is required");
        return;
      }

      const response = await fetch("/api/markdoc-policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          markdown_content: formData.markdown_content,
          is_default: formData.is_default,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to create policy (${response.status})`);
      }

      const data = await response.json();
      router.push(`/dashboard/markdoc-policies/${data.policy_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create policy");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/markdoc-policies"
            className="text-sm text-blue-600 hover:text-blue-900"
          >
            ← Back to Policies
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Create New Policy
          </h1>
          <p className="mt-2 text-gray-600">
            Write a markdown-based policy using Markdoc components
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Policy Name */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <label className="block text-sm font-medium text-gray-900">
              Policy Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Agent Execution Policy"
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Description */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <label className="block text-sm font-medium text-gray-900">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What does this policy do?"
              rows={3}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Markdown Content */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-900">
                Policy Markdown *
              </label>
              <button
                type="button"
                onClick={() => setPreview(!preview)}
                className="text-sm text-blue-600 hover:text-blue-900"
              >
                {preview ? "Edit" : "Preview"}
              </button>
            </div>

            {!preview ? (
              <textarea
                name="markdown_content"
                value={formData.markdown_content}
                onChange={handleChange}
                placeholder="Write your policy in Markdown with Markdoc components..."
                rows={20}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                required
              />
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-600">
                    Preview rendering not yet implemented. Save to see rendered
                    output.
                  </p>
                  <pre className="overflow-auto bg-gray-100 p-4 text-xs">
                    {formData.markdown_content}
                  </pre>
                </div>
              </div>
            )}

            <p className="mt-3 text-xs text-gray-500">
              Supported Markdoc components: {"{"}%PolicyRule%{"}"},{" "}
              {"{"}%GateEvaluator%{"}"}, {"{"}%Alert%{"}"}
            </p>
          </div>

          {/* Default Policy Checkbox */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_default"
                checked={formData.is_default}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="ml-3 text-sm text-gray-700">
                Make this the default policy for new agents
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Policy"}
            </button>
            <Link
              href="/dashboard/markdoc-policies"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-gray-900 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Help Section */}
        <div className="mt-12 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="font-semibold text-blue-900">Markdoc Components</h2>
          <div className="mt-4 space-y-4 text-sm text-blue-800">
            <div>
              <p className="font-medium">PolicyRule</p>
              <code className="block bg-blue-100 p-2 font-mono text-xs">
                {"{"}%PolicyRule type=&quot;allow&quot; condition=&quot;...&quot; /%{"}"}
              </code>
            </div>
            <div>
              <p className="font-medium">Alert</p>
              <code className="block bg-blue-100 p-2 font-mono text-xs">
                {"{"}%Alert type=&quot;info&quot; title=&quot;...&quot; %{"}"}...{"{"}/%Alert%{"}"}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
