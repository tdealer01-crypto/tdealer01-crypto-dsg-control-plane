"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { parseSseData, formatHumanAgentEventMessage } from "../lib/agent/chat-event";

type ChatLine = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  isTyping?: boolean;
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
        makeLine("assistant", err instanceof Error ? err.message : "เกิดข้อผิดพลาด"),
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
    setLines((prev) => [...prev, { id: typingId, role: "assistant", content: "", isTyping: true }]);

    try {
      const res = await fetch(AGENT_CHAT_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, pageContext: pathname }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const raw of events) {
          if (!raw.startsWith("data: ")) continue;
          const event = parseSseData(raw);
          if (!event) continue;
          const msg = formatHumanAgentEventMessage(event);
          if (!msg) continue;
          fullReply += (fullReply ? "\n" : "") + msg;
          // Update typing indicator with partial content
          setLines((prev) =>
            prev.map((line) =>
              line.id === typingId ? { ...line, content: fullReply } : line
            )
          );
        }
      }

      // Remove typing indicator and add final reply
      setLines((prev) => [
        ...prev.filter((line) => line.id !== typingId),
        makeLine("assistant", fullReply || "ไม่ได้รับคำตอบ"),
      ]);
    } catch (err) {
      setLines((prev) => [
        ...prev.filter((line) => line.id !== typingId),
        makeLine(
          "assistant",
          err instanceof Error ? `❌ ${err.message}` : "❌ เกิดข้อผิดพลาด"
        ),
      ]);
    } finally {
      setBusy(false);
    }
  }, [pathname, busy]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 transition hover:scale-110 active:scale-95"
        aria-label="เปิดแชท AI"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
            <p className="text-sm font-semibold text-white">DSG AI</p>
            <p className="text-[10px] text-emerald-400">พร้อมช่วยเหลือ</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="ปิดแชท"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {lines.map((line) => (
          <div
            key={line.id}
            className={
              line.role === "user"
                ? "ml-auto max-w-[85%]"
                : "max-w-[90%]"
            }
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
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "300ms" }} />
                    {line.content && <span className="ml-2 text-slate-400">{line.content}</span>}
                  </div>
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

const PAGE_SUGGESTIONS: Record<string, { label: string; prompt: string }[]> = {
  "/dashboard": [
    { label: "🔍 ตรวจสอบระบบ", prompt: "check readiness" },
    { label: "📋 ดู audit log", prompt: "show recent audit logs" },
    { label: "🤖 ดู agents", prompt: "list agents" },
    { label: "📊 ดู capacity", prompt: "check capacity" },
  ],
  "/dashboard/agents": [
    { label: "➕ สร้าง agent", prompt: "create agent" },
    { label: "📋 ดู agents", prompt: "list agents" },
    { label: "🤖 สร้าง chatbot", prompt: 'create chatbot "Support Bot"' },
  ],
  "/dashboard/executions": [
    { label: "📊 ดู executions", prompt: "show recent executions" },
    { label: "📋 ดู audit", prompt: "audit lineage" },
  ],
  "/dashboard/audit": [
    { label: "📋 ดู logs", prompt: "show audit logs" },
    { label: "🔍 ค้นหา", prompt: "search audit for approval" },
  ],
  "/dashboard/billing": [
    { label: "📊 ดู usage", prompt: "show usage this month" },
    { label: "💳 ดู capacity", prompt: "check capacity" },
  ],
  "/dashboard/governance": [
    { label: "🏛 ดู compliance", prompt: "show compliance status" },
    { label: "🚨 ดู incidents", prompt: "show incidents" },
    { label: "📊 ดู 10Q", prompt: "show 10Q governance status" },
  ],
  "/dashboard/hermes": [
    { label: "🧠 ดู brain status", prompt: "show DSG Brain status" },
    { label: "📋 ดู agents", prompt: "list agents" },
    { label: "🔍 ตรวจระบบ", prompt: "check readiness" },
  ],
  "/dashboard/team": [
    { label: "👥 ดู team", prompt: "show team members" },
    { label: "➕ เชิญสมาชิก", prompt: "invite team member" },
  ],
  "/dashboard/settings/security": [
    { label: "🔒 ตรวจความปลอดภัย", prompt: "check security settings" },
  ],
  "/finance-governance/live": [
    { label: "➕ สร้าง case", prompt: "สร้าง approval case ใหม่" },
    { label: "📋 ดู queue", prompt: "แสดง approval queue" },
  ],
  "/delivery-proof": [
    { label: "📄 สร้าง report", prompt: "สร้าง delivery proof report" },
  ],
  "/proofgate": [
    { label: "🛡 evaluate", prompt: "evaluate my first gate" },
  ],
  "/enterprise-ready": [
    { label: "🚀 auto-setup", prompt: "run auto_setup" },
  ],
  "/ai-compliance": [
    { label: "📊 compliance", prompt: "show compliance status" },
  ],
  "/eu-ai-act": [
    { label: "🇪🇺 EU AI Act", prompt: "check EU AI Act compliance status" },
  ],
  "/automation": [
    { label: "⚡ เพิ่ม webhook", prompt: "สร้าง webhook ใหม่" },
  ],
};
