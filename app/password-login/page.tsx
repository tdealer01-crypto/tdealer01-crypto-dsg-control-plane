"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PasswordLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "missing-email") setError("กรุณากรอกอีเมล");
    else if (err === "missing-password") setError("กรุณากรอกรหัสผ่าน");
    else if (err === "invalid-credentials") setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่");
    else if (err === "provision-failed") setError("เข้าสู่ระบบสำเร็จแต่ไม่สามารถสร้างสิทธิ์เข้าถึงได้ กรุณาติดต่อผู้ดูแล");
    else if (err === "unexpected") setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    else setError(null);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setLoading(true);
    // Form submits to /auth/password-login via POST
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07080b] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg font-bold text-black">
            DSG
          </div>
          <h1 className="text-xl font-bold text-white">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-slate-500">กรอกข้อมูลเพื่อเข้าถึง workspace</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <span className="text-lg">❌</span>
            <span className="text-sm text-red-200">{error}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <form
            action="/auth/password-login"
            method="post"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <input type="hidden" name="next" value={next} />

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                อีเมลธุรกิจ
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                className="w-full rounded-xl border border-white/10 bg-[#0a0c12] px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="กรอกรหัสผ่านของคุณ"
                className="w-full rounded-xl border border-white/10 bg-[#0a0c12] px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-3.5 font-semibold text-black transition hover:scale-[1.01] hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : (
                "เข้าสู่ระบบ →"
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm text-slate-400 transition hover:text-emerald-400"
          >
            ← กลับไปหน้าเข้าสู่ระบบ
          </a>
        </div>

        {/* Help */}
        <div className="mt-8 rounded-xl border border-white/5 bg-white/[0.01] p-4 text-center text-xs text-slate-500">
          ต้องการความช่วยเหลือ? <a href="/request-access" className="text-emerald-400 underline">ติดต่อผู้ดูแล</a>
        </div>
      </div>
    </main>
  );
}
