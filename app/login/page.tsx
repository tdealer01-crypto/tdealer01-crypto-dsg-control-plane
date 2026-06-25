"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Notice = {
  type: "error" | "success" | "info";
  message: string;
  action?: { label: string; href: string };
};

function getNotice(error?: string, message?: string): Notice | null {
  if (message === "check-email") {
    return {
      type: "success",
      message: "ส่งลิงก์กู้คืนแล้ว! กรุณาตรวจสอบอีเมลของคุณ",
    };
  }
  if (error === "approval-required") {
    return {
      type: "error",
      message: "Workspace นี้ต้องได้รับอนุมัติจากผู้ดูแลก่อนเข้าสู่ระบบ",
      action: { label: "ขอเข้าถึง", href: "/request-access" },
    };
  }
  if (error === "sso-required") {
    return {
      type: "error",
      message: "องค์กรนี้กำหนดให้เข้าสู่ระบบผ่าน SSO เท่านั้น กรุณาใช้ปุ่ม Continue with SSO",
    };
  }
  if (error === "not-allowed") {
    return {
      type: "error",
      message: "บัญชีของคุณไม่ได้รับอนุญาตให้เข้าถึง workspace นี้",
      action: { label: "ติดต่อผู้ดูแล", href: "/request-access" },
    };
  }
  if (error === "invalid-email") {
    return {
      type: "error",
      message: "รูปแบบอีเมลไม่ถูกต้อง กรุณาใส่อีเมลธุรกิจที่ถูกต้อง",
    };
  }
  if (error === "too-many-attempts") {
    return {
      type: "error",
      message: "คุณพยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 60 วินาทีแล้วลองใหม่",
    };
  }
  if (error) {
    return {
      type: "error",
      message: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
    };
  }
  return null;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<{ type: string; message: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error") || undefined;
    const message = searchParams.get("message") || undefined;
    if (message === "check-email") setNotice({ type: "success", message: "ส่งลิงก์กู้คืนแล้ว! กรุณาตรวจสอบอีเมลของคุณ" });
    else if (error === "approval-required") setNotice({ type: "error", message: "Workspace นี้ต้องได้รับอนุมัติจากผู้ดูแลก่อนเข้าสู่ระบบ" });
    else if (error === "sso-required") setNotice({ type: "error", message: "องค์กรนี้กำหนดให้เข้าสู่ระบบผ่าน SSO เท่านั้น" });
    else if (error === "not-allowed") setNotice({ type: "error", message: "บัญชีของคุณไม่ได้รับอนุญาตให้เข้าถึง workspace นี้" });
    else if (error === "invalid-email") setNotice({ type: "error", message: "รูปแบบอีเมลไม่ถูกต้อง กรุณาใส่อีเมลธุรกิจที่ถูกต้อง" });
    else if (error === "too-many-attempts") setNotice({ type: "error", message: "คุณพยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 60 วินาทีแล้วลองใหม่" });
    else if (error) setNotice({ type: "error", message: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง" });
    else setNotice(null);
  }, [searchParams]);

  const handleSSOClick = useCallback(() => {
    const next = searchParams.get("next") || "/dashboard";
    router.push(`/api/auth/sso?next=${encodeURIComponent(next)}`);
  }, [router, searchParams]);

  const noticeIcons = {
    error: "❌",
    success: "✅",
    info: "ℹ️",
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07080b] px-4 py-12">
      <div className="w-full max-w-4xl">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-xl font-bold text-black shadow-lg shadow-emerald-500/20">
            DSG
          </div>
          <h1 className="text-2xl font-bold text-white">DSG ONE</h1>
          <p className="mt-1 text-sm text-slate-500">ProofGate Runtime Control Plane</p>
        </div>

        {/* Dynamic Notice Banner */}
        {notice && !dismissed && (
          <div
            className={`mb-6 flex items-center justify-between rounded-2xl border p-4 ${noticeStyles[notice.type]}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{noticeIcons[notice.type]}</span>
              <span className="text-sm font-medium">{notice.message}</span>
              {notice.action && (
                <a
                  href={notice.action.href}
                  className="ml-2 rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold transition hover:bg-white/20"
                >
                  {notice.action.label}
                </a>
              )}
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="ml-4 rounded-lg p-1 text-sm opacity-60 transition hover:bg-white/10 hover:opacity-100"
              aria-label="ปิด"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Left Column — Authentication (Primary) */}
          <div className="space-y-5">
            {/* Password Login Card */}
            <div className="rounded-2xl border border-emerald-500/20 bg-white/[0.03] p-6">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                สำหรับผู้ใช้ที่มีบัญชีแล้ว
              </div>
              <h2 className="text-xl font-bold text-white">เข้าสู่ระบบด้วยรหัสผ่าน</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                กรุณาดำเนินการต่อเพื่อเข้าถึง workspace ของคุณ
              </p>
              <a
                href="/password-login"
                className="mt-5 block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-3.5 text-center font-semibold text-black transition hover:scale-[1.01] hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99]"
              >
                เข้าสู่ระบบด้วยรหัสผ่าน →
              </a>
            </div>

            {/* Recovery Link Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                ลืมรหัสผ่าน?
              </div>
              <h2 className="text-lg font-bold text-white">ขอลิงก์กู้คืน</h2>
              <p className="mt-2 text-sm text-slate-400">
                กรอกอีเมลธุรกิจของคุณ ระบบจะส่งลิงก์กู้คืนรหัสผ่านให้
              </p>
              <form
                action="/auth/continue"
                method="POST"
                className="mt-4"
                onSubmit={(e) => {
                  const btn = e.currentTarget.querySelector("button[type=submit]") as HTMLButtonElement;
                  if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = `<span class="inline-flex items-center gap-2"><svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>กำลังส่ง...</span>`;
                  }
                }}
              >
                <div className="flex gap-3">
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="อีเมลธุรกิจ (เช่น user@company.com)"
                    className="flex-1 rounded-xl border border-white/10 bg-[#0a0c12] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
                  />
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 active:scale-95"
                  >
                    ส่งลิงก์กู้คืน
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column — New Users (Secondary) */}
          <div className="space-y-5">
            {/* Trial Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                ผู้ใช้ใหม่
              </div>
              <h2 className="text-xl font-bold text-white">เริ่มต้นใช้งานฟรี</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                สร้าง workspace แรกของคุณและเริ่มควบคุม AI actions ได้ทันที
              </p>
              <a
                href="/signup"
                className="mt-5 block w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3.5 text-center font-semibold text-cyan-200 transition hover:bg-cyan-400/20 active:scale-[0.99]"
              >
                🚀 เริ่มทดลองใช้ 14 วันฟรี
              </a>
              <p className="mt-3 text-center text-xs text-slate-500">
                ไม่ต้องบัตรเครดิต · ตั้งค่าใน 5 นาที
              </p>
            </div>

            {/* SSO Option */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="text-lg font-bold text-white">องค์กรใช้ SSO?</h2>
              <p className="mt-2 text-sm text-slate-400">
                ถ้าองค์กรของคุณกำหนดให้ใช้ Single Sign-On
              </p>
              <button
                type="button"
                onClick={handleSSOClick}
                className="mt-4 w-full rounded-xl border border-violet-400/30 bg-violet-400/10 px-5 py-3 text-sm font-medium text-violet-200 transition hover:bg-violet-400/20 active:scale-95"
              >
                🔐 เข้าสู่ระบบผ่าน SSO
              </button>
            </div>

            {/* Request Access */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 text-center">
              <p className="text-sm text-slate-400">
                ยังไม่มีบัญชีแต่ต้องการเข้าถึง workspace ขององค์กร?
              </p>
              <a
                href="/request-access"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-400 underline decoration-emerald-400/30 underline-offset-2 transition hover:text-emerald-300"
              >
                ขอสิทธิ์เข้าถึง →
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-slate-600">
          DSG ONE v1.0 · EU AI Act · ISO 42001 · NIST AI RMF
        </div>
      </div>
    </main>
  );
}
