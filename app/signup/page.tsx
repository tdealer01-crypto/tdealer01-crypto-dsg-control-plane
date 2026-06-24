"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Notice = {
  type: "error" | "success" | "info";
  message: string;
};

type FormData = {
  full_name: string;
  email: string;
  workspace_name: string;
  password: string;
};

type FormErrors = {
  full_name?: string;
  email?: string;
  workspace_name?: string;
  password?: string;
};

function getNotice(error?: string, message?: string): Notice | null {
  if (message === "check-email") {
    return {
      type: "success",
      message: "ส่งลิงก์ยืนยันแล้ว! กรุณาตรวจสอบอีเมลของคุณเพื่อเปิดใช้งานบัญชี",
    };
  }
  if (error === "email-taken") {
    return {
      type: "error",
      message: "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ",
    };
  }
  if (error === "workspace-taken") {
    return {
      type: "error",
      message: "ชื่อ workspace นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น",
    };
  }
  if (error === "invalid-email") {
    return {
      type: "error",
      message: "รูปแบบอีเมลไม่ถูกต้อง กรุณาใส่อีเมลธุรกิจที่ถูกต้อง",
    };
  }
  if (error) {
    return {
      type: "error",
      message: "ไม่สามารถสร้างบัญชีได้ กรุณาลองใหม่อีกครั้ง",
    };
  }
  return null;
}

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.full_name.trim()) {
    errors.full_name = "กรุณากรอกชื่อ-นามสกุล";
  } else if (data.full_name.trim().length < 2) {
    errors.full_name = "ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร";
  }

  if (!data.email.trim()) {
    errors.email = "กรุณากรอกอีเมล";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
  }

  if (!data.workspace_name.trim()) {
    errors.workspace_name = "กรุณากรอกชื่อ workspace";
  } else if (data.workspace_name.trim().length < 3) {
    errors.workspace_name = "ชื่อ workspace ต้องมีอย่างน้อย 3 ตัวอักษร";
  } else if (!/^[a-zA-Z0-9-_]+$/.test(data.workspace_name.trim())) {
    errors.workspace_name = "ชื่อ workspace ใช้ได้เฉพาะตัวอักษร ตัวเลข - และ _ เท่านั้น";
  }

  if (!data.password) {
    errors.password = "กรุณากรอกรหัสผ่าน";
  } else if (data.password.length < 8) {
    errors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  }

  return errors;
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    email: "",
    workspace_name: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const error = searchParams.get("error") || undefined;
    const message = searchParams.get("message") || undefined;
    setNotice(getNotice(error, message));
    setDismissed(false);
  }, [searchParams]);

  const handleChange = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error on change
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (field: keyof FormData) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const fieldErrors = validateForm(formData);
      if (fieldErrors[field]) {
        setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
      }
    },
    [formData]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mark all fields as touched
    setTouched({ full_name: true, email: true, workspace_name: true, password: true });

    // Validate
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          workspace_name: formData.workspace_name.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to check-email page or show success
        router.push("/signup?message=check-email");
      } else {
        // Handle specific error codes from backend
        const errorCode = data?.error || data?.code;
        router.push(`/signup?error=${encodeURIComponent(errorCode || "unknown")}`);
      }
    } catch {
      router.push("/signup?error=network-error");
    } finally {
      setIsLoading(false);
    }
  };

  const noticeStyles = {
    error: "border-red-500/30 bg-red-500/10 text-red-200",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    info: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  };

  const noticeIcons = {
    error: "❌",
    success: "✅",
    info: "ℹ️",
  };

  const getInputClassName = (field: keyof FormData) => {
    const base =
      "w-full rounded-xl border bg-[#0a0c12] px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none transition";
    const hasError = touched[field] && errors[field];
    const isFilled = formData[field].length > 0;

    if (hasError) {
      return `${base} border-red-500/50 focus:border-red-400/70 focus:ring-2 focus:ring-red-400/20`;
    }
    if (isFilled && !errors[field]) {
      return `${base} border-emerald-500/30 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20`;
    }
    return `${base} border-white/10 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20`;
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
          {/* Left Column — Signup Form */}
          <div className="rounded-2xl border border-emerald-500/20 bg-white/[0.03] p-6">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              สร้างบัญชีใหม่
            </div>
            <h2 className="text-xl font-bold text-white">สร้าง workspace แรกของคุณ</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              กรอกข้อมูลด้านล่างเพื่อเริ่มต้นใช้งาน ไม่ต้องบัตรเครดิต
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
              {/* Full Name */}
              <div>
                <label
                  htmlFor="full_name"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  ชื่อ-นามสกุล
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="สมชาย ใจดี"
                  value={formData.full_name}
                  onChange={handleChange("full_name")}
                  onBlur={handleBlur("full_name")}
                  disabled={isLoading}
                  className={getInputClassName("full_name")}
                />
                {touched.full_name && errors.full_name && (
                  <p className="mt-2 text-xs text-red-400">{errors.full_name}</p>
                )}
              </div>

              {/* Work Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  อีเมลธุรกิจ
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="user@company.com"
                  value={formData.email}
                  onChange={handleChange("email")}
                  onBlur={handleBlur("email")}
                  disabled={isLoading}
                  className={getInputClassName("email")}
                />
                {touched.email && errors.email && (
                  <p className="mt-2 text-xs text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Workspace Name */}
              <div>
                <label
                  htmlFor="workspace_name"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  ชื่อ workspace
                </label>
                <input
                  id="workspace_name"
                  name="workspace_name"
                  type="text"
                  autoComplete="organization"
                  placeholder="acme-ops"
                  value={formData.workspace_name}
                  onChange={handleChange("workspace_name")}
                  onBlur={handleBlur("workspace_name")}
                  disabled={isLoading}
                  className={getInputClassName("workspace_name")}
                />
                {touched.workspace_name && errors.workspace_name && (
                  <p className="mt-2 text-xs text-red-400">{errors.workspace_name}</p>
                )}
                <p className="mt-1.5 text-xs text-slate-500">
                  ใช้ได้เฉพาะตัวอักษร ตัวเลข - และ _ เท่านั้น
                </p>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  รหัสผ่าน
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  value={formData.password}
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  disabled={isLoading}
                  className={getInputClassName("password")}
                />
                {touched.password && errors.password && (
                  <p className="mt-2 text-xs text-red-400">{errors.password}</p>
                )}
                <p className="mt-1.5 text-xs text-slate-500">
                  แนะนำให้มีตัวอักษรใหญ่ ตัวเลข และอักขระพิเศษ
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-3.5 font-semibold text-black transition hover:scale-[1.01] hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    กำลังสร้างบัญชี...
                  </span>
                ) : (
                  "สร้างบัญชี →"
                )}
              </button>
            </form>

            {/* Login Link */}
            <p className="mt-6 text-center text-sm text-slate-400">
              มีบัญชีอยู่แล้ว?{" "}
              <Link
                href="/login"
                className="font-medium text-emerald-400 underline decoration-emerald-400/30 underline-offset-2 transition hover:text-emerald-300"
              >
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>

          {/* Right Column — Info Cards */}
          <div className="space-y-5">
            {/* Trial Info Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-6">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                ทดลองใช้ฟรี 14 วัน
              </div>
              <h2 className="text-xl font-bold text-white">เริ่มต้นใช้งานฟรี</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                สร้าง workspace แรกของคุณและเริ่มควบคุม AI actions ได้ทันที
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  <span>1,000 executions รวมอยู่ในแพ็กเจ</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  <span>ตั้งค่า agent แรกได้ทันที</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  <span>การเข้าถึงที่ได้รับการยืนยันตัวตน</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  <span>การใช้งาน บันชี และนโยบายที่มองเห็นได้</span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                ไม่ต้องบัตรเครดิต · ตั้งค่าใน 5 นาที
              </p>
            </div>

            {/* SSO Option */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="text-lg font-bold text-white">องค์กรใช้ SSO?</h2>
              <p className="mt-2 text-sm text-slate-400">
                ถ้าองค์กรของคุณกำหนดให้ใช้ Single Sign-On สามารถเข้าสู่ระบบผ่าน SSO แทนได้
              </p>
              <Link
                href="/login"
                className="mt-4 block w-full rounded-xl border border-violet-400/30 bg-violet-400/10 px-5 py-3 text-center text-sm font-medium text-violet-200 transition hover:bg-violet-400/20 active:scale-95"
              >
                🔐 เข้าสู่ระบบผ่าน SSO
              </Link>
            </div>

            {/* Request Access */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 text-center">
              <p className="text-sm text-slate-400">
                ต้องการเข้าถึง workspace ขององค์กร?
              </p>
              <Link
                href="/request-access"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-400 underline decoration-emerald-400/30 underline-offset-2 transition hover:text-emerald-300"
              >
                ขอสิทธิ์เข้าถึง →
              </Link>
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
