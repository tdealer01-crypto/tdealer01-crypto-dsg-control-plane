// components/dashboard/kpi-cards.tsx
// Revenue & Performance KPI Cards with real-time updates

"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Bot,
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface KPIData {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  clickRoute?: string;
}

export function KPICards() {
  const [kpis, setKpis] = useState<KPIData[]>([
    {
      title: "Monthly Revenue",
      value: "$4,280",
      change: "+23.5%",
      trend: "up",
      subtitle: "vs last month",
      icon: DollarSign,
      iconColor: "text-green-600",
      bgColor: "bg-green-50",
      clickRoute: "/dashboard/optimize/revenue",
    },
    {
      title: "Active Agents",
      value: "5/5",
      subtitle: "All systems healthy",
      trend: "up",
      icon: Bot,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      clickRoute: "/dashboard/agents",
    },
    {
      title: "Executions Today",
      value: "3,847",
      change: "+12%",
      trend: "up",
      subtitle: "67,240 / 100,000 this month",
      icon: Activity,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-50",
      clickRoute: "/dashboard/monitor/usage",
    },
    {
      title: "Policy Decisions",
      value: "3,712 / 135",
      subtitle: "96.4% pass rate · avg 8.42ms",
      trend: "neutral",
      icon: ShieldCheck,
      iconColor: "text-amber-600",
      bgColor: "bg-amber-50",
      clickRoute: "/dashboard/verify/decisions",
    },
  ]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kpi-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "executions" },
        (payload) => {
          setKpis((prev) =>
            prev.map((kpi) =>
              kpi.title === "Executions Today"
                ? { ...kpi, value: formatNumber((payload.new as any).count_today || 0) }
                : kpi
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi) => (
        <KPICard key={kpi.title} {...kpi} />
      ))}
    </div>
  );
}

function KPICard({
  title,
  value,
  change,
  trend,
  subtitle,
  icon: Icon,
  iconColor,
  bgColor,
  clickRoute,
}: KPIData) {
  return (
    <a
      href={clickRoute}
      className="block p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label={`${title}: ${value}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-2 rounded-lg ${bgColor}`}
          aria-hidden="true"
        >
          <Icon size={20} className={iconColor} />
        </div>
        {change && (
          <div
            className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
              trend === "up" ? "text-green-700 bg-green-50" :
              trend === "down" ? "text-red-700 bg-red-50" :
              "text-gray-600 bg-gray-50"
            }`}
          >
            {trend === "up" && <TrendingUp size={12} />}
            {trend === "down" && <TrendingDown size={12} />}
            {change}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </a>
  );
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}
