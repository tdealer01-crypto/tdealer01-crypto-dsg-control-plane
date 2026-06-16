"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const AGENT_TYPES = [
  {
    id: "claude",
    name: "Claude",
    description: "Use Claude API with MCP",
    icon: "🔷",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "Use OpenAI API with custom integration",
    icon: "🟢",
  },
  {
    id: "custom",
    name: "Custom API",
    description: "Any agent with REST API",
    icon: "⚙️",
  },
  {
    id: "mcp",
    name: "MCP Server",
    description: "Model Context Protocol compatible",
    icon: "🔗",
  },
];

export default function ConnectAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "config" | "verify">("select");
  const [selectedType, setSelectedType] = useState("");
  const [agentConfig, setAgentConfig] = useState({
    name: "",
    agentType: "",
    apiEndpoint: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scopedToken, setScopedToken] = useState("");

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    setAgentConfig((prev) => ({ ...prev, agentType: typeId }));
    setStep("config");
  };

  const handleConfigChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setAgentConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!agentConfig.name.trim()) {
        throw new Error("Agent name is required");
      }

      // Call backend to create agent and generate scoped token
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: agentConfig.name.trim(),
          agent_type: agentConfig.agentType,
          api_endpoint: agentConfig.apiEndpoint || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to connect agent");
      }

      const data = await response.json();
      setScopedToken(data.api_key || "");
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect agent");
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(scopedToken);
    alert("Token copied to clipboard!");
  };

  const handleFinish = () => {
    router.push("/dashboard/agents");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/agents"
            className="text-sm text-blue-600 hover:text-blue-900"
          >
            ← Back to Agents
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Connect Agent
          </h1>
          <p className="mt-2 text-gray-600">
            {step === "select" && "Choose your agent type"}
            {step === "config" && "Configure your agent"}
            {step === "verify" && "Integration complete"}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Step 1: Select Type */}
        {step === "select" && (
          <div className="space-y-4">
            {AGENT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                className="w-full rounded-lg border-2 border-gray-200 bg-white p-6 text-left hover:border-blue-500 hover:bg-blue-50"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{type.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{type.name}</h3>
                    <p className="text-sm text-gray-600">
                      {type.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Configure */}
        {step === "config" && (
          <form onSubmit={handleConnect} className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <label className="block text-sm font-medium text-gray-900">
                Agent Name *
              </label>
              <input
                type="text"
                name="name"
                value={agentConfig.name}
                onChange={handleConfigChange}
                placeholder="e.g., Research Agent"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {agentConfig.agentType === "custom" && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <label className="block text-sm font-medium text-gray-900">
                  API Endpoint
                </label>
                <input
                  type="url"
                  name="apiEndpoint"
                  value={agentConfig.apiEndpoint}
                  onChange={handleConfigChange}
                  placeholder="https://your-agent-api.com/v1/chat"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep("select")}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-gray-900 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Connecting..." : "Connect Agent"}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Verification */}
        {step === "verify" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
              <h2 className="text-lg font-semibold text-green-900">
                ✅ Agent Connected!
              </h2>
              <p className="mt-2 text-green-800">
                Your agent has been successfully registered with DSG.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900">
                Your Scoped Token
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Use this token to authorize your agent with DSG. Keep it secret!
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={scopedToken}
                  readOnly
                  className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 font-mono text-sm"
                />
                <button
                  onClick={handleCopyToken}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h3 className="font-semibold text-blue-900">Next Steps</h3>
              <ul className="mt-3 space-y-2 text-sm text-blue-800">
                <li>✓ Configure your agent with the token above</li>
                <li>✓ Set agent permissions</li>
                <li>✓ Select a default policy</li>
                <li>✓ Start using your agent</li>
              </ul>
            </div>

            <button
              onClick={handleFinish}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Go to Agents
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
