'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type NoticeState = {
  tone: 'error' | 'success';
  text: string;
} | null;

function getMessage(message?: string, error?: string): NoticeState {
  if (message === 'check-email') return { tone: 'success', text: 'ตรวจสอบอีเมลของคุณเพื่อดูลิงก์กู้คืน' };
  if (error === 'approval-required') return { tone: 'error', text: 'พื้นที่ทำงานนี้ต้องได้รับการอนุมัติจากผู้ดูแลก่อนเข้าสู่ระบบ' };
  if (error === 'sso-required') return { tone: 'error', text: 'องค์กรนี้ต้องใช้ลงชื่อเข้าใช้ครั้งเดียว (SSO) ในการเข้าสู่ระบบ' };
  if (error === 'not-allowed') return { tone: 'error', text: 'บัญชีของคุณไม่ได้รับอนุญาตให้เข้าถึงพื้นที่ทำงานนี้' };
  if (error === 'invalid-email') return { tone: 'error', text: 'กรุณากรอกที่อยู่อีเมลทำงานที่ถูกต้อง' };
  if (error === 'signup-failed') return { tone: 'error', text: 'ไม่สามารถสร้างพื้นที่ทำงานได้ กรุณาลองใหม่อีกครั้ง' };
  if (error) return { tone: 'error', text: 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง' };
  return null;
}

type OptionCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  accentColor: string;
};

function OptionCard({ icon, title, description, onClick, loading, disabled, accentColor }: OptionCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={[
        'group relative w-full rounded-2xl border p-6 text-left transition-all duration-300 ease-out',
        'bg-gradient-to-br from-slate-900/80 to-slate-950/90 backdrop-blur-sm',
        disabled || loading
          ? 'cursor-not-allowed border-white/5 opacity-60'
          : isHovered
          ? `border-${accentColor}/50 shadow-lg shadow-${accentColor}/10 scale-[1.02]`
          : 'border-white/10 hover:border-white/20',
      ].join(' ')}
      style={{
        borderColor: isHovered && !disabled && !loading ? `var(--accent-${accentColor})` : undefined,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
            loading ? 'animate-pulse' : '',
          ].join(' ')}
          style={{
            background: `linear-gradient(135deg, var(--accent-${accentColor}-from), var(--accent-${accentColor}-to))`,
          }}
        >
          {loading ? (
            <svg className="h-5 w-5 animate-spin text-white/80" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            icon
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white transition-colors duration-200">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            {description}
          </p>
        </div>
        <svg
          className={[
            'h-5 w-5 shrink-0 text-slate-500 transition-all duration-300',
            isHovered && !disabled && !loading ? 'translate-x-1 text-white' : '',
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

export default function LoginCard({
  next = '/dashboard',
  errorMessage,
  message,
}: {
  next?: string;
  errorMessage?: string;
  message?: string;
}) {
  const router = useRouter();
  const [loadingOption, setLoadingOption] = useState<string | null>(null);
  const notice = getMessage(message, errorMessage);

  const handlePasswordLogin = () => {
    setLoadingOption('password');
    router.push(`/password-login?next=${encodeURIComponent(next)}`);
  };

  const handleSSO = () => {
    setLoadingOption('sso');
    router.push('/api/auth/sso');
  };

  const handleTrial = () => {
    setLoadingOption('trial');
    router.push('/signup');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo / Branding */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-lg shadow-emerald-500/25">
            <svg className="h-8 w-8 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          DSG Control Plane
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          เข้าสู่ระบบพื้นที่ทำงานของคุณ
        </p>
      </div>

      {/* Notice / Error / Success */}
      {notice && (
        <div
          className={[
            'mb-6 rounded-xl border p-4 text-sm font-medium transition-all duration-300',
            notice.tone === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              : 'border-red-500/30 bg-red-500/10 text-red-200',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            {notice.tone === 'success' ? (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            <span>{notice.text}</span>
          </div>
        </div>
      )}

      {/* Option Cards */}
      <div className="space-y-3">
        {/* Password Option */}
        <OptionCard
          icon={
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          }
          title="เข้าสู่ระบบด้วยรหัสผ่าน"
          description="สำหรับผู้ใช้ที่มีบัญชีอยู่แล้ว"
          onClick={handlePasswordLogin}
          loading={loadingOption === 'password'}
          disabled={loadingOption !== null && loadingOption !== 'password'}
          accentColor="emerald"
        />

        {/* Recovery Option */}
        <OptionCard
          icon={
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          title="กู้คืนบัญชีด้วยอีเมล"
          description="รับลิงก์เข้าสู่ระบบผ่านทางอีเมล"
          onClick={handlePasswordLogin}
          loading={loadingOption === 'recovery'}
          disabled={loadingOption !== null && loadingOption !== 'recovery'}
          accentColor="blue"
        />

        {/* Trial Option */}
        <OptionCard
          icon={
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          title="เริ่มทดลองใช้งานฟรี"
          description="สร้างพื้นที่ทำงานใหม่และเริ่มใช้งานทันที"
          onClick={handleTrial}
          loading={loadingOption === 'trial'}
          disabled={loadingOption !== null && loadingOption !== 'trial'}
          accentColor="purple"
        />
      </div>

      {/* SSO Button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={handleSSO}
          disabled={loadingOption !== null && loadingOption !== 'sso'}
          className={[
            'w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-semibold text-slate-200',
            'transition-all duration-300',
            loadingOption === 'sso'
              ? 'cursor-not-allowed opacity-60'
              : loadingOption !== null
              ? 'cursor-not-allowed opacity-40'
              : 'hover:border-white/20 hover:bg-white/10 hover:text-white hover:scale-[1.01]',
          ].join(' ')}
        >
          <span className="flex items-center justify-center gap-2">
            {loadingOption === 'sso' ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )}
            เข้าสู่ระบบด้วย SSO
          </span>
        </button>
      </div>

      {/* Footer Links */}
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-500">
          ต้องการความช่วยเหลือ?{' '}
          <a href="/request-access" className="text-emerald-400/80 underline underline-offset-2 transition-colors hover:text-emerald-300">
            ขอสิทธิ์เข้าถึง
          </a>
        </p>
      </div>
    </div>
  );
}
