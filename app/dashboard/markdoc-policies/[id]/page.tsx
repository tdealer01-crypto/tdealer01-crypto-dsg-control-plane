"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Markdoc from "@markdoc/markdoc";
import config from "@/markdoc.config";
import {
  Document,
  Heading,
  Paragraph,
  PolicyRule,
  GateEvaluator,
  Alert,
} from "@/lib/markdoc/components";

interface Policy {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: string;
  is_default: boolean;
  content_hash: string;
  policy_hash: string;
  created_at: string;
  updated_at: string;
}

const componentMap = {
  Document,
  Heading,
  Paragraph,
  PolicyRule,
  GateEvaluator,
  Alert,
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-3xl font-bold text-gray-900">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="mt-6 text-2xl font-bold text-gray-800">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="mt-4 text-xl font-semibold text-gray-800">{children}</h3>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mt-2 text-gray-700">{children}</p>
  ),
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a href={href} className="text-blue-600 hover:underline">
      {children}
    </a>
  ),
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-900">
      {children}
    </code>
  ),
  pre: ({ children }: { children: React.ReactNode }) => (
    <pre className="overflow-auto rounded-lg bg-gray-100 p-4 text-sm">
      {children}
    </pre>
  ),
};

function renderNode(node: any): React.ReactNode {
  if (!node) return null;
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map((n, i) => <div key={i}>{renderNode(n)}</div>);

  const Component = (componentMap as any)[node.name || node.type];
  if (!Component) return null;

  return (
    <Component key={node.id} {...node.attributes}>
      {node.children && node.children.map((child: any) => renderNode(child))}
    </Component>
  );
}

export default function PolicyPage() {
  const router = useRouter();
  const params = useParams();
  const policyId = params.id as string;

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [rendered, setRendered] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"rendered" | "markdown">(
    "rendered"
  );

  useEffect(() => {
    async function loadPolicy() {
      try {
        const response = await fetch(`/api/markdoc-policies/${policyId}`);

        if (!response.ok) {
          throw new Error(`Failed to load policy: ${response.status}`);
        }

        const data = await response.json();
        setPolicy(data.policy);
        setMarkdown(data.markdown_content);

        // Render markdown
        try {
          const ast = Markdoc.parse(data.markdown_content);
          const transformed = Markdoc.transform(ast, config);
          setRendered(transformed);
        } catch (renderErr) {
          console.error("Render error:", renderErr);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load policy"
        );
      } finally {
        setLoading(false);
      }
    }

    if (policyId) {
      loadPolicy();
    }
  }, [policyId]);

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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/markdoc-policies"
            className="text-sm text-blue-600 hover:text-blue-900"
          >
            ← Back to Policies
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
          <div className="text-center text-gray-600">Loading policy...</div>
        )}

        {/* Policy View */}
        {!loading && policy && (
          <div className="space-y-6">
            {/* Policy Header */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {policy.name}
                  </h1>
                  {policy.description && (
                    <p className="mt-2 text-gray-600">{policy.description}</p>
                  )}
                </div>
                <div className="text-right">
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
                  {policy.is_default && (
                    <span className="ml-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                      Default
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-medium text-gray-500">VERSION</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    v{policy.version}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">CREATED</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(policy.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">UPDATED</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(policy.updated_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    CONTENT HASH
                  </p>
                  <p className="mt-1 font-mono text-xs text-gray-700">
                    {policy.content_hash.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab("rendered")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "rendered"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Rendered
                </button>
                <button
                  onClick={() => setActiveTab("markdown")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "markdown"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Markdown
                </button>
              </div>
            </div>

            {/* Content */}
            {activeTab === "rendered" && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="prose prose-sm max-w-none">
                  {rendered ? (
                    renderNode(rendered)
                  ) : (
                    <p className="text-gray-600">Unable to render policy</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "markdown" && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <pre className="overflow-auto rounded-lg bg-gray-50 p-4 font-mono text-sm">
                  {markdown}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
                Edit
              </button>
              <button className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-gray-900 hover:bg-gray-50">
                Duplicate
              </button>
              <button className="rounded-lg border border-red-300 bg-red-50 px-6 py-2 text-red-900 hover:bg-red-100">
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
