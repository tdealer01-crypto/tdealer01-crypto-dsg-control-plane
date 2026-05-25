'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Clock, DollarSign, ShoppingBag, Loader2, BarChart2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type Sale = {
  saleId: string;
  templateId: string;
  sellerId: string;
  buyerId: string;
  priceSatang: number;
  commissionRateBps: number;
  platformFeeSatang: number;
  creatorPayoutSatang: number;
  status: string;
  createdAt: string;
};

type Summary = {
  clearedSales: number;
  pendingSales: number;
  clearedPayoutSatang: number;
  pendingPayoutSatang: number;
  totalRevenueSatang: number;
  totalPlatformFeeSatang: number;
  clearedPayoutTHB: number;
  pendingPayoutTHB: number;
  totalRevenueTHB: number;
};

function formatTHB(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

const STATUS_LABEL: Record<string, string> = {
  CLEARED: 'ชำระแล้ว',
  PENDING: 'รอชำระ',
  REFUNDED: 'คืนเงิน',
};
const STATUS_COLOR: Record<string, string> = {
  CLEARED: 'text-emerald-400',
  PENDING: 'text-amber-400',
  REFUNDED: 'text-red-400',
};

export default function MyPayoutsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dsg/templates/my/payouts')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          setSummary(res.data.summary);
          setSales(res.data.recentSales ?? []);
        } else {
          setError(res.error?.code ?? 'UNKNOWN_ERROR');
        }
      })
      .catch(() => setError('NETWORK_ERROR'))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    sales
      .filter((s) => s.status === 'CLEARED')
      .forEach((s) => {
        const month = s.createdAt.slice(0, 7);
        byMonth[month] = (byMonth[month] ?? 0) + s.creatorPayoutSatang / 100;
      });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, thb]) => ({ month, thb }));
  }, [sales]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <p>{error === 'DSG_AUTH_REQUIRED' ? 'กรุณาเข้าสู่ระบบ' : `เกิดข้อผิดพลาด: ${error}`}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 md:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
            <TrendingUp className="h-3.5 w-3.5" /> Creator Earnings
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">รายได้ของฉัน</h1>
          <p className="mt-2 text-sm text-slate-300">ภาพรวมยอดขายและรายได้จาก templates ที่วางขาย</p>
        </section>

        {/* Stat cards */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: DollarSign,
                label: 'ยอดโอนแล้ว',
                value: formatTHB(summary.clearedPayoutTHB),
                color: 'text-emerald-400',
                border: 'border-emerald-500/20',
              },
              {
                icon: Clock,
                label: 'รอโอน',
                value: formatTHB(summary.pendingPayoutTHB),
                color: 'text-amber-400',
                border: 'border-amber-500/20',
              },
              {
                icon: TrendingUp,
                label: 'ยอดขายรวม',
                value: formatTHB(summary.totalRevenueTHB),
                color: 'text-indigo-400',
                border: 'border-indigo-500/20',
              },
              {
                icon: ShoppingBag,
                label: 'จำนวนออเดอร์',
                value: String(summary.clearedSales + summary.pendingSales),
                color: 'text-violet-400',
                border: 'border-violet-500/20',
              },
            ].map(({ icon: Icon, label, value, color, border }) => (
              <div key={label} className={`rounded-2xl border ${border} bg-slate-900 p-5`}>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Icon className={`h-4 w-4 ${color}`} />
                  {label}
                </div>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Revenue chart */}
        {chartData.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-300">
              <BarChart2 className="h-4 w-4 text-emerald-400" /> รายได้รายเดือน (THB)
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9' }}
                  formatter={(v) => [`฿${Number(v ?? 0).toLocaleString()}`, 'รายได้']}
                />
                <Bar dataKey="thb" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent sales table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-200">ประวัติการขายล่าสุด</h2>
          </div>
          {sales.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">ยังไม่มียอดขาย</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">วันที่</th>
                    <th className="px-5 py-3">ราคา</th>
                    <th className="px-5 py-3">รายได้ (80%)</th>
                    <th className="px-5 py-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.saleId} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30">
                      <td className="px-5 py-3 text-slate-400">{formatDate(sale.createdAt)}</td>
                      <td className="px-5 py-3 font-bold text-slate-200">{formatTHB(sale.priceSatang / 100)}</td>
                      <td className="px-5 py-3 font-bold text-emerald-400">{formatTHB(sale.creatorPayoutSatang / 100)}</td>
                      <td className={`px-5 py-3 font-bold ${STATUS_COLOR[sale.status] ?? 'text-slate-400'}`}>
                        {STATUS_LABEL[sale.status] ?? sale.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
