"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Check } from "lucide-react";

type WizardStep = "format" | "model" | "supabase" | "stripe" | "complete";

export function ConfigWizard() {
  const [step, setStep] = useState<WizardStep>("format");
  const [configFormat, setConfigFormat] = useState<"env" | "json" | "yaml">("env");
  const [selectedModel, setSelectedModel] = useState("claude-3-5-sonnet-20241022");
  const [loading, setLoading] = useState(false);

  const models = [
    {
      id: "claude-3-5-sonnet-20241022",
      name: "Claude 3.5 Sonnet",
      provider: "Anthropic",
      desc: "Best for complex reasoning — recommended for governance",
      window: "200K tokens",
    },
    {
      id: "claude-3-opus-20250219",
      name: "Claude 3 Opus",
      provider: "Anthropic",
      desc: "Most capable model for advanced tasks",
      window: "200K tokens",
    },
    {
      id: "claude-3-5-haiku-20241022",
      name: "Claude 3.5 Haiku",
      provider: "Anthropic",
      desc: "Fast and efficient for simple decisions",
      window: "200K tokens",
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "OpenAI",
      desc: "Multimodal reasoning (requires OpenAI key)",
      window: "128K tokens",
    },
  ];

  const handleNext = async () => {
    if (step === "format") {
      setStep("model");
    } else if (step === "model") {
      setLoading(true);
      try {
        await fetch("/api/config/set-model", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selectedModel }),
        });
      } catch (err) {
        console.error("Failed to set model:", err);
      } finally {
        setLoading(false);
        setStep("supabase");
      }
    } else if (step === "supabase") {
      setStep("stripe");
    } else if (step === "stripe") {
      setStep("complete");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-8">
        {/* Progress bar */}
        <div className="mb-8 flex gap-2">
          {["format", "model", "supabase", "stripe", "complete"].map((s, i) => (
            <div key={s} className="flex-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  ["format", "model", "supabase", "stripe", "complete"].indexOf(step) >= i
                    ? "bg-amber-400"
                    : "bg-white/10"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Step 1: Configuration Format */}
        {step === "format" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Choose Configuration Format
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Select how you want to manage your configuration
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: "env",
                  name: ".env",
                  desc: "Environment variables (fastest to set up)",
                },
                {
                  id: "json",
                  name: "JSON",
                  desc: "Structured, type-safe configuration",
                },
                {
                  id: "yaml",
                  name: "YAML",
                  desc: "Human-readable hierarchical format",
                },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setConfigFormat(fmt.id as "env" | "json" | "yaml")}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    configFormat === fmt.id
                      ? "border-amber-400/40 bg-amber-400/[0.08]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <p className="font-semibold text-white">{fmt.name}</p>
                  <p className="text-xs text-slate-400">{fmt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: AI Model Selection */}
        {step === "model" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Select AI Model
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Choose the model for your Hermes AI runtime
              </p>
            </div>

            <div className="space-y-3">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedModel === model.id
                      ? "border-violet-400/40 bg-violet-400/[0.08]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white">{model.name}</p>
                      <p className="text-xs text-slate-500">{model.provider}</p>
                      <p className="mt-1 text-xs text-slate-400">{model.desc}</p>
                    </div>
                    <span className="rounded-lg bg-white/10 px-2 py-1 font-mono text-[10px] text-slate-400">
                      {model.window}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Supabase */}
        {step === "supabase" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Set up Supabase
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Configure your database and authentication
              </p>
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                    1
                  </span>
                  <span className="text-slate-300">
                    Go to <code className="font-mono text-xs">https://supabase.com</code>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                    2
                  </span>
                  <span className="text-slate-300">Create or select a project</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                    3
                  </span>
                  <span className="text-slate-300">
                    Copy the URL and keys to your <code className="font-mono text-xs">.env.local</code>
                  </span>
                </li>
              </ol>
            </div>

            <Link
              href="https://supabase.com"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/20"
            >
              Open Supabase Dashboard
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Step 4: Stripe */}
        {step === "stripe" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Set up Stripe (optional)
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Enable billing and metered usage for your agents
              </p>
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 rounded-full bg-blue-400/20 px-2.5 py-0.5 text-xs font-bold text-blue-300">
                    1
                  </span>
                  <span className="text-slate-300">
                    Create a Stripe account at <code className="font-mono text-xs">stripe.com</code>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 rounded-full bg-blue-400/20 px-2.5 py-0.5 text-xs font-bold text-blue-300">
                    2
                  </span>
                  <span className="text-slate-300">
                    Install the DSG Governance Gate app from the Stripe App Marketplace
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 rounded-full bg-blue-400/20 px-2.5 py-0.5 text-xs font-bold text-blue-300">
                    3
                  </span>
                  <span className="text-slate-300">
                    Copy API keys to <code className="font-mono text-xs">.env.local</code>
                  </span>
                </li>
              </ol>
            </div>

            <Link
              href="https://stripe.com"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-400/20"
            >
              Open Stripe Dashboard
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === "complete" && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/20">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">
                Configuration Complete!
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Your DSG Control Plane is ready to go
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-sm font-semibold text-white">Next steps:</p>
              <ul className="space-y-1 text-xs text-slate-400">
                <li>✓ Restart your development server</li>
                <li>✓ Go to the dashboard to create your first API key</li>
                <li>✓ Make your first gated request</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex gap-3">
          {step !== "format" && (
            <button
              onClick={() => {
                const steps: WizardStep[] = [
                  "format",
                  "model",
                  "supabase",
                  "stripe",
                ];
                const currentIndex = steps.indexOf(step);
                if (currentIndex > 0) {
                  setStep(steps[currentIndex - 1]);
                }
              }}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-semibold text-slate-300 hover:border-white/20"
            >
              Back
            </button>
          )}

          {step !== "complete" ? (
            <button
              onClick={handleNext}
              disabled={loading}
              className="ml-auto flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 transition-all hover:bg-amber-300 disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Next"}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-300"
            >
              Go to Dashboard
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
