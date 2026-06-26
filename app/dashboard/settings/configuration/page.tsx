"use client";

import { useEffect, useState } from "react";
import { Copy, Download, Check } from "lucide-react";

type ConfigFormat = "json" | "yaml" | "env";

export default function ConfigurationPage() {
  const [format, setFormat] = useState<ConfigFormat>("json");
  const [configContent, setConfigContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modelInfo, setModelInfo] = useState<{
    provider: string;
    model: string;
    supportedModels: string[];
  } | null>(null);
  const [selectedModel, setSelectedModel] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [configRes, modelRes] = await Promise.all([
          fetch(`/api/config/preview?format=${format}`, { cache: "no-store" }),
          fetch("/api/config/model-info", { cache: "no-store" }),
        ]);

        if (configRes.ok) {
          const config = await configRes.json();
          setConfigContent(config.content || "");
        }

        if (modelRes.ok) {
          const model = await modelRes.json();
          setModelInfo(model);
          setSelectedModel(model.model || "");
        }
      } catch (err) {
        console.error("Failed to load configuration:", err);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [format]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(configContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadConfig = () => {
    const element = document.createElement("a");
    const file = new Blob([configContent], {
      type:
        format === "json"
          ? "application/json"
          : format === "yaml"
            ? "text/yaml"
            : "text/plain",
    });
    element.href = URL.createObjectURL(file);
    element.download = `config.${format === "env" ? "example" : format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const updateModel = async (model: string) => {
    setSelectedModel(model);
    try {
      const res = await fetch("/api/config/set-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      if (res.ok) {
        // Reload config
        const configRes = await fetch(`/api/config/preview?format=${format}`, {
          cache: "no-store",
        });
        if (configRes.ok) {
          const config = await configRes.json();
          setConfigContent(config.content || "");
        }
      }
    } catch (err) {
      console.error("Failed to update model:", err);
    }
  };

  return (
    <main className="min-h-screen bg-[#07080b] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
            Configuration Management
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Configuration Settings
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            View and manage your DSG Control Plane configuration in multiple formats
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* Main Config View */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            {/* Format Selector */}
            <div className="mb-6">
              <p className="mb-3 text-sm font-semibold text-white">Configuration Format</p>
              <div className="flex gap-2">
                {["json", "yaml", "env"].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt as ConfigFormat)}
                    className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
                      format === fmt
                        ? "border-amber-400/40 bg-amber-400/[0.15] text-amber-300"
                        : "border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:border-white/15 hover:bg-white/[0.08]"
                    }`}
                  >
                    .{fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Config Content */}
            <div className="relative rounded-xl border border-white/[0.08] bg-black/30 p-4 font-mono text-xs">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 w-full animate-pulse rounded bg-white/10" />
                  ))}
                </div>
              ) : (
                <pre className="overflow-x-auto whitespace-pre-wrap break-words text-slate-300">
                  {configContent}
                </pre>
              )}

              {/* Copy Button */}
              <button
                onClick={copyToClipboard}
                className="absolute right-3 top-3 flex items-center gap-2 rounded-lg bg-emerald-400/[0.15] px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-400/25"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Download Button */}
            <button
              onClick={downloadConfig}
              className="mt-4 flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.08]"
            >
              <Download className="h-4 w-4" />
              Download Configuration
            </button>

            {/* Instructions */}
            <div className="mt-6 space-y-3 rounded-xl border border-blue-400/15 bg-blue-400/[0.03] p-4">
              <p className="text-sm font-semibold text-blue-200">How to use this configuration</p>
              <ol className="space-y-2 text-xs text-slate-300">
                <li>
                  <strong className="text-blue-300">1. Download</strong> the configuration file
                </li>
                <li>
                  <strong className="text-blue-300">2. Place</strong> it in your project root or{" "}
                  <code className="rounded bg-white/10 px-1 font-mono text-[10px]">./config/</code>
                </li>
                <li>
                  <strong className="text-blue-300">3. Set environment variable:</strong>
                  <code className="mt-1 block rounded bg-white/10 px-2 py-1 font-mono text-[10px]">
                    export DSG_CONFIG_PATH=./config/default.{format}
                  </code>
                </li>
                <li>
                  <strong className="text-blue-300">4. Start the app:</strong>
                  <code className="mt-1 block rounded bg-white/10 px-2 py-1 font-mono text-[10px]">
                    npm run dev
                  </code>
                </li>
              </ol>
            </div>
          </div>

          {/* Sidebar: Model Selector */}
          <div className="space-y-6">
            {/* AI Model Selector */}
            <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.03] p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-violet-300/60">
                AI Model
              </p>
              <p className="mb-3 text-sm font-semibold text-violet-50">Current Model</p>

              {modelInfo ? (
                <>
                  <div className="rounded-lg border border-violet-400/20 bg-black/30 px-3 py-2 font-mono text-xs text-violet-300 mb-4">
                    {modelInfo.model || "Not configured"}
                  </div>

                  <p className="mb-3 text-xs font-semibold text-slate-400">Available Models</p>
                  <div className="space-y-2">
                    {modelInfo.supportedModels.map((model) => (
                      <button
                        key={model}
                        onClick={() => updateModel(model)}
                        className={`w-full rounded-lg px-3 py-2 text-xs font-semibold transition-all text-left ${
                          selectedModel === model
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg border border-amber-400/15 bg-amber-400/[0.03] px-3 py-2 text-[10px] text-amber-200">
                    <p className="font-semibold">Provider: {modelInfo.provider}</p>
                    <p className="mt-1 text-amber-200/70">
                      Change your active model to update the configuration automatically
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500">Loading model info...</p>
              )}
            </div>

            {/* Quick Reference */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Quick Reference
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="font-semibold text-white">JSON</p>
                  <p className="text-slate-500">Structured, type-safe configuration</p>
                </div>
                <div>
                  <p className="font-semibold text-white">YAML</p>
                  <p className="text-slate-500">Human-readable hierarchical config</p>
                </div>
                <div>
                  <p className="font-semibold text-white">.env</p>
                  <p className="text-slate-500">Environment variable format</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-700 bg-black/30 px-3 py-2">
                <p className="font-mono text-[10px] text-slate-400">
                  Load priority:
                  <br />
                  1. Env vars (highest)
                  <br />
                  2. JSON/YAML
                  <br />
                  3. Defaults (lowest)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
