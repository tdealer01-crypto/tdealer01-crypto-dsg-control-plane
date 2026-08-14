// components/dashboard/sidebar.tsx
// 4-Pillar Navigation Sidebar with ARIA landmarks

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Shield,
  FileText,
  Zap,
  Bot,
  CreditCard,
  Key,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  icon: React.ElementType;
  label: string;
  route: string;
  badge?: string;
  badgeVariant?: "live" | "count" | "default";
}

const pillarNav: NavItem[] = [
  {
    icon: BarChart3,
    label: "Monitor",
    route: "/dashboard/monitor",
    badge: "live",
    badgeVariant: "live",
  },
  {
    icon: Shield,
    label: "Verify",
    route: "/dashboard/verify",
  },
  {
    icon: FileText,
    label: "Audit",
    route: "/dashboard/audit",
    badge: "3 new",
    badgeVariant: "count",
  },
  {
    icon: Zap,
    label: "Optimize",
    route: "/dashboard/optimize",
  },
];

const secondaryNav: NavItem[] = [
  { icon: Bot, label: "Agents", route: "/dashboard/agents" },
  { icon: CreditCard, label: "Billing", route: "/dashboard/billing" },
  { icon: Key, label: "Identity", route: "/dashboard/identity" },
  { icon: Settings, label: "Settings", route: "/dashboard/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary pillar navigation"
      className={cn(
        "flex flex-col border-r border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              DSG ONE
            </h1>
            <p className="text-xs text-gray-500">Agent Command Center</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[24px] min-h-[24px]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Primary Navigation — 4 Pillars */}
      <div className="flex-1 py-4">
        <div className="px-3 mb-2">
          {!collapsed && (
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Pillars
            </span>
          )}
        </div>
        <ul className="space-y-1 px-2">
          {pillarNav.map((item) => (
            <NavLink
              key={item.route}
              item={item}
              active={pathname.startsWith(item.route)}
              collapsed={collapsed}
            />
          ))}
        </ul>

        {/* Separator */}
        <div className="my-4 mx-4 border-t border-gray-100 dark:border-gray-700" />

        {/* Secondary Navigation */}
        <div className="px-3 mb-2">
          {!collapsed && (
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Manage
            </span>
          )}
        </div>
        <ul className="space-y-1 px-2">
          {secondaryNav.map((item) => (
            <NavLink
              key={item.route}
              item={item}
              active={pathname.startsWith(item.route)}
              collapsed={collapsed}
            />
          ))}
        </ul>
      </div>

      {/* Footer — Plan & Usage */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Business Plan</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: "67%" }}
            />
          </div>
          <div className="text-xs text-gray-400">
            67,240 / 100,000 executions
          </div>
          <button className="mt-3 w-full text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-md py-1.5 hover:bg-blue-50 transition-colors">
            Upgrade to Enterprise
          </button>
        </div>
      )}
    </nav>
  );
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.route}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[40px]",
          active
            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon size={20} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge variant={item.badgeVariant}>{item.badge}</Badge>
            )}
          </>
        )}
      </Link>
    </li>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: string;
  variant?: "live" | "count" | "default";
}) {
  return (
    <span
      className={cn(
        "text-xs px-1.5 py-0.5 rounded-full font-medium",
        variant === "live" && "bg-green-100 text-green-700 animate-pulse",
        variant === "count" && "bg-red-100 text-red-700",
        variant === "default" && "bg-gray-100 text-gray-600"
      )}
    >
      {children}
    </span>
  );
}
