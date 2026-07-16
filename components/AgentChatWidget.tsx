"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { parseSseData, formatHumanAgentEventMessage } from "../lib/agent/chat-event";
import { AgentTimeline } from "./ui/AgentTimeline";
import type { AgentChatEvent } from "../lib/agent/chat-event";

type ChatLine = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  isTyping?: boolean;
  events?: AgentChatEvent[];
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
  // Overview
  "/dashboard": [
    { label: "🔍 ตรวจสอบระบบ", prompt: "check readiness" },
    { label: "📋 ดู audit log", prompt: "show recent audit logs" },
    { label: "🤖 ดู agents", prompt: "list agents" },
    { label: "📊 ดู capacity", prompt: "check capacity" },
  ],
  // Agents
  "/dashboard/agents": [
    { label: "➕ สร้าง agent", prompt: "create agent" },
    { label: "📋 ดู agents", prompt: "list agents" },
    { label: "🤖 สร้าง chatbot", prompt: 'create chatbot "Support Bot"' },
  ],
  // Executions
  "/dashboard/executions": [
    { label: "📊 ดู executions", prompt: "show recent executions" },
    { label: "📋 ดู audit", prompt: "audit lineage" },
  ],
  // Approvals
  "/approvals": [
    { label: "📋 Pending approvals", prompt: "show pending approvals" },
    { label: "📊 Approval stats", prompt: "show approval statistics" },
  ],
  // Audit
  "/dashboard/audit": [
    { label: "📋 ดู logs", prompt: "show audit logs" },
    { label: "🔍 ค้นหา", prompt: "search audit for approval" },
  ],
  // Billing
  "/dashboard/billing": [
    { label: "📊 ดู usage", prompt: "show usage this month" },
    { label: "💳 ดู capacity", prompt: "check capacity" },
  ],
  "/dashboard/capacity": [
    { label: "📊 ดู quota", prompt: "check capacity" },
    { label: "⬆️ Upgrade plan", prompt: "how do I upgrade my plan?" },
  ],
  // Policies
  "/dashboard/policies": [
    { label: "📋 ดู policies", prompt: "list policies" },
    { label: "➕ สร้าง policy", prompt: "create policy" },
  ],
  // Proofs
  "/dashboard/proofs": [
    { label: "📊 ดู proofs", prompt: "show recent proofs" },
    { label: "📄 สร้าง proof", prompt: "generate proof" },
  ],
  // Verification
  "/dashboard/verification": [
    { label: "🔍 Run verification", prompt: "run verification check" },
    { label: "📊 Evidence chain", prompt: "show evidence chain" },
  ],
  // Ledger
  "/dashboard/ledger": [
    { label: "📊 ดู ledger", prompt: "show ledger entries" },
    { label: "📋 ดู lineage", prompt: "audit lineage" },
  ],
  // Live Control
  "/dashboard/live-control": [
    { label: "📊 Live status", prompt: "check live status" },
    { label: "🤖 Monitor agents", prompt: "list active agents" },
  ],
  // Command Center
  "/dashboard/command-center": [
    { label: "📊 System status", prompt: "check readiness" },
    { label: "🤖 All agents", prompt: "list agents" },
  ],
  // Operations
  "/dashboard/operations": [
    { label: "📋 Audit lineage", prompt: "audit lineage" },
    { label: "📊 System health", prompt: "check readiness" },
  ],
  // Integration / Webhooks
  "/dashboard/integration": [
    { label: "🔧 ตั้งค่า integration", prompt: "ตั้งค่า integration กับ core banking" },
    { label: "📋 ดู connections", prompt: "show integrations" },
    { label: "➕ เพิ่ม webhook", prompt: "สร้าง webhook ใหม่" },
  ],
  "/dashboard/integrations": [
    { label: "➕ เพิ่ม integration", prompt: "ตั้งค่า integration ใหม่" },
    { label: "📋 ดู connections", prompt: "show integrations" },
  ],
  "/dashboard/webhooks": [
    { label: "➕ เพิ่ม webhook", prompt: "สร้าง webhook สำหรับ finance approval" },
    { label: "📋 ดู webhooks", prompt: "show my webhooks" },
    { label: "🧪 Test delivery", prompt: "test webhook delivery" },
  ],
  // API Keys
  "/dashboard/api-keys": [
    { label: "➕ สร้าง API key", prompt: "create API key" },
    { label: "📋 ดู API keys", prompt: "list API keys" },
  ],
  // Team / Access
  "/dashboard/team": [
    { label: "➕ เชิญสมาชิก", prompt: "invite team member" },
    { label: "👥 ดู team", prompt: "show team members" },
  ],
  "/dashboard/settings/access": [
    { label: "🔧 จัดการ access", prompt: "show access settings" },
    { label: "➕ เพิ่ม role", prompt: "add user role" },
  ],
  "/dashboard/settings/security": [
    { label: "🔒 ตรวจความปลอดภัย", prompt: "check security settings" },
  ],
  // Skills / Setup
  "/dashboard/skills": [
    { label: "🚀 Run auto-setup", prompt: "run auto_setup" },
    { label: "📋 ดู skills", prompt: "list skills" },
  ],
  // Breach Signal
  "/dashboard/breach-signal": [
    { label: "🚨 Evaluate breach", prompt: "evaluate breach signal for domain example.com" },
    { label: "📊 ดู history", prompt: "show breach signal history" },
  ],
  // DSG Brain / Hermes
  "/dashboard/dsg-brain": [
    { label: "🧠 ดู brain status", prompt: "show DSG Brain status" },
    { label: "📋 Run plan", prompt: "propose execution plan" },
  ],
  "/dashboard/hermes": [
    { label: "🧠 ดู Hermes status", prompt: "show Hermes status" },
    { label: "📋 Controlled execution", prompt: "propose execution plan" },
  ],
  // Finance Governance
  "/finance-governance/live": [
    { label: "➕ สร้าง case", prompt: "สร้าง approval case ใหม่" },
    { label: "📋 ดู queue", prompt: "แสดง approval queue" },
    { label: "🔧 ตั้งค่า webhook", prompt: "ตั้งค่า webhook สำหรับ finance approval" },
  ],
  "/finance-governance/live/approvals": [
    { label: "📋 Pending approvals", prompt: "แสดง approval ที่รอ" },
    { label: "⬆️ Escalate case", prompt: "escalate approval case" },
  ],
  "/finance-governance/live/cases": [
    { label: "📋 Active cases", prompt: "แสดง cases ที่เปิดอยู่" },
    { label: "➕ สร้าง case", prompt: "สร้าง case ใหม่" },
  ],
  "/finance-governance/live/onboarding": [
    { label: "🚀 Auto-setup", prompt: "run auto_setup" },
    { label: "🔧 Configure webhook", prompt: "ตั้งค่า webhook สำหรับ core banking" },
    { label: "🔑 Get API key", prompt: "create API key for core banking integration" },
  ],
  "/finance-governance/live/workflow": [
    { label: "📊 Workflow status", prompt: "show workflow status" },
    { label: "🔧 Setup rules", prompt: "ตั้งค่า workflow rules" },
  ],
  // Delivery Proof
  "/delivery-proof": [
    { label: "🔍 Scan URL", prompt: "scan https://my-app.vercel.app" },
    { label: "📄 Generate report", prompt: "สร้าง delivery proof report" },
  ],
  // Referrals / Missions
  "/dashboard/referrals": [
    { label: "📊 My referrals", prompt: "show referral status" },
    { label: "🔗 Referral link", prompt: "get my referral link" },
  ],
  "/dashboard/missions": [
    { label: "📋 Active missions", prompt: "show active missions" },
    { label: "✅ Complete mission", prompt: "what missions can I complete?" },
  ],
  // ProofGate
  "/proofgate": [
    { label: "🛡 Evaluate gate", prompt: "evaluate my first gate" },
    { label: "🔗 Connect system", prompt: "how do I connect my system to ProofGate?" },
    { label: "🔑 Get API key", prompt: "create API key" },
  ],
  // Enterprise Ready
  "/enterprise-ready": [
    { label: "🚀 Auto-setup", prompt: "run auto_setup" },
    { label: "🔗 Connect to DSG", prompt: "how do I connect my system to DSG?" },
    { label: "🔍 Check readiness", prompt: "check readiness" },
  ],
  // Finance Approval Gate
  "/finance-approval-gate": [
    { label: "➕ Submit approval", prompt: "สร้าง approval case สำหรับการโอนเงิน" },
    { label: "📋 View queue", prompt: "แสดง approval queue" },
    { label: "🔧 Setup webhook", prompt: "ตั้งค่า webhook สำหรับ finance approval" },
  ],
  // Automation
  "/automation": [
    { label: "➕ Add webhook", prompt: "สร้าง webhook ใหม่" },
    { label: "📋 List automations", prompt: "show my webhooks" },
    { label: "🧪 Test delivery", prompt: "test webhook delivery" },
  ],
  // AI Compliance
  "/ai-compliance": [
    { label: "📊 Compliance status", prompt: "show compliance status" },
    { label: "🔍 ISO 42001 check", prompt: "check ISO 42001 compliance" },
    { label: "📤 Export evidence", prompt: "export compliance evidence" },
  ],
  // EU AI Act
  "/eu-ai-act": [
    { label: "🇪🇺 EU AI Act status", prompt: "check EU AI Act compliance status" },
    { label: "🔍 Risk assessment", prompt: "run AI risk assessment" },
    { label: "📤 Export report", prompt: "export EU AI Act evidence report" },
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
  if (result.error) return `❌ ตรวจสอบไม่สำเร็จ: ${result.error}`;

  const summary = result.summary;
  const header = result.ok
    ? `✅ หน้าเว็บผ่านทั้งหมด ${summary?.passed ?? 0} หน้า`
    : `⚠️ พบปัญหา ${summary?.failed ?? 0} จาก ${summary?.total ?? 0} หน้า`;

  const rows = (result.results || [])
    .map((row) => {
      const state = row.ok ? "✅" : "❌";
      const title = row.title ? ` (${row.title})` : "";
      return `${state} ${row.path || "-"}${title}`;
    })
    .join("\n");

  return [header, rows, result.truthBoundary ? `\nข้อจำกัด: ${result.truthBoundary}` : ""]
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
      "สวัสดีครับ ผมคือ DSG Agent พร้อมช่วยตรวจสอบระบบและดำเนินการให้คุณ เลือกคำสั่งด้านล่างหรือพิมพ์คำถามได้เลย",
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

  const runRouteQa = useCallback(async (all: boolean) => {
    if (qaBusy) return;
    setQaBusy(true);
    setLines((prev) => [
      ...prev,
      makeLine("user", all ? "ตรวจสอบทุกหน้า" : `ตรวจหน้าปัจจุบัน ${pathname}`),
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
        makeLine("assistant", err instanceof Error ? `❌ ${err.message}` : "❌ เกิดข้อผิดพลาด"),
      ]);
    } finally {
      setQaBusy(false);
    }
  }, [pathname, qaBusy]);

  const submit = useCallback(async (message: string) => {
    if (!message.trim() || busy) return;
    setBusy(true);
    setLines((prev) => [...prev, makeLine("user", message)]);
    setDraft("");

    // Add typing indicator
    const typingId = `typing-${Date.now()}`;
    setLines((prev) => [
      ...prev,
      { id: typingId, role: "assistant", content: "", isTyping: true },
    ]);

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
        credentials: "include",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as any).error || "เกิดข้อผิดพลาดจากระบบ");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("ไม่ได้รับคำตอบจากระบบ");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullReply = "";
      let agentEvents: AgentChatEvent[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const rawEvents = buffer.split("\n\n");
        buffer = rawEvents.pop() || "";

        for (const raw of rawEvents) {
          if (!raw.startsWith("data: ")) continue;

          if (useCodex) {
            try {
              const event = JSON.parse(raw.slice(6)) as Record<string, unknown>;
              if (event.type === "token") {
                fullReply += (event.content as string) ?? "";
                setLines((prev) =>
                  prev.map((line) =>
                    line.id === typingId
                      ? { ...line, content: fullReply }
                      : line
                  )
                );
              }
              if (event.type === "done") {
                if (fullReply.trim()) {
                  setLines((prev) => [
                    ...prev.filter((l) => l.id !== typingId),
                    makeLine("assistant", fullReply.trim()),
                  ]);
                }
                setCodexResponseId(
                  (event.responseId as string | null) ?? null
                );
                break;
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
            agentEvents.push(event);
            const msg = formatHumanAgentEventMessage(event);
            if (msg) {
              fullReply += (fullReply ? "\n" : "") + msg;
            }
            setLines((prev) =>
              prev.map((line) =>
                line.id === typingId
                  ? { ...line, content: fullReply, events: agentEvents }
                  : line
              )
            );
          }
        }
      }

      // If we got no content, show a fallback
      if (!fullReply.trim() && agentEvents.length === 0) {
        setLines((prev) => [
          ...prev.filter((l) => l.id !== typingId),
          makeLine("assistant", "ไม่ได้รับคำตอบจากระบบ ลองใหม่อีกครั้ง"),
        ]);
      } else if (agentEvents.length > 0) {
        // Use timeline for structured events
        setLines((prev) => [
          ...prev.filter((l) => l.id !== typingId),
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "",
            events: agentEvents,
          },
        ]);
      } else {
        // Remove typing indicator if still there
        setLines((prev) => prev.filter((l) => l.id !== typingId));
      }
    } catch (err) {
      setLines((prev) => [
        ...prev.filter((l) => l.id !== typingId),
        makeLine(
          "assistant",
          err instanceof Error ? `❌ ${err.message}` : "❌ เกิดข้อผิดพลาด"
        ),
      ]);
    } finally {
      setBusy(false);
    }
  }, [pathname, busy, useCodex, codexResponseId]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 transition hover:scale-110 active:scale-95"
        aria-label="เปิดแชท AI"
      >
        <svg
          className="h-6 w-6"
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
    <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[400px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e14] shadow-2xl shadow-black/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#12141c] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500">
            <span className="text-sm">🤖</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {useCodex ? "⚡ Codex" : "DSG AI"}
            </p>
            <p className="text-[10px] text-emerald-400">พร้อมช่วยเหลือ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setUseCodex((v) => !v);
              setCodexResponseId(null);
            }}
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
              useCodex
                ? "bg-violet-500 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title={useCodex ? "เปลี่ยนเป็น DSG Agent" : "เปลี่ยนเป็น Codex"}
          >
            {useCodex ? "Codex ON" : "Codex"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="ปิดแชท"
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

      {/* QA Buttons */}
      <div className="flex gap-2 border-b border-white/5 bg-[#0f1118] px-4 py-2">
        <button
          onClick={() => void runRouteQa(false)}
          disabled={qaBusy}
          className="flex-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-medium text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-50"
        >
          🔍 ตรวจหน้านี้
        </button>
        <button
          onClick={() => void runRouteQa(true)}
          disabled={qaBusy}
          className="flex-1 rounded-lg border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-[11px] font-medium text-blue-200 transition hover:bg-blue-400/20 disabled:opacity-50"
        >
          🌐 ตรวจทั้งหมด
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={line.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[90%]"}
          >
            {line.role === "system" ? (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
                <p className="whitespace-pre-wrap">{line.content}</p>
              </div>
            ) : line.role === "user" ? (
              <div className="rounded-2xl rounded-br-md bg-emerald-500/20 px-3 py-2 text-xs text-emerald-100">
                <p className="whitespace-pre-wrap">{line.content}</p>
              </div>
            ) : (
              <div className="rounded-2xl rounded-bl-md border border-white/10 bg-[#161822] px-3 py-2 text-xs text-slate-200">
                {line.isTyping ? (
                  <div className="flex items-center gap-1">
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400"
                      style={{ animationDelay: "300ms" }}
                    />
                    {line.content && (
                      <span className="ml-2 text-slate-400">{line.content}</span>
                    )}
                  </div>
                ) : line.events && line.events.length > 0 ? (
                  <AgentTimeline events={line.events} className="max-w-md" />
                ) : (
                  <p className="whitespace-pre-wrap">{line.content}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-white/5 px-4 py-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.prompt}
              onClick={() => submit(suggestion.prompt)}
              disabled={busy}
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-400/10 disabled:opacity-50"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10 bg-[#12141c] p-3">
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
            placeholder="พิมพ์คำถามหรือคำสั่ง..."
            className="flex-1 rounded-xl border border-white/10 bg-[#0c0e14] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20"
          />
          <button
            onClick={() => submit(draft)}
            disabled={busy || !draft.trim()}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-30"
          >
            {busy ? "..." : "ส่ง"}
          </button>
        </div>
      </div>
    </div>
  );
}
