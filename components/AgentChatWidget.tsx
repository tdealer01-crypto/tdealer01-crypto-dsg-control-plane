"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { parseSseData, formatAgentEventMessage } from "../lib/agent/chat-event";

type ChatLine = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

type RouteQaResult = {
  ok?: boolean;
  mode?: string;
  summary?: { total?: number; passed?: number; failed?: number };
  results?: Array<{
    path?: string;
    ok?: boolean;
    status?: number;
    title?: string;
    latencyMs?: number;
  }>;
  truthBoundary?: string;
  error?: string;
};

const MAX_HISTORY = 100;
const AGENT_CHAT_ENDPOINT = "/api/agent-chat-v2";
const CODEX_ENDPOINT = "/api/dsg-bridge/codex";

const PAGE_SUGGESTIONS: Record<string, { label: string; prompt: string }[]> = {
  "/dashboard": [{ label: "Check readiness", prompt: "check readiness" }],
  "/dashboard/agents": [
    { label: "Create agent", prompt: "create agent" },
    { label: "List agents", prompt: "list agents" },
    { label: "Create chatbot", prompt: 'create chatbot "Support Bot"' },
  ],
  "/dashboard/policies": [{ label: "List policies", prompt: "list policies" }],
  "/dashboard/executions": [{ label: "Check audit", prompt: "audit lineage" }],
  "/dashboard/billing": [{ label: "Check capacity", prompt: "check capacity" }],
  "/dashboard/capacity": [{ label: "Check quota", prompt: "check capacity" }],
  "/dashboard/skills": [{ label: "Run auto-setup", prompt: "run auto_setup" }],
  "/dashboard/operations": [
    { label: "Audit lineage", prompt: "audit lineage" },
  ],
};

function makeLine(role: ChatLine["role"], content: string): ChatLine {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
  };
}

function formatRouteQa(result: RouteQaResult) {
  if (result.error) return `Route QA failed: ${result.error}`;

  const summary = result.summary;
  const header = result.ok
    ? `✅ Route QA passed: ${summary?.passed ?? 0}/${summary?.total ?? 0} page(s)`
    : `⚠️ Route QA found issues: ${summary?.failed ?? 0}/${summary?.total ?? 0} failed`;

  const rows = (result.results || [])
    .map((row) => {
      const state = row.ok ? "PASS" : "FAIL";
      return `${state} ${row.path || "-"} • HTTP ${row.status ?? "-"} • ${row.latencyMs ?? "-"}ms${row.title ? ` • ${row.title}` : ""}`;
    })
    .join("\n");

  return [
    header,
    rows,
    result.truthBoundary ? `Boundary: ${result.truthBoundary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function AgentChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [qaBusy, setQaBusy] = useState(false);
  const [useCodex, setUseCodex] = useState(false);
  const [codexResponseId, setCodexResponseId] = useState<string | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([
    makeLine(
      "system",
      "DSG Agent v2 ready — plan first, approve before execution. Page QA buttons check real routes.",
    ),
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines]);

  const suggestions = useMemo(() => {
    return PAGE_SUGGESTIONS[pathname] || PAGE_SUGGESTIONS["/dashboard"] || [];
  }, [pathname]);

  async function runRouteQa(all: boolean) {
    if (qaBusy) return;
    setQaBusy(true);
    setLines((prev) => [
      ...prev,
      makeLine(
        "user",
        all ? "Check all public pages" : `Check current page ${pathname}`,
      ),
    ]);

    try {
      const res = await fetch("/api/route-qa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { path: pathname }),
      });
      const json = (await res.json().catch(() => ({}))) as RouteQaResult;
      setLines((prev) => [...prev, makeLine("assistant", formatRouteQa(json))]);
    } catch (err) {
      setLines((prev) => [
        ...prev,
        makeLine(
          "assistant",
          err instanceof Error ? err.message : "Route QA failed",
        ),
      ]);
    } finally {
      setQaBusy(false);
    }
  }

  async function submit(message: string) {
    if (!message.trim() || busy) return;
    setBusy(true);
    setLines((prev) => [...prev, makeLine("user", message)]);
    setDraft("");

    try {
      const endpoint = useCodex ? CODEX_ENDPOINT : AGENT_CHAT_ENDPOINT;
      const body = useCodex
        ? JSON.stringify({
            input: message,
            ...(codexResponseId
              ? { previous_response_id: codexResponseId }
              : {}),
          })
        : JSON.stringify({ message, pageContext: pathname });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as any).error || "Agent chat failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream body returned");

      const decoder = new TextDecoder();
      let buffer = "";
      let codexBuffer = "";
      let newResponseId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const raw of events) {
          if (!raw.startsWith("data: ")) continue;

          if (useCodex) {
            try {
              const event = JSON.parse(raw.slice(6)) as Record<string, unknown>;
              if (event.type === "token") {
                codexBuffer += (event.content as string) ?? "";
              }
              if (event.type === "done") {
                newResponseId = (event.responseId as string | null) ?? null;
                if (codexBuffer.trim()) {
                  setLines((prev) => [
                    ...prev,
                    makeLine("assistant", `🤖 Codex: ${codexBuffer}`),
                  ]);
                  codexBuffer = "";
                }
              }
              if (event.type === "error") {
                throw new Error((event.error as string) ?? "Codex error");
              }
            } catch {
              // skip malformed events
            }
          } else {
            const event = parseSseData(raw);
            if (!event) continue;
            const msg = formatAgentEventMessage(event);
            if (!msg) continue;
            setLines((prev) => [...prev, makeLine("assistant", msg)]);
          }
        }
      }

      if (useCodex && codexBuffer.trim()) {
        setLines((prev) => [
          ...prev,
          makeLine("assistant", `🤖 Codex: ${codexBuffer}`),
        ]);
      }
      if (newResponseId) setCodexResponseId(newResponseId);
    } catch (err) {
      setLines((prev) => [
        ...prev,
        makeLine(
          "assistant",
          err instanceof Error ? err.message : "Agent chat failed",
        ),
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 transition hover:scale-105"
        aria-label="Open agent chat"
      >
        <svg
          className="mx-auto h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[390px] flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            {useCodex ? "⚡ Codex" : "DSG Agent v2"}
          </p>
          <p className="text-[10px] text-slate-400">{pathname}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setUseCodex((v) => !v);
              setCodexResponseId(null);
            }}
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${useCodex ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
            title={useCodex ? "Switch to DSG Agent" : "Switch to Codex"}
          >
            {useCodex ? "Codex ON" : "Codex"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white"
            aria-label="Close agent chat"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="border-b border-slate-800 px-4 py-2">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Page QA
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => void runRouteQa(false)}
            disabled={qaBusy}
            className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-100 disabled:opacity-50"
          >
            Check current page
          </button>
          <button
            onClick={() => void runRouteQa(true)}
            disabled={qaBusy}
            className="rounded-lg border border-blue-400/30 bg-blue-400/10 px-2.5 py-1 text-[10px] font-bold text-blue-100 disabled:opacity-50"
          >
            Check all public pages
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={
              line.role === "user"
                ? "ml-auto max-w-[85%] rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-xs text-emerald-100"
                : line.role === "system"
                  ? "max-w-[90%] rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200"
                  : "max-w-[90%] rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200"
            }
          >
            <pre className="whitespace-pre-wrap break-all font-mono">
              {line.content}
            </pre>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-t border-slate-800 px-4 py-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.prompt}
            onClick={() => submit(suggestion.prompt)}
            disabled={busy}
            className="whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-slate-300 hover:border-emerald-400 disabled:opacity-50"
          >
            {suggestion.label}
          </button>
        ))}
      </div>

      <div className="border-t border-slate-800 p-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(draft);
              }
            }}
            placeholder="Type a command..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          />
          <button
            onClick={() => submit(draft)}
            disabled={busy}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busy ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
